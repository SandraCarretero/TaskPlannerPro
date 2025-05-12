import { loadCurrentWeather } from './weather.js';

import {
  fetchCurrentUser,
  updateUIForUser,
  getInitials
} from './utils/getUser.js';

const API_URL = 'https://taskplannerpro-api.onrender.com/api';

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    await getCurrentUser();

    loadCurrentWeather('Madrid');
  } catch (error) {
    console.error('Error al inicializar la aplicación:', error);

    if (error.status === 401) {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    }
  }
});

const ChatModule = (() => {
  let socket;
  let currentUser = null;
  let currentConversationId = null;
  let conversations = [];
  let isConnected = false;
  const authToken = localStorage.getItem('token');
  let pendingActions = [];
  let messageQueue = []; 

  const API_URL = 'https://taskplannerpro-api.onrender.com/api';

  // Inicializar WebSocket
  const initWebSocket = () => {
    // const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // const host = window.location.hostname || 'localhost';
    // const port = 3000;
    // const wsUrl = `${protocol}//${host}:${port}?token=${encodedToken}`;
    const encodedToken = encodeURIComponent(authToken);
    const isLocalhost = window.location.hostname === 'localhost';

    const wsUrl = isLocalhost
      ? `ws://localhost:3000?token=${encodedToken}`
      : `wss://taskplannerpro-api.onrender.com?token=${encodedToken}`;

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

  const handleIncomingMessage = data => {
    switch (data.type) {
      case 'CONNECTED':
        console.log(data.payload.message);
        break;

      case 'CONVERSATION_STARTED':
        const newConversationId = data.payload.conversationId;

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

        setTimeout(() => {
          selectConversation(newConversationId);

          const conversationsTab = document.querySelector(
            '.chat-tab[data-tab="conversations"]'
          );
          if (conversationsTab) {
            conversationsTab.click();
          }
        }, 500);

        break;

      case 'CONVERSATIONS_LOADED':
        conversations = data.payload.conversations;
        renderUsersWithConversations(conversations);
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
          if (message.sender._id !== currentUser._id) {
            const contactElement = document.querySelector(
              `.chat-contact[data-conversation-id="${conversation}"]`
            );

            if (contactElement) {
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
        break;

      case 'AUTH_ERROR':
        console.error('Error de autenticación:', data.payload.message);
        alert('Error de autenticación: ' + data.payload.message);
        break;

      default:
        console.log(`Tipo de mensaje no manejado: ${data.type}`);
    }
  };

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

  const renderUsersWithConversations = conversations => {
    const container = document.getElementById('contacts-container');
    if (!container) return;

    container.innerHTML = ''; 

    fetch(`${API_URL}/chat/users`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    })
      .then(res => res.json())
      .then(users => {
        users.sort((a, b) => {
          const convA = conversations.find(c =>
            c.participants.some(p => p._id === a._id)
          );
          const convB = conversations.find(c =>
            c.participants.some(p => p._id === b._id)
          );

          const dateA = convA ? new Date(convA.lastMessage?.createdAt || 0) : 0;
          const dateB = convB ? new Date(convB.lastMessage?.createdAt || 0) : 0;

          return dateB - dateA;
        });

        users.forEach(user => {
          if (user._id === currentUser._id) return;

          const conversation = conversations.find(conv =>
            conv.participants.some(p => p._id === user._id)
          );

          const displayName = user.name;
          const avatar = user.avatar ? `${API_URL}${user.avatar}` : null;

          const lastMessage = conversation?.lastMessage
            ? (conversation.lastMessage.sender === currentUser._id
                ? 'Tú: '
                : '') + conversation.lastMessage.text
            : 'Inicia una conversación';

          const showUnreadDot =
            conversation &&
            conversation.lastMessage &&
            !conversation.lastMessage.read &&
            conversation.lastMessage.sender !== currentUser._id;

          const contactElement = document.createElement('div');
          contactElement.className = `chat-contact${
            currentConversationId === conversation?._id ? ' active' : ''
          }`;

          if (conversation) {
            contactElement.dataset.conversationId = conversation._id;
          }
          contactElement.dataset.contactId = user._id;
          contactElement.dataset.isGroup = 'false';

          contactElement.innerHTML = `
          <div class="contact-avatar profile-avatar">
            ${
              avatar
                ? `<img src="${avatar}" alt="${displayName}" />`
                : `<div class="avatar-initials">${getInitials(
                    displayName
                  )}</div>`
            }
          </div>
          <div class="contact-info">
            <div class="contact-name">${displayName}</div>
            <div class="contact-last-message">${lastMessage}</div>
          </div>
          <div class="contact-meta">
            <div class="contact-time">
              ${
                conversation?.lastMessage
                  ? formatTime(new Date(conversation.lastMessage.createdAt))
                  : ''
              }
            </div>
            ${showUnreadDot ? '<span class="unread-dot"></span>' : ''}
          </div>
        `;

          if (conversation) {
            contactElement.addEventListener('click', () => {
              selectConversation(conversation._id);
            });
          } else {
            contactElement.addEventListener('click', () => {
              startOrOpenConversation(user._id);
            });
          }

          container.appendChild(contactElement);
        });
      })
      .catch(err => console.error('Error al cargar usuarios:', err));
  };

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
          socket ? socket.readyState : 'socket no inicializado'
        );

        alert(
          'No se puede iniciar la conversación porque no hay conexión con el servidor. Intentando reconectar...'
        );
        
        initWebSocket();

        pendingActions.push(() => startOrOpenConversation(userId));
      }
    }
  };

  const selectConversation = conversationId => {
    currentConversationId = conversationId;

    document.querySelectorAll('.chat-contact').forEach(contact => {
      contact.classList.remove('active');
    });

    const selectedContact = document.querySelector(
      `.chat-contact[data-conversation-id="${conversationId}"]`
    );
    if (selectedContact) {
      // Solo añadir 'active' si NO estamos en móvil
      if (!isMobileView()) {
        selectedContact.classList.add('active');
      }
      // En móvil desplazamos panel
      if (isMobileView()) {
        selectedContact.addEventListener('click', handleContactClick);
      }

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

      if (!isConnected) {
        initWebSocket();
      }
    }

    const conversation = conversations.find(
      c => c._id === currentConversationId
    );
    if (conversation) {
      const existingMessage = conversation.messages.find(
        msg => msg.text === text && msg.timestamp === message.timestamp
      );

      if (!existingMessage) {
        const fakeMessage = {
          _id: 'local-temp-id',
          sender: currentUser._id,
          text: text,
          createdAt: new Date().toISOString(),
          read: false
        };

        updateConversationWithNewMessage(currentConversationId, fakeMessage);
      }
    }

    const messageInput = document.getElementById('message-input');
    if (messageInput) {
      messageInput.value = '';
    }
  };

  const updateChatHeader = conversationId => {
    const conversation = conversations.find(c => c._id === conversationId);
    if (!conversation) return;

    const chatContainer = document.getElementById('contacts-container');

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
          
        </div>
        <div class="contact-info">
          <div class="contact-name">${otherParticipant.name}</div>
          <div class="contact-status ${
            otherParticipant.isOnline ? 'online' : 'offline'
          }">
          ${otherParticipant.isOnline ? 'En línea' : 'Desconectado'}
          </div>
        </div>
        
        ${isMobileView() ? '<i class="fa-solid fa-xmark"></i>' : ''}

      `;

      if (isMobileView()) {
        const closeIcon = headerElement.querySelector('.fa-xmark');
        closeIcon?.addEventListener('click', () => {
          const chatContainer = document.getElementById('chat-container');
          chatContainer.style.transform = 'translateX(0%)';
          chatContainer.classList.remove('chat-container-mobile-active');
        });
      }
    }
  };

  const fetchMessages = conversationId => {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = '';
    }

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

        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

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
    let conversation = conversations.find(c => c._id === conversationId);

    if (!conversation) {
      conversation = {
        _id: conversationId,
        participants: [], // opcional si ya fue rellenado antes
        lastMessage: null
      };
      conversations.push(conversation);
    }

    conversation.lastMessage = message;

    conversations.sort((a, b) => {
      const dateA = new Date(a.lastMessage?.createdAt || 0);
      const dateB = new Date(b.lastMessage?.createdAt || 0);
      return dateB - dateA;
    });
    
    renderUsersWithConversations(conversations);
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

    document.querySelectorAll('.chat-contact').forEach(contact => {
      const conversationId = contact.dataset.conversationId;
      if (!conversationId) return;

      const conversation = conversations.find(c => c._id === conversationId);
      if (!conversation) return;

      const otherParticipant = conversation.participants.find(
        p => p._id !== currentUser._id
      );
      if (!otherParticipant) return;
    });

    if (currentConversationId) {
      updateChatHeader(currentConversationId);
    }
  };

  const updateMessagesReadStatus = data => {
    const { conversationId, messageIds } = data;

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

  const init = () => {
    if (!authToken) {
      console.error('No hay token de autenticación');
      return;
    }

    fetchCurrentUser()
      .then(userData => {
        if (!userData || !userData.data || !userData.data.user) {
          throw new Error('No se pudo obtener información del usuario');
        }

        currentUser = userData.data.user;

        loadUsers();

        initWebSocket();

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

        const usersContainer = document.getElementById('contacts-container');
        if (!usersContainer) {
          console.error('No se encontró el contenedor de usuarios');
          return;
        }

        usersContainer.innerHTML = '';

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

  return {
    init: init
  };
})();

document.addEventListener('DOMContentLoaded', ChatModule.init);

const getCurrentUser = async () => {
  try {
    currentUser = await fetchCurrentUser(API_URL);
    updateUIForUser(currentUser, API_URL, 'Chats');
  } catch (error) {
    console.error('Error al obtener usuario:', error);
  }
};

const handleContactClick = () => {
  const chatContainer = document.getElementById('chat-container');

  if (isMobileView()) {
    chatContainer.style.transform = 'translateX(-50%)';

    chatContainer.classList.add('chat-container-mobile-active');
  }
};

const isMobileView = () => window.innerWidth <= 768;

window.addEventListener('resize', () => {
  const chatContainer = document.getElementById('chat-container');
  if (window.innerWidth > 768) {
    chatContainer.style.transform = 'translateX(0)';
    chatContainer.classList.remove('chat-container-mobile-active');
  }
});
