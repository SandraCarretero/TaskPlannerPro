import { loadCurrentWeather } from './weather.js';

const API_URL = 'http://localhost:3000/api';
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar si hay un token en localStorage
  const token = localStorage.getItem('token');
  if (!token) {
    // Redirigir a la página de login si no hay token
    window.location.href = 'login.html';
    return;
  }

  try {
    // Obtener información del usuario actual
    await getCurrentUser();

    loadCurrentWeather('Madrid');
  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);

    // Si hay un error de autenticación, redirigir al login
    if (error.status === 401) {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    }
  }
});

// Módulo de chat
const ChatModule = (() => {
  // Variables privadas
  let socket;
  let currentUser = null;
  let currentConversationId = null;
  let conversations = [];
  let isConnected = false;
  const authToken = localStorage.getItem('token');
  let pendingActions = [];
  let messageQueue = []; // Cola para mensajes cuando no hay conexión

  const API_URL = 'http://localhost:3000/api';

  // Inicializar WebSocket
  const initWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const port = 3000;
    // Asegurarse de que el token está correctamente codificado para URL
    const encodedToken = encodeURIComponent(authToken);
    const wsUrl = `${protocol}//${host}:${port}?token=${encodedToken}`;

    console.log(`Conectando a WebSocket: ${wsUrl}`);

    try {
      socket = new WebSocket(wsUrl);

      socket.addEventListener('open', event => {
        console.log('Conectado al servidor WebSocket');
        isConnected = true;

        socket.send(
          JSON.stringify({
            type: 'PAGE_LOADED',
            payload: {
              page: 'chat',
              timestamp: new Date().toISOString()
            }
          })
        );

        // Enviar mensajes en cola
        if (messageQueue.length > 0) {
          const messagesToSend = [...messageQueue];
          messageQueue = [];
          messagesToSend.forEach(message => {
            socket.send(JSON.stringify(message));
          });
        }

        // Ejecutar acciones pendientes
        if (pendingActions.length > 0) {
          const actionsToExecute = [...pendingActions];
          pendingActions = [];
          actionsToExecute.forEach(action => {
            try {
              action();
            } catch (error) {
              console.error('Error al ejecutar acción pendiente:', error);
            }
          });
        }
      });

      socket.addEventListener('message', event => {
        try {
          const data = JSON.parse(event.data);
          handleIncomingMessage(data);
        } catch (error) {
          console.error('Error al procesar mensaje:', error);
        }
      });

      socket.addEventListener('close', event => {
        console.log(
          `WebSocket desconectado. Código: ${event.code}, Razón: ${event.reason}`
        );
        isConnected = false;

        setTimeout(initWebSocket, 5000);
      });

      socket.addEventListener('error', event => {
        console.error('Error de WebSocket:', event);
        isConnected = false;
      });
    } catch (error) {
      console.error('Error al inicializar WebSocket:', error);
      isConnected = false;

      // Intentar reconectar después de un tiempo
      setTimeout(initWebSocket, 5000);
    }
  };

  // Manejar mensajes entrantes
  const handleIncomingMessage = data => {
    switch (data.type) {
      case 'CONNECTED':
        console.log(data.payload.message);
        break;

      case 'CONVERSATION_STARTED':
        const newConversationId = data.payload.conversationId;

        // Forzar recarga de las conversaciones desde el servidor
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: 'PAGE_LOADED',
              payload: {
                page: 'chat',
                timestamp: new Date().toISOString()
              }
            })
          );
        }

        // Esperar un poco y seleccionar la nueva conversación
        setTimeout(() => {
          selectConversation(newConversationId);

          // Activar la pestaña de conversaciones
          const conversationsTab = document.querySelector(
            '.chat-tab[data-tab="conversations"]'
          );
          if (conversationsTab) {
            conversationsTab.click();
          }
        }, 500); // Puedes ajustar el tiempo si es necesario

        break;

      case 'CONVERSATIONS_LOADED':
        // Filtrar para excluir grupos
        conversations = data.payload.conversations.filter(
          conv => !conv.isGroup
        );

        // Solo renderizar conversaciones si hay alguna
        if (conversations.length > 0) {
          renderConversations(conversations);

          if (!currentConversationId) {
            selectConversation(conversations[0]._id);
          }

          const conversationsTab = document.querySelector(
            '.chat-tab[data-tab="conversations"]'
          );
          if (conversationsTab) {
            conversationsTab.click();
          }
        } else {
          console.log(
            'No hay conversaciones, manteniendo la lista de usuarios'
          );
          const usersTab = document.querySelector(
            '.chat-tab[data-tab="users"]'
          );
          if (usersTab) {
            usersTab.click();
          }
        }
        break;

      case 'NEW_MESSAGE':
        const { message, conversation } = data.payload;
        updateConversationWithNewMessage(conversation, message);

        if (currentConversationId === conversation) {
          displayMessage({
            id: message._id,
            conversationId: message.conversation,
            text: message.text,
            sender:
              message.sender._id === currentUser._id ? 'sent' : 'received',
            senderInfo: message.sender,
            timestamp: message.createdAt,
            read: message.read
          });

          markMessagesAsRead(conversation, [message]);
        } else {
          // Si no estamos en la conversación, asegurarnos de que aparezca el indicador de mensaje no leído
          if (message.sender._id !== currentUser._id) {
            const contactElement = document.querySelector(
              `.chat-contact[data-conversation-id="${conversation}"]`
            );

            if (contactElement) {
              // Solo añadir el punto si no existe ya
              if (!contactElement.querySelector('.unread-dot')) {
                const dotElement = document.createElement('span');
                dotElement.className = 'unread-dot';
                contactElement
                  .querySelector('.contact-meta')
                  .appendChild(dotElement);
              }
            }
          }
        }
        break;

      case 'USER_STATUS':
        updateUserStatus(data.payload);
        break;

      case 'MESSAGES_READ':
        updateMessagesReadStatus(data.payload);
        break;

      case 'TYPING_STATUS':
        updateTypingStatus(data.payload);
        break;

      case 'ERROR':
        console.error('Error del servidor:', data.payload.message);
        alert(`Error: ${data.payload.message}`);
        break;

      case 'AUTH_SUCCESS':
        console.log('Autenticación exitosa:', data.payload);
        // Puedes actualizar la UI para mostrar que estás autenticado
        break;

      case 'AUTH_ERROR':
        console.error('Error de autenticación:', data.payload.message);
        // Mostrar mensaje de error al usuario
        alert('Error de autenticación: ' + data.payload.message);
        break;

      default:
        console.log(`Tipo de mensaje no manejado: ${data.type}`);
    }
  };

  // Actualizar estado de escritura
  const updateTypingStatus = data => {
    const { userId, conversationId, isTyping } = data;

    if (conversationId !== currentConversationId) return;

    const typingIndicator = document.getElementById('typing-indicator');
    if (!typingIndicator) return;

    if (isTyping && userId !== currentUser._id) {
      const conversation = conversations.find(c => c._id === conversationId);
      if (!conversation) return;

      const otherParticipant = conversation.participants.find(
        p => p._id === userId
      );

      if (otherParticipant) {
        typingIndicator.textContent = `${otherParticipant.name} está escribiendo...`;
        typingIndicator.style.display = 'block';
      }
    } else {
      typingIndicator.style.display = 'none';
    }
  };

  // Obtener información del usuario actual
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('No autorizado');
      }

      return await response.json();
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      throw error;
    }
  };

  // Configurar pestañas
  const setupTabs = () => {
    const tabs = document.querySelectorAll('.chat-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Desactivar todas las pestañas
        tabs.forEach(t => t.classList.remove('active'));
        // Activar la pestaña seleccionada
        tab.classList.add('active');

        // Ocultar todos los contenidos
        document.querySelectorAll('.chat-tab-content').forEach(content => {
          content.classList.remove('active');
        });

        // Mostrar el contenido correspondiente
        const tabName = tab.dataset.tab;
        document.getElementById(`${tabName}-tab`).classList.add('active');
      });
    });
  };

  // Configurar eventos de la interfaz
  const setupEventListeners = () => {
    const sendButton = document.getElementById('send-message');
    const messageInput = document.getElementById('message-input');

    if (sendButton && messageInput) {
      sendButton.addEventListener('click', () => {
        const text = messageInput.value.trim();
        if (text) {
          sendMessage(text);
        }
      });

      // Manejar clics en conversaciones
      const conversationsContainer = document.getElementById(
        'conversations-container'
      );
      if (conversationsContainer) {
        conversationsContainer.addEventListener('click', e => {
          const contactElement = e.target.closest('.chat-contact');
          if (contactElement) {
            const conversationId = contactElement.dataset.conversationId;
            if (conversationId) {
              selectConversation(conversationId);
            }
          }
        });
      }

      // Manejar clics en usuarios
      const usersContainer = document.getElementById('users-container');
      if (usersContainer) {
        usersContainer.addEventListener('click', e => {
          const contactElement = e.target.closest('.chat-contact');
          if (contactElement) {
            const contactId = contactElement.dataset.contactId;
            if (contactId) {
              startOrOpenConversation(contactId);
            }
          }
        });
      }

      const chatSearch = document.getElementById('chat-search');
      if (chatSearch) {
        chatSearch.addEventListener('input', e => {
          const searchTerm = e.target.value.toLowerCase();
          const activeTab =
            document.querySelector('.chat-tab.active').dataset.tab;
          const container = document.getElementById(`${activeTab}-container`);

          if (container) {
            container.querySelectorAll('.chat-contact').forEach(contact => {
              const contactName = contact
                .querySelector('.contact-name')
                .textContent.toLowerCase();
              if (contactName.includes(searchTerm)) {
                contact.style.display = 'flex';
              } else {
                contact.style.display = 'none';
              }
            });
          }
        });
      }
    }

    const chatContacts = document.getElementById('chat-contacts');
    if (chatContacts) {
      chatContacts.addEventListener('click', e => {
        const contactElement = e.target.closest('.chat-contact');
        if (contactElement) {
          const conversationId = contactElement.dataset.conversationId;
          if (conversationId) {
            selectConversation(conversationId);
          } else {
            const contactId = contactElement.dataset.contactId;
            if (contactId) {
              startOrOpenConversation(contactId);
            }
          }
        }
      });
    }

    const chatSearch = document.getElementById('chat-search');
    if (chatSearch) {
      chatSearch.addEventListener('input', e => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.chat-contact').forEach(contact => {
          const contactName = contact
            .querySelector('.contact-name')
            .textContent.toLowerCase();
          if (contactName.includes(searchTerm)) {
            contact.style.display = 'flex';
          } else {
            contact.style.display = 'none';
          }
        });
      });
    }
  };

  // Iniciar o abrir una conversación con un usuario
  const startOrOpenConversation = userId => {
    if (userId === currentUser._id) {
      console.error('No puedes iniciar una conversación contigo mismo');
      alert('No puedes iniciar una conversación contigo mismo');
      return;
    }

    const existingConversation = conversations.find(
      c => !c.isGroup && c.participants.some(p => p._id === userId)
    );

    if (existingConversation) {
      selectConversation(existingConversation._id);
    } else {
      if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: 'START_CONVERSATION',
            payload: {
              recipientId: userId,
              token: authToken // Añadir el token explícitamente en el payload
            }
          })
        );
      } else {
        console.error(
          'No hay conexión con el servidor de chat. Estado:',
          socket ? socket.readyState : 'socket no inicializado'
        );

        // Mostrar mensaje al usuario
        alert(
          'No se puede iniciar la conversación porque no hay conexión con el servidor. Intentando reconectar...'
        );

        // Intentar reconectar
        initWebSocket();

        // Guardar la acción para intentarla de nuevo cuando se conecte
        pendingActions.push(() => startOrOpenConversation(userId));
      }
    }
  };

  // Renderizar lista de conversaciones
  const renderConversations = conversations => {
    const conversationsContainer = document.getElementById(
      'conversations-container'
    );
    if (!conversationsContainer) return;

    conversationsContainer.innerHTML = '';

    if (conversations.length === 0) {
      conversationsContainer.innerHTML =
        '<div class="no-conversations">No hay conversaciones</div>';
      return;
    }

    conversations.forEach(conversation => {
      let displayName, avatar, lastMessage, unreadCount;
      let otherParticipant;

      if (!conversation.isGroup) {
        otherParticipant = conversation.participants.find(
          p => p._id !== currentUser._id
        );

        displayName = otherParticipant
          ? otherParticipant.name
          : 'Usuario desconocido';

        // Usar avatar del otro participante o iniciales si no tiene
        if (otherParticipant?.avatar) {
          avatar = `${API_URL}${otherParticipant.avatar}`;
        } else {
          avatar = null; // Se usarán iniciales
        }
      } else {
        // Saltamos las conversaciones de grupo
        return;
      }

      lastMessage = conversation.lastMessage
        ? (conversation.lastMessage.sender === currentUser._id ? 'Tú: ' : '') +
          conversation.lastMessage.text
        : 'No hay mensajes';

      unreadCount = 0;

      const contactElement = document.createElement('div');
      contactElement.className = `chat-contact${
        currentConversationId === conversation._id ? ' active' : ''
      }`;
      contactElement.dataset.conversationId = conversation._id;
      contactElement.dataset.contactId = otherParticipant._id; // Añadir también el ID de contacto
      contactElement.dataset.isGroup = 'false';

      const showUnreadDot =
        conversation.lastMessage &&
        !conversation.lastMessage.read &&
        conversation.lastMessage.sender !== currentUser._id;

      contactElement.innerHTML = `
        <div class="contact-avatar profile-avatar">
          ${
            avatar
              ? `<img src="${avatar}" alt="${displayName}" />`
              : `<div class="avatar-initials">${getInitials(displayName)}</div>`
          }
          <span class="status-indicator ${
            otherParticipant?.isOnline ? 'online' : 'offline'
          }"></span>
        </div>
        <div class="contact-info">
          <div class="contact-name">${displayName}</div>
          <div class="contact-last-message">${lastMessage}</div>
        </div>
        <div class="contact-meta">
          <div class="contact-time">${
            conversation.lastMessage
              ? formatTime(new Date(conversation.lastMessage.createdAt))
              : ''
          }</div>
          ${
            unreadCount > 0
              ? `<div class="contact-unread-indicator"></div>`
              : ''
          }
          ${showUnreadDot ? '<span class="unread-dot"></span>' : ''}
        </div>
      `;

      conversationsContainer.appendChild(contactElement);
    });
  };

  // Seleccionar una conversación
  const selectConversation = conversationId => {
    currentConversationId = conversationId;

    document.querySelectorAll('.chat-contact').forEach(contact => {
      contact.classList.remove('active');
    });

    const selectedContact = document.querySelector(
      `.chat-contact[data-conversation-id="${conversationId}"]`
    );
    if (selectedContact) {
      selectedContact.classList.add('active');

      updateChatHeader(conversationId);
      fetchMessages(conversationId);

      if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: 'SWITCH_CONTACT',
            payload: {
              conversationId: conversationId,
              timestamp: new Date().toISOString()
            }
          })
        );
      }
    }
  };

  // Enviar mensaje
  const sendMessage = text => {
    if (!currentConversationId) {
      console.error('No hay conversación seleccionada');
      return;
    }

    const message = {
      type: 'CHAT_MESSAGE',
      payload: {
        conversationId: currentConversationId,
        text: text,
        timestamp: new Date().toISOString(),
        token: authToken
      }
    };

    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      messageQueue.push(message);

      // Intentar reconectar
      if (!isConnected) {
        initWebSocket();
      }
    }

    // Limpiar el campo de entrada
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
      messageInput.value = '';
    }
  };

  // Otras funciones necesarias...
  const updateChatHeader = conversationId => {
    const conversation = conversations.find(c => c._id === conversationId);
    if (!conversation) return;

    const headerElement = document.getElementById('chat-header');
    if (!headerElement) return;

    const otherParticipant = conversation.participants.find(
      p => p._id !== currentUser._id
    );

    if (otherParticipant) {
      headerElement.innerHTML = `
        <div class="contact-avatar profile-avatar">
          ${
            otherParticipant.avatar
              ? `<img src="${API_URL}${otherParticipant.avatar}" alt="${otherParticipant.name}" />`
              : `<div class="avatar-initials">${getInitials(
                  otherParticipant.name
                )}</div>`
          }
          <span class="status-indicator ${
            otherParticipant.isOnline ? 'online' : 'offline'
          }"></span>
        </div>
        <div class="contact-info">
          <div class="contact-name">${otherParticipant.name}</div>
          <div class="contact-status">${
            otherParticipant.isOnline ? 'En línea' : 'Desconectado'
          }</div>
        </div>
      `;
    }
  };

  const fetchMessages = conversationId => {
    // Limpiar mensajes anteriores
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
    }

    // Mostrar indicador de carga
    if (messagesContainer) {
      messagesContainer.innerHTML =
        '<div class="loading-messages">Cargando mensajes...</div>';
    }

    if (!conversationId) {
      console.error('ID de conversación no válido');
      if (messagesContainer) {
        messagesContainer.innerHTML =
          '<div class="error-messages">Error: ID de conversación no válido</div>';
      }
      return;
    }

    // Solicitar mensajes al servidor

    fetch(`${API_URL}/chat/messages/${conversationId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(messages => {
        if (messagesContainer) {
          messagesContainer.innerHTML = '';
        }

        // Mostrar mensajes
        messages.forEach(message => {
          displayMessage({
            id: message._id,
            conversationId: message.conversation,
            text: message.text,
            sender:
              message.sender._id === currentUser._id ? 'sent' : 'received',
            senderInfo: message.sender,
            timestamp: message.createdAt,
            read: message.read
          });
        });

        // Desplazar al último mensaje
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        // Marcar mensajes como leídos
        markMessagesAsRead(
          conversationId,
          messages.filter(m => !m.read && m.sender._id !== currentUser._id)
        );
      })
      .catch(error => {
        console.error('Error al cargar mensajes:', error);
        if (messagesContainer) {
          messagesContainer.innerHTML =
            '<div class="error-messages">Error al cargar mensajes. Intenta de nuevo.</div>';
        }
      });
  };

  const formatTime = date => {
    return new Intl.DateTimeFormat('es', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const updateConversationWithNewMessage = (conversationId, message) => {
    const conversation = conversations.find(c => c._id === conversationId);
    if (!conversation) return;

    // Actualizar último mensaje
    conversation.lastMessage = message;

    // Reordenar conversaciones (la más reciente primero)
    conversations.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return (
        new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
      );
    });

    // Volver a renderizar
    renderConversations(conversations);
  };

  const displayMessage = message => {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.sender}`;
    messageElement.dataset.messageId = message.id;

    const formattedTime = formatTime(new Date(message.timestamp));

    messageElement.innerHTML = `
      <div class="message-content">
        <div class="message-text">${message.text}</div>
        <div class="message-meta">
          <span class="message-time">${formattedTime}</span>
          
        </div>
      </div>
      `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  const markMessagesAsRead = (conversationId, messages) => {
    if (!messages || messages.length === 0) return;

    const messageIds = messages.map(m => m._id || m.id);

    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'MARK_AS_READ',
          payload: {
            conversationId,
            messageIds,
            timestamp: new Date().toISOString()
          }
        })
      );
    }

    const conversation = conversations.find(c => c._id === conversationId);
    if (conversation && conversation.lastMessage) {
      conversation.lastMessage.read = true;

      const contactElement = document.querySelector(
        `.chat-contact[data-conversation-id="${conversationId}"]`
      );

      if (contactElement) {
        const unreadDot = contactElement.querySelector('.unread-dot');
        if (unreadDot) unreadDot.remove();
      }
    }
  };

  const updateUserStatus = data => {
    const { userId, isOnline } = data;

    // Actualizar estado en conversaciones
    conversations.forEach(conversation => {
      conversation.participants.forEach(participant => {
        if (participant._id === userId) {
          participant.isOnline = isOnline;
        }
      });
    });

    // Actualizar UI
    document.querySelectorAll('.chat-contact').forEach(contact => {
      const conversationId = contact.dataset.conversationId;
      if (!conversationId) return;

      const conversation = conversations.find(c => c._id === conversationId);
      if (!conversation) return;

      const otherParticipant = conversation.participants.find(
        p => p._id !== currentUser._id
      );
      if (!otherParticipant) return;

      const statusIndicator = contact.querySelector('.status-indicator');
      if (statusIndicator) {
        statusIndicator.className = `status-indicator ${
          otherParticipant.isOnline ? 'online' : 'offline'
        }`;
      }
    });

    // Actualizar encabezado si es la conversación actual
    if (currentConversationId) {
      updateChatHeader(currentConversationId);
    }
  };

  const updateMessagesReadStatus = data => {
    const { conversationId, messageIds } = data;

    // Actualizar UI para mostrar mensajes como leídos
    messageIds.forEach(messageId => {
      const messageElement = document.querySelector(
        `.message[data-message-id="${messageId}"]`
      );
      if (messageElement) {
        const statusElement = messageElement.querySelector('.message-status');
        if (statusElement) {
          statusElement.textContent = '✓✓';
        }
      }
    });
    const conversation = conversations.find(c => c._id === conversationId);
    if (conversation && conversation.lastMessage) {
      const isLastMessageUnread =
        !conversation.lastMessage.read &&
        messageIds.includes(conversation.lastMessage._id);

      if (isLastMessageUnread) {
        conversation.lastMessage.read = true;

        const contactElement = document.querySelector(
          `.chat-contact[data-conversation-id="${conversationId}"]`
        );
        if (contactElement) {
          const unreadDot = contactElement.querySelector('.unread-dot');
          if (unreadDot) unreadDot.remove();
        }
      }
    }
  };

  // Inicializar el módulo
  const init = () => {

    if (!authToken) {
      console.error('No hay token de autenticación');
      return;
    }

    // Primero obtener información del usuario actual
    fetchCurrentUser()
      .then(userData => {
        if (!userData || !userData.data || !userData.data.user) {
          throw new Error('No se pudo obtener información del usuario');
        }

        currentUser = userData.data.user;

        // Configurar pestañas
        setupTabs();

        // Cargar usuarios
        loadUsers();

        // Inicializar WebSocket con el token de autenticación
        initWebSocket();

        // Configurar eventos de la interfaz
        setupEventListeners();
      })
      .catch(error => {
        console.error('Error al inicializar chat:', error);

        if (error.message.includes('No autorizado')) {
          localStorage.removeItem('token');
        }
      });
  };

  const loadUsers = () => {
    fetch(`${API_URL}/chat/users`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    })
      .then(response => {
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              'No autorizado. Por favor inicie sesión nuevamente.'
            );
          }
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(users => {

        if (!Array.isArray(users)) {
          console.error('La respuesta no es un array:', users);
          return;
        }

        const usersContainer = document.getElementById('users-container');
        if (!usersContainer) {
          console.error('No se encontró el contenedor de usuarios');
          return;
        }

        usersContainer.innerHTML = '';

        // Filtrar para asegurarse de que el usuario actual no aparezca
        const filteredUsers = users.filter(
          user => user._id !== currentUser._id
        );

        if (filteredUsers.length === 0) {
          usersContainer.innerHTML =
            '<div class="no-contacts">No hay otros usuarios disponibles</div>';
          return;
        }

        filteredUsers.forEach(user => {
          const contact = document.createElement('div');
          contact.className = 'chat-contact';
          contact.dataset.contactId = user._id;

          contact.innerHTML = `
            <div class="contact-avatar profile-avatar">
              ${
                user.avatar
                  ? `<img src="${API_URL}${user.avatar}" alt="${user.name}" />`
                  : `<div class="avatar-initials">${getInitials(
                      user.name
                    )}</div>`
              }
              <span class="status-indicator ${
                user.isOnline ? 'online' : 'offline'
              }"></span>
            </div>
            <div class="contact-info">
              <div class="contact-name">${user.name}</div>
              <div class="contact-last-message">¡Inicia una conversación!</div>
            </div>
            <div class="contact-meta">
              <div class="contact-time">Ahora</div>
            </div>
          `;

          usersContainer.appendChild(contact);
        });
      })
      .catch(error => {
        console.error('Error al cargar usuarios:', error);
      });
  };

  // Manejar cierre de la página
  window.addEventListener('beforeunload', () => {
    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'PAGE_UNLOADED',
          payload: {
            page: 'chat',
            timestamp: new Date().toISOString()
          }
        })
      );
    }
  });

  // API pública
  return {
    init: init
  };
})();

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', ChatModule.init);

const getCurrentUser = async () => {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw { status: response.status, message: 'Error al obtener usuario' };
    }

    const data = await response.json();
    currentUser = data.data.user;

    // Mostrar avatar si existe
    const avatarElement = document.getElementById('avatar');
    if (currentUser.avatar) {
      avatarElement.style.backgroundImage = `url(${API_URL}${currentUser.avatar})`;
    } else {
      // Mostrar iniciales si no hay avatar
      avatarElement.textContent = getInitials(currentUser.name);
    }
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    throw error;
  }
};

const getInitials = name => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};
