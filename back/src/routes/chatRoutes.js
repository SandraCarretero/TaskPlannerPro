const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const Conversation = require('../models/conversationModel');
// const { protect } = require('../middlewares/authMiddleware'); // ⬅️ Asegúrate de importar esto

// Obtener todos los usuarios para el chat (excepto el usuario actual)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }) 
      .select('name email avatar lastActive')
      .sort({ name: 1 });

    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

module.exports = router;
