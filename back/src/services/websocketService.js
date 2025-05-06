const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const Message = require('../models/messageModel');
const Conversation = require('../models/conversationModel');
const User = require('../models/userModel');

// Almacenar referencia al servidor WebSocket
let wss;
// Almacenar clientes conectados con sus IDs
const clients = new Map();
// Mapeo de usuarios a clientes WebSocket
const userSockets = new Map();

// Inicializar el servidor WebSocket
exports.initWebSocket = server => {
  wss = new WebSocket.Server({ server });

  wss.on('connection', async (ws, req) => {
    const clientId = Date.now().toString();
    clients.set(clientId, ws);

    // Extraer token de autenticación de la URL (si existe)
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    let userId = null;

    // Si hay token, verificar y asociar con el usuario
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;

        const userExists = await User.findById(userId).select('_id');
        if (!userExists) {
          throw new Error('Usuario no encontrado');
        }

        // Asociar este socket con el usuario
        userSockets.set(userId, { clientId, ws });

        // Actualizar estado del usuario a "en línea"
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastActive: new Date()
        }).exec();

        console.log(`Usuario ${userId} conectado a WebSocket: ${clientId}`);
      } catch (error) {
        console.error('Error al verificar token:', error);
      }
    } else {
      console.log(`Cliente anónimo conectado a WebSocket: ${clientId}`);
    }

    ws.on('message', async message => {
      try {
        const data = JSON.parse(message);
        console.log('Mensaje recibido:', data);

        // Manejar diferentes tipos de mensajes
        switch (data.type) {
          case 'CHAT_MESSAGE':
            await handleChatMessage(clientId, userId, data);
            break;
          case 'SWITCH_CONTACT':
            // Aquí podrías cargar mensajes históricos del contacto
            console.log(
              `Cliente ${clientId} cambió al contacto ${data.payload.contactId}`
            );
            break;
          case 'CREATE_GROUP':
            await handleCreateGroup(clientId, userId, data);
            break;
          case 'PAGE_LOADED':
            console.log(
              `Cliente ${clientId} ha cargado la página ${data.payload.page}`
            );
            break;
          case 'PAGE_UNLOADED':
            console.log(
              `Cliente ${clientId} ha salido de la página ${data.payload.page}`
            );
            break;
          case 'MARK_AS_READ':
            await handleMarkAsRead(userId, data);
            break;
          default:
            console.log(`Tipo de mensaje no manejado: ${data.type}`);
        }
      } catch (error) {
        console.error('Error al procesar mensaje WebSocket:', error);
      }
    });

    ws.on('close', () => {
      console.log(`Cliente desconectado: ${clientId}`);

      // Si el cliente estaba asociado a un usuario, actualizar su estado
      if (userId) {
        userSockets.delete(userId);

        // Actualizar estado del usuario a "desconectado"
        User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastActive: new Date()
        }).exec();

        // Notificar a otros usuarios que este usuario se desconectó
        broadcastUserStatus(userId, false);
      }

      clients.delete(clientId);
    });

    // Enviar mensaje de bienvenida
    ws.send(
      JSON.stringify({
        type: 'CONNECTED',
        payload: {
          message: 'Conectado al servidor WebSocket',
          userId: userId
        }
      })
    );

    // Si el usuario está autenticado, enviar su lista de conversaciones
    if (userId) {
      sendUserConversations(userId, ws);

      // Notificar a otros usuarios que este usuario se conectó
      broadcastUserStatus(userId, true);
    }
  });

  return wss;
};

// Enviar conversaciones del usuario
async function sendUserConversations(userId, ws) {
  try {
    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'name email avatar isOnline lastActive')
      .populate({
        path: 'lastMessage',
        select: 'text sender createdAt'
      })
      .sort({ updatedAt: -1 });

    ws.send(
      JSON.stringify({
        type: 'CONVERSATIONS_LOADED',
        payload: { conversations }
      })
    );
  } catch (error) {
    console.error('Error al cargar conversaciones:', error);
  }
}

// Notificar a otros usuarios sobre el cambio de estado de un usuario
function broadcastUserStatus(userId, isOnline) {
  const statusUpdate = {
    type: 'USER_STATUS',
    payload: {
      userId: userId,
      isOnline: isOnline,
      lastActive: new Date()
    }
  };

  // Enviar a todos los clientes conectados excepto al usuario mismo
  for (const [otherUserId, { ws }] of userSockets.entries()) {
    if (otherUserId !== userId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(statusUpdate));
    }
  }
}

// Manejar mensajes de chat
async function handleChatMessage(clientId, userId, data) {
  if (!userId && data.payload.token) {
    try {
      const decoded = jwt.verify(data.payload.token, process.env.JWT_SECRET);
      userId = decoded.id;

      // Si podemos obtener un userId válido del token, actualizar la asociación
      if (userId) {
        // Asociar este socket con el usuario si no estaba ya asociado
        const client = clients.get(clientId);
        if (client) {
          userSockets.set(userId, { clientId, ws: client });
          console.log(
            `Usuario ${userId} autenticado mediante token en mensaje`
          );
        }
      }
    } catch (error) {
      console.error('Error al verificar token en mensaje:', error);
    }
  }

  // Verificar autenticación después del intento de validar el token
  if (!userId) {
    console.error('Usuario no autenticado intentando enviar mensaje');
    const client = clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: 'ERROR',
          payload: {
            message: 'No estás autenticado. Por favor inicia sesión nuevamente.'
          }
        })
      );
    }
    return;
  }

  const { conversationId, text, attachments } = data.payload;

  try {
    // Buscar o crear la conversación
    let conversation;

    if (conversationId) {
      // Conversación existente
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversación no encontrada');
      }
    } else if (data.payload.recipientId) {
      // Nueva conversación individual
      const recipientId = data.payload.recipientId;

      // Verificar si ya existe una conversación entre estos usuarios
      conversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [userId, recipientId], $size: 2 }
      });

      if (!conversation) {
        // Crear nueva conversación
        conversation = await Conversation.create({
          isGroup: false,
          participants: [userId, recipientId]
        });
      }
    } else {
      throw new Error('Se requiere conversationId o recipientId');
    }

    // Crear el mensaje
    const message = await Message.create({
      conversation: conversation._id,
      sender: userId,
      text,
      attachments: attachments || []
    });

    // Actualizar la última actividad y mensaje de la conversación
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: message._id,
      updatedAt: new Date()
    });

    // Obtener detalles del mensaje para enviar
    const populatedMessage = await Message.findById(message._id).populate(
      'sender',
      'name email avatar'
    );

    // Enviar mensaje a todos los participantes de la conversación
    for (const participantId of conversation.participants) {
      const participantSocket = userSockets.get(participantId.toString());

      if (
        participantSocket &&
        participantSocket.ws.readyState === WebSocket.OPEN
      ) {
        participantSocket.ws.send(
          JSON.stringify({
            type: 'NEW_MESSAGE',
            payload: {
              message: populatedMessage,
              conversation: conversation._id
            }
          })
        );
      }
    }

    return message;
  } catch (error) {
    console.error('Error al manejar mensaje de chat:', error);

    // Notificar al remitente sobre el error
    const client = clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: 'ERROR',
          payload: {
            message: 'Error al enviar mensaje: ' + error.message
          }
        })
      );
    }
  }
}

// Manejar creación de grupos
async function handleCreateGroup(clientId, userId, data) {
  if (!userId) {
    console.error('Usuario no autenticado intentando crear grupo');
    return;
  }

  const { name, participants } = data.payload;

  try {
    // Asegurarse de que el creador esté incluido en los participantes
    const allParticipants = [...new Set([userId, ...participants])];

    // Crear el grupo
    const conversation = await Conversation.create({
      isGroup: true,
      name,
      participants: allParticipants,
      creator: userId,
      admins: [userId]
    });

    // Obtener detalles completos de la conversación
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name email avatar isOnline lastActive')
      .populate('creator', 'name email avatar');

    // Notificar a todos los participantes sobre el nuevo grupo
    for (const participantId of allParticipants) {
      const participantSocket = userSockets.get(participantId.toString());

      if (
        participantSocket &&
        participantSocket.ws.readyState === WebSocket.OPEN
      ) {
        participantSocket.ws.send(
          JSON.stringify({
            type: 'GROUP_CREATED',
            payload: populatedConversation
          })
        );
      }
    }

    return conversation;
  } catch (error) {
    console.error('Error al crear grupo:', error);

    // Notificar al creador sobre el error
    const client = clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: 'ERROR',
          payload: {
            message: 'Error al crear grupo: ' + error.message
          }
        })
      );
    }
  }
}

// Manejar marcar mensajes como leídos
async function handleMarkAsRead(userId, data) {
  if (!userId) return;

  const { conversationId, messageIds } = data.payload;

  try {
    // Marcar mensajes como leídos
    await Message.updateMany(
      {
        _id: { $in: messageIds },
        conversation: conversationId,
        sender: { $ne: userId } // No marcar como leídos los mensajes propios
      },
      { read: true }
    );

    // Notificar a los remitentes que sus mensajes fueron leídos
    const messages = await Message.find({ _id: { $in: messageIds } }).distinct(
      'sender'
    );

    for (const senderId of messages) {
      if (senderId.toString() !== userId) {
        const senderSocket = userSockets.get(senderId.toString());

        if (senderSocket && senderSocket.ws.readyState === WebSocket.OPEN) {
          senderSocket.ws.send(
            JSON.stringify({
              type: 'MESSAGES_READ',
              payload: {
                reader: userId,
                conversationId,
                messageIds
              }
            })
          );
        }
      }
    }
  } catch (error) {
    console.error('Error al marcar mensajes como leídos:', error);
  }
}

// Enviar actualización a todos los clientes conectados
exports.broadcastUpdate = data => {
  if (!wss) {
    console.error('El servidor WebSocket no está inicializado');
    return;
  }

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// Enviar mensaje a un cliente específico por ID
exports.sendToClient = (clientId, data) => {
  const client = clients.get(clientId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
    return true;
  }
  return false;
};

// Enviar mensaje a un usuario específico por ID
exports.sendToUser = (userId, data) => {
  const userSocket = userSockets.get(userId);
  if (userSocket && userSocket.ws.readyState === WebSocket.OPEN) {
    userSocket.ws.send(JSON.stringify(data));
    return true;
  }
  return false;
};
