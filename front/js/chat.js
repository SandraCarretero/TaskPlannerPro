// Variables globales
let socket;
let currentUser = null;
let currentConversationId = null;
let conversations = [];
let isConnected = false;
let authToken = localStorage.getItem('token'); // Asume que guardas el token en localStorage

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
  fetch('http://localhost:3000/api/chat/users') // ajusta esta URL a tu backend
    .then(response => response.json())
    .then(users => {
      console.log('Respuesta del backend:', users);
      const contactsContainer = document.getElementById('chat-contacts');
      contactsContainer.innerHTML = ''; // Limpiar contactos previos

      users.forEach(user => {
        const contact = document.createElement('div');
        contact.className = 'chat-contact';
        contact.dataset.contactId = user.id;

        contact.innerHTML = `
            <div class="contact-avatar">
              <img src="/placeholder.svg?height=40&width=40" alt="${user.name}" />
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
    });
});

// Obtener información del usuario actual
async function fetchCurrentUser() {
  try {
    const response = await fetch('/api/auth/me', {
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

// Obtener conversaciones del usuario
async function fetchConversations() {
  try {
    const response = await fetch('/api/chat/conversations', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener conversaciones');
    }

    const data = await response.json();
    conversations = data;

    // Renderizar conversaciones en la interfaz
    renderConversations(conversations);

    // Si hay conversaciones, seleccionar la primera por defecto
    if (conversations.length > 0) {
      selectConversation(conversations[0]._id);
    }
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
  }
}

// Renderizar lista de conversaciones
function renderConversations(conversations) {
  const chatContacts = document.getElementById('chat-contacts');
  if (!chatContacts) return;

  chatContacts.innerHTML = '';

  conversations.forEach(conversation => {
    // Para conversaciones individuales, mostrar al otro usuario
    let displayName, avatar, lastMessage, unreadCount;

    if (!conversation.isGroup) {
      // Encontrar al otro participante (no el usuario actual)
      const otherParticipant = conversation.participants.find(
        p => p._id !== currentUser._id
      );

      displayName = otherParticipant
        ? otherParticipant.name
        : 'Usuario desconocido';
      avatar =
        otherParticipant?.avatar || '/placeholder.svg?height=40&width=40';

      // Estado en línea
      const isOnline = otherParticipant?.isOnline;
      const statusClass = isOnline ? 'online' : 'offline';
    } else {
      // Para grupos, mostrar el nombre del grupo
      displayName = conversation.name;
      avatar = '/placeholder.svg?height=40&width=40'; // Icono de grupo
    }

    // Último mensaje
    lastMessage = conversation.lastMessage
      ? (conversation.lastMessage.sender === currentUser._id ? 'Tú: ' : '') +
        conversation.lastMessage.text
      : 'No hay mensajes';

    // Calcular mensajes no leídos
    unreadCount = 0; // Esto debería venir del backend

    // Crear elemento de contacto
    const contactElement = document.createElement('div');
    contactElement.className = `chat-contact${
      currentConversationId === conversation._id ? ' active' : ''
    }`;
    contactElement.dataset.conversationId = conversation._id;
    contactElement.dataset.isGroup = conversation.isGroup;

    contactElement.innerHTML = `
      <div class="contact-avatar">
        <img src="${avatar}" alt="${displayName}">
        ${
          conversation.isGroup
            ? ''
            : `<span class="status-indicator ${statusClass}"></span>`
        }
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

// Formatear tiempo
function formatTime(date) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date >= today) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (date >= yesterday) {
    return 'Ayer';
  } else {
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  }
}

// Seleccionar una conversación
function selectConversation(conversationId) {
  currentConversationId = conversationId;

  // Actualizar UI para mostrar la conversación seleccionada
  document.querySelectorAll('.chat-contact').forEach(contact => {
    contact.classList.remove('active');
  });

  const selectedContact = document.querySelector(
    `.chat-contact[data-conversation-id="${conversationId}"]`
  );
  if (selectedContact) {
    selectedContact.classList.add('active');

    // Actualizar encabezado del chat
    updateChatHeader(conversationId);

    // Cargar mensajes de esta conversación
    fetchMessages(conversationId);

    // Notificar al servidor sobre el cambio de conversación
    if (isConnected) {
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

// Actualizar encabezado del chat
function updateChatHeader(conversationId) {
  const conversation = conversations.find(c => c._id === conversationId);
  if (!conversation) return;

  const headerName = document.querySelector('.chat-header-user .contact-name');
  const headerStatus = document.querySelector(
    '.chat-header-user .contact-status'
  );
  const headerAvatar = document.querySelector(
    '.chat-header-user .contact-avatar img'
  );

  if (headerName && headerStatus && headerAvatar) {
    if (!conversation.isGroup) {
      // Conversación individual
      const otherParticipant = conversation.participants.find(
        p => p._id !== currentUser._id
      );

      headerName.textContent = otherParticipant
        ? otherParticipant.name
        : 'Usuario desconocido';
      headerStatus.textContent = otherParticipant?.isOnline
        ? 'En línea'
        : 'Desconectado';
      headerStatus.className = `contact-status ${
        otherParticipant?.isOnline ? 'online' : 'offline'
      }`;
      headerAvatar.src =
        otherParticipant?.avatar || '/placeholder.svg?height=40&width=40';
    } else {
      // Grupo
      headerName.textContent = conversation.name;
      headerStatus.textContent = `${conversation.participants.length} participantes`;
      headerStatus.className = 'contact-status';
      headerAvatar.src = '/placeholder.svg?height=40&width=40'; // Icono de grupo
    }
  }
}

// Cargar mensajes de una conversación
async function fetchMessages(conversationId) {
  try {
    const response = await fetch(`/api/chat/messages/${conversationId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener mensajes');
    }

    const messages = await response.json();

    // Limpiar mensajes actuales
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';

    // Agrupar mensajes por fecha
    const messagesByDate = groupMessagesByDate(messages);

    // Renderizar mensajes agrupados por fecha
    Object.entries(messagesByDate).forEach(([date, msgs]) => {
      // Añadir separador de fecha
      const dateElement = document.createElement('div');
      dateElement.className = 'message-date';
      dateElement.textContent = formatMessageDate(date);
      chatMessages.appendChild(dateElement);

      // Renderizar mensajes de este día
      msgs.forEach(message => {
        displayMessage({
          id: message._id,
          conversationId: message.conversation,
          text: message.text,
          sender: message.sender._id === currentUser._id ? 'sent' : 'received',
          senderInfo: message.sender,
          timestamp: message.createdAt,
          read: message.read
        });
      });
    });

    // Desplazar al final
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Marcar mensajes como leídos
    markMessagesAsRead(conversationId, messages);
  } catch (error) {
    console.error('Error al cargar mensajes:', error);
  }
}

// Agrupar mensajes por fecha
function groupMessagesByDate(messages) {
  const groups = {};

  messages.forEach(message => {
    const date = new Date(message.createdAt).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
  });

  return groups;
}

// Formatear fecha de mensaje
function formatMessageDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Hoy';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Ayer';
  } else {
    return date.toLocaleDateString([], {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}

// Marcar mensajes como leídos
function markMessagesAsRead(conversationId, messages) {
  // Filtrar mensajes no leídos que no son del usuario actual
  const unreadMessages = messages.filter(
    m => !m.read && m.sender._id !== currentUser._id
  );

  if (unreadMessages.length === 0) return;

  // Obtener IDs de mensajes no leídos
  const messageIds = unreadMessages.map(m => m._id);

  // Enviar solicitud para marcar como leídos
  if (isConnected) {
    socket.send(
      JSON.stringify({
        type: 'MARK_AS_READ',
        payload: {
          conversationId,
          messageIds
        }
      })
    );
  }
}

// Inicializar conexión WebSocket
function initWebSocket() {
  // Determinar la URL del WebSocket basada en la URL actual
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = window.location.port || (protocol === 'wss:' ? '443' : '80');
  const wsUrl = `${protocol}//${host}:${port}?token=${authToken}`;

  console.log(`Conectando a WebSocket: ${wsUrl}`);

  // Crear conexión WebSocket
  socket = new WebSocket(wsUrl);

  // Evento: Conexión establecida
  socket.addEventListener('open', event => {
    console.log('Conectado al servidor WebSocket');
    isConnected = true;

    // Notificar al servidor que estamos en la página de chat
    socket.send(
      JSON.stringify({
        type: 'PAGE_LOADED',
        payload: {
          page: 'chat',
          timestamp: new Date().toISOString()
        }
      })
    );
  });

  // Evento: Mensaje recibido
  socket.addEventListener('message', event => {
    try {
      const data = JSON.parse(event.data);
      console.log('Mensaje recibido:', data);

      // Manejar diferentes tipos de mensajes
      handleIncomingMessage(data);
    } catch (error) {
      console.error('Error al procesar mensaje:', error);
    }
  });

  // Evento: Conexión cerrada
  socket.addEventListener('close', event => {
    console.log('Desconectado del servidor WebSocket');
    isConnected = false;

    // Intentar reconectar después de 5 segundos
    setTimeout(initWebSocket, 5000);
  });

  // Evento: Error en la conexión
  socket.addEventListener('error', event => {
    console.error('Error de WebSocket:', event);
    isConnected = false;
  });
}

// Manejar mensajes entrantes
function handleIncomingMessage(data) {
  switch (data.type) {
    case 'CONNECTED':
      // Mensaje de conexión exitosa
      console.log(data.payload.message);
      break;

    case 'CONVERSATIONS_LOADED':
      // Conversaciones cargadas desde el servidor
      conversations = data.payload.conversations;
      renderConversations(conversations);

      // Si hay conversaciones, seleccionar la primera por defecto
      if (conversations.length > 0 && !currentConversationId) {
        selectConversation(conversations[0]._id);
      }
      break;

    case 'NEW_MESSAGE':
      // Nuevo mensaje recibido
      const { message, conversation } = data.payload;

      // Actualizar la conversación en la lista
      updateConversationWithNewMessage(conversation, message);

      // Si es la conversación actual, mostrar el mensaje
      if (currentConversationId === conversation) {
        displayMessage({
          id: message._id,
          conversationId: message.conversation,
          text: message.text,
          sender: message.sender._id === currentUser._id ? 'sent' : 'received',
          senderInfo: message.sender,
          timestamp: message.createdAt,
          read: message.read
        });

        // Marcar como leído si es la conversación actual
        markMessagesAsRead(conversation, [message]);
      }
      break;

    case 'GROUP_CREATED':
      // Grupo creado exitosamente
      const newConversation = data.payload;

      // Añadir a la lista de conversaciones
      conversations.unshift(newConversation);
      renderConversations(conversations);

      // Seleccionar la nueva conversación
      selectConversation(newConversation._id);
      break;

    case 'USER_STATUS':
      // Actualización de estado de usuario
      updateUserStatus(data.payload);
      break;

    case 'MESSAGES_READ':
      // Mensajes marcados como leídos por otro usuario
      updateMessagesReadStatus(data.payload);
      break;

    case 'ERROR':
      // Error del servidor
      console.error('Error del servidor:', data.payload.message);
      alert(`Error: ${data.payload.message}`);
      break;

    default:
      console.log(`Tipo de mensaje no manejado: ${data.type}`);
  }
}

// Actualizar conversación con nuevo mensaje
function updateConversationWithNewMessage(conversationId, message) {
  // Encontrar la conversación
  const conversationIndex = conversations.findIndex(
    c => c._id === conversationId
  );
  if (conversationIndex === -1) return;

  // Actualizar último mensaje
  conversations[conversationIndex].lastMessage = message;

  // Mover la conversación al principio de la lista
  const conversation = conversations.splice(conversationIndex, 1)[0];
  conversations.unshift(conversation);

  // Volver a renderizar las conversaciones
  renderConversations(conversations);
}

// Actualizar estado de usuario
function updateUserStatus(data) {
  const { userId, isOnline, lastActive } = data;

  // Actualizar estado en las conversaciones
  conversations.forEach(conversation => {
    if (!conversation.isGroup) {
      const participant = conversation.participants.find(p => p._id === userId);
      if (participant) {
        participant.isOnline = isOnline;
        participant.lastActive = lastActive;
      }
    }
  });

  // Actualizar UI
  renderConversations(conversations);

  // Si es la conversación actual, actualizar el encabezado
  if (currentConversationId) {
    const currentConversation = conversations.find(
      c => c._id === currentConversationId
    );
    if (currentConversation && !currentConversation.isGroup) {
      const otherParticipant = currentConversation.participants.find(
        p => p._id !== currentUser._id
      );

      if (otherParticipant && otherParticipant._id === userId) {
        updateChatHeader(currentConversationId);
      }
    }
  }
}

// Actualizar estado de lectura de mensajes
function updateMessagesReadStatus(data) {
  const { reader, conversationId, messageIds } = data;

  // Actualizar UI para mostrar mensajes como leídos
  messageIds.forEach(messageId => {
    const messageElement = document.querySelector(
      `.message[data-message-id="${messageId}"]`
    );
    if (messageElement) {
      messageElement.classList.add('read');

      // Actualizar indicador de lectura
      const readIndicator = messageElement.querySelector(
        '.message-read-status'
      );
      if (readIndicator) {
        readIndicator.textContent = 'Leído';
        readIndicator.classList.add('read');
      }
    }
  });
}

// Mostrar mensaje en el chat
function displayMessage(message) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const messageElement = document.createElement('div');
  messageElement.className = `message ${message.sender}`;
  messageElement.dataset.messageId = message.id;

  if (message.sender === 'received') {
    const avatar =
      message.senderInfo?.avatar || '/placeholder.svg?height=30&width=30';
    const senderName = message.senderInfo?.name || 'Usuario';

    messageElement.innerHTML = `
      <div class="message-avatar">
        <img src="${avatar}" alt="${senderName}">
      </div>
      <div class="message-content">
        ${
          message.conversationId &&
          conversations.find(c => c._id === message.conversationId)?.isGroup
            ? `<div class="message-sender">${senderName}</div>`
            : ''
        }
        <div class="message-bubble">${message.text}</div>
        <div class="message-time">${time}</div>
      </div>
    `;
  } else {
    messageElement.innerHTML = `
      <div class="message-content">
        <div class="message-bubble">${message.text}</div>
        <div class="message-info">
          <span class="message-time">${time}</span>
          <span class="message-read-status ${message.read ? 'read' : ''}">${
      message.read ? 'Leído' : 'Enviado'
    }</span>
        </div>
      </div>
    `;
  }

  chatMessages.appendChild(messageElement);

  // Desplazar hacia abajo
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Enviar mensaje a través de WebSocket
function sendMessage(text) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    alert('No hay conexión con el servidor de chat');
    return;
  }

  if (!currentConversationId) {
    alert('Selecciona una conversación primero');
    return;
  }

  const message = {
    type: 'CHAT_MESSAGE',
    payload: {
      conversationId: currentConversationId,
      text: text,
      timestamp: new Date().toISOString()
    }
  };

  socket.send(JSON.stringify(message));

  // Limpiar campo de entrada
  const messageInput = document.getElementById('message-input');
  if (messageInput) {
    messageInput.value = '';
  }
}

// Configurar eventos de la interfaz
function setupEventListeners() {
  // Enviar mensaje al hacer clic en el botón
  const sendButton = document.getElementById('send-message');
  const messageInput = document.getElementById('message-input');

  if (sendButton && messageInput) {
    sendButton.addEventListener('click', () => {
      const text = messageInput.value.trim();
      if (text) {
        sendMessage(text);
      }
    });

    // Enviar mensaje al presionar Enter
    messageInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        const text = messageInput.value.trim();
        if (text) {
          sendMessage(text);
        }
      }
    });
  }

  // Cambiar conversación al hacer clic
  const chatContacts = document.getElementById('chat-contacts');
  if (chatContacts) {
    chatContacts.addEventListener('click', e => {
      const contactElement = e.target.closest('.chat-contact');
      if (contactElement) {
        const conversationId = contactElement.dataset.conversationId;
        selectConversation(conversationId);
      }
    });
  }

  // Buscar contactos
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

// Manejar cierre de la página
window.addEventListener('beforeunload', () => {
  if (isConnected) {
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
