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
  function initWebSocket() {
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
        console.log('✅ Conectado al servidor WebSocket');
        isConnected = true;

        // Notificar al usuario que la conexión está establecida
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
          statusElement.textContent = 'Conectado';
          statusElement.className = 'status-connected';
        }

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
          console.log(`Enviando ${messageQueue.length} mensajes en cola`);
          const messagesToSend = [...messageQueue];
          messageQueue = [];
          messagesToSend.forEach(message => {
            socket.send(JSON.stringify(message));
          });
        }

        // Ejecutar acciones pendientes
        if (pendingActions.length > 0) {
          console.log(
            `Ejecutando ${pendingActions.length} acciones pendientes`
          );
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
          console.log('Mensaje recibido:', data);
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

        // Notificar al usuario que la conexión se ha perdido
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
          statusElement.textContent = 'Desconectado - Reconectando...';
          statusElement.className = 'status-disconnected';
        }

        // Intentar reconectar después de un tiempo
        console.log('Intentando reconectar en 5 segundos...');
        setTimeout(initWebSocket, 5000);
      });

      socket.addEventListener('error', event => {
        console.error('Error de WebSocket:', event);
        isConnected = false;

        // Notificar al usuario que hay un error de conexión
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
          statusElement.textContent = 'Error de conexión';
          statusElement.className = 'status-error';
        }
      });
    } catch (error) {
      console.error('Error al inicializar WebSocket:', error);
      isConnected = false;

      // Intentar reconectar después de un tiempo
      setTimeout(initWebSocket, 5000);
    }
  }

  // Manejar mensajes entrantes
  function handleIncomingMessage(data) {
    switch (data.type) {
      case 'CONNECTED':
        console.log(data.payload.message);
        break;

      case 'CONVERSATIONS_LOADED':
        // Filtrar para excluir grupos
        conversations = data.payload.conversations.filter(
          conv => !conv.isGroup
        );
        renderConversations(conversations);

        if (conversations.length > 0 && !currentConversationId) {
          selectConversation(conversations[0]._id);
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
          // Reproducir sonido de notificación si no es la conversación actual
          playNotificationSound();
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

      default:
        console.log(`Tipo de mensaje no manejado: ${data.type}`);
    }
  }

  // Reproducir sonido de notificación
  function playNotificationSound() {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(error => {
      console.error('Error al reproducir sonido de notificación:', error);
    });
  }

  // Actualizar estado de escritura
  function updateTypingStatus(data) {
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
  }

  // Obtener información del usuario actual
  async function fetchCurrentUser() {
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
  }

  // Configurar eventos de la interfaz
  function setupEventListeners() {
    const sendButton = document.getElementById('send-message');
    const messageInput = document.getElementById('message-input');

    if (sendButton && messageInput) {
      sendButton.addEventListener('click', () => {
        const text = messageInput.value.trim();
        if (text) {
          sendMessage(text);
        }
      });

      messageInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
          const text = messageInput.value.trim();
          if (text) {
            sendMessage(text);
          }
        }
      });

      // Añadir evento para indicador de escritura
      let typingTimeout;
      messageInput.addEventListener('input', () => {
        if (
          isConnected &&
          socket.readyState === WebSocket.OPEN &&
          currentConversationId
        ) {
          socket.send(
            JSON.stringify({
              type: 'TYPING_STATUS',
              payload: {
                conversationId: currentConversationId,
                isTyping: true,
                timestamp: new Date().toISOString()
              }
            })
          );

          // Limpiar timeout anterior si existe
          if (typingTimeout) {
            clearTimeout(typingTimeout);
          }

          // Establecer nuevo timeout para enviar estado de "no escribiendo" después de 2 segundos
          typingTimeout = setTimeout(() => {
            if (isConnected && socket.readyState === WebSocket.OPEN) {
              socket.send(
                JSON.stringify({
                  type: 'TYPING_STATUS',
                  payload: {
                    conversationId: currentConversationId,
                    isTyping: false,
                    timestamp: new Date().toISOString()
                  }
                })
              );
            }
          }, 2000);
        }
      });
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
  }

  // Iniciar o abrir una conversación con un usuario
  function startOrOpenConversation(userId) {
    const existingConversation = conversations.find(
      c => !c.isGroup && c.participants.some(p => p._id === userId)
    );

    if (existingConversation) {
      selectConversation(existingConversation._id);
    } else {
      if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
        console.log(`Iniciando nueva conversación con usuario ${userId}`);
        socket.send(
          JSON.stringify({
            type: 'CHAT_MESSAGE',
            payload: {
              recipientId: userId,
              text: '¡Hola! He iniciado una conversación contigo.',
              timestamp: new Date().toISOString(),
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
  }

  // Renderizar lista de conversaciones
  function renderConversations(conversations) {
    const chatContacts = document.getElementById('chat-contacts');
    if (!chatContacts) return;

    chatContacts.innerHTML = '';

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

        const isOnline = otherParticipant?.isOnline;
        const statusClass = isOnline ? 'online' : 'offline';
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
      contactElement.dataset.isGroup = 'false';

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
              ? `<div class="contact-unread">${unreadCount}</div>`
              : ''
          }
        </div>
      `;

      chatContacts.appendChild(contactElement);
    });
  }

  // Seleccionar una conversación
  function selectConversation(conversationId) {
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
  }

  // Enviar mensaje
  function sendMessage(text) {
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
      console.log('Guardando mensaje en cola para enviar cuando se conecte');
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
  }

  // Otras funciones necesarias...
  function updateChatHeader(conversationId) {
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
  }

  function fetchMessages(conversationId) {
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

    // Solicitar mensajes al servidor
    fetch(`${API_URL}/chat/conversations/${conversationId}/messages`, {
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
  }

  function formatTime(date) {
    return new Intl.DateTimeFormat('es', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function updateConversationWithNewMessage(conversationId, message) {
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
  }

  function displayMessage(message) {
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
          ${
            message.sender === 'sent'
              ? `<span class="message-status">${
                  message.read ? '✓✓' : '✓'
                }</span>`
              : ''
          }
        </div>
      </div>
    `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function markMessagesAsRead(conversationId, messages) {
    if (!messages || messages.length === 0) return;

    const messageIds = messages.map(m => m._id || m.id);

    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'MARK_READ',
          payload: {
            conversationId,
            messageIds,
            timestamp: new Date().toISOString()
          }
        })
      );
    }
  }

  function updateUserStatus(data) {
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
  }

  function updateMessagesReadStatus(data) {
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
  }

  // Inicializar el módulo
  function init() {
    console.log('Inicializando módulo de chat...');

    if (!authToken) {
      console.error('No hay token de autenticación');
      return;
    }

    // Cargar usuarios
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
        console.log('Usuarios cargados:', users);

        if (!Array.isArray(users)) {
          console.error('La respuesta no es un array:', users);
          return;
        }

        const contactsContainer = document.getElementById('chat-contacts');
        if (!contactsContainer) {
          console.error('No se encontró el contenedor de contactos');
          return;
        }

        contactsContainer.innerHTML = '';

        users.forEach(user => {
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

          contactsContainer.appendChild(contact);
        });
      })
      .catch(error => {
        console.error('Error al cargar los usuarios:', error);

        if (error.message.includes('No autorizado')) {
          localStorage.removeItem('token');
        }
      });

    // Obtener información del usuario actual
    fetchCurrentUser()
      .then(user => {
        currentUser = user;
        console.log('Usuario actual:', currentUser);

        // Inicializar WebSocket con el token de autenticación
        initWebSocket();

        // Configurar eventos de la interfaz
        setupEventListeners();
      })
      .catch(error => {
        console.error('Error al obtener usuario actual:', error);
      });
  }

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

function getInitials(name) {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
}
