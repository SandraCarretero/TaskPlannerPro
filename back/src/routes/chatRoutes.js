const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  getChatUsers,
  getUserConversations,
  getConversationMessages
} = require('../controllers/chatController');

router.get('/users', protect, getChatUsers);
router.get('/conversations', protect, getUserConversations);
router.get('/messages/:conversationId', protect, getConversationMessages);

module.exports = router;
