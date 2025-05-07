const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');
const { protect } = require('../middlewares/authMiddleware');

// Obtener todos los usuarios para el chat (excepto el usuario actual)
router.get('/users', protect, async (req, res) => {
  try {
    console.log('Solicitando usuarios para el chat. Usuario actual:', req.user.id);
    // Nota: En tu middleware, guardas el ID como req.user.id, no como req.user._id
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('name email avatar lastActive isOnline')
      .sort({ name: 1 });

    console.log(`Se encontraron ${users.length} usuarios`);

    res.status(200).json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

// Obtener conversaciones del usuario actual
router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id
    })
      .populate('participants', 'name email avatar isOnline lastActive')
      .populate({
        path: 'lastMessage',
        select: 'text sender createdAt'
      })
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    res.status(500).json({ message: 'Error al obtener conversaciones' });
  }
});

// Obtener mensajes de una conversación
router.get('/messages/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Verificar que el usuario sea participante de la conversación
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.id
    });

    if (!conversation) {
      return res
        .status(403)
        .json({ message: 'No tienes acceso a esta conversación' });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name email avatar')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ message: 'Error al obtener mensajes' });
  }
});

module.exports = router;
