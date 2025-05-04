const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  // Para mensajes con archivos adjuntos (opcional)
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'document', 'audio', 'video']
    },
    url: String,
    name: String,
    size: Number
  }]
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;