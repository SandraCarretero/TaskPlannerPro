const chatService = require('../services/chatService');

const getChatUsers = async (req, res) => {
  try {
    const users = await chatService.fetchChatUsers(req.user.id);
    res.status(200).json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

const getUserConversations = async (req, res) => {
  try {
    const conversations = await chatService.fetchUserConversations(req.user.id);
    res.json(conversations);
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    res.status(500).json({ message: 'Error al obtener conversaciones' });
  }
};

const getConversationMessages = async (req, res) => {
  try {
    const messages = await chatService.fetchConversationMessages(
      req.params.conversationId,
      req.user.id
    );
    res.json(messages);
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ message: 'Error al obtener mensajes' });
  }
};

module.exports = {
  getChatUsers,
  getUserConversations,
  getConversationMessages
};
