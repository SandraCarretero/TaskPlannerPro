const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // Puede ser una conversación individual o grupal
    isGroup: {
      type: Boolean,
      default: false
    },
    // Nombre del grupo (si es una conversación grupal)
    name: {
      type: String,
      trim: true
    },
    // Participantes de la conversación
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    // Referencia al último mensaje
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    // Creador del grupo (si es una conversación grupal)
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // Para conversaciones grupales, quién puede enviar mensajes
    // 'all': todos los participantes, 'admin': solo administradores
    sendPermission: {
      type: String,
      enum: ['all', 'admin'],
      default: 'all'
    },
    // Administradores del grupo
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true
  }
);

// Índices para mejorar el rendimiento de las consultas
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
