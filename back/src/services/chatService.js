const User = require('../models/userModel');
const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');

const fetchChatUsers = async (userId) => {
  return await User.find({ _id: { $ne: userId } })
    .select('name email avatar lastActive isOnline')
    .sort({ name: 1 });
};

const fetchUserConversations = async (userId) => {
  return await Conversation.find({ participants: userId })
    .populate('participants', 'name email avatar isOnline lastActive')
    .populate({
      path: 'lastMessage',
      select: 'text sender createdAt'
    })
    .sort({ updatedAt: -1 });
};

const fetchConversationMessages = async (conversationId, userId) => {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId
  });

  if (!conversation) {
    const error = new Error('No tienes acceso a esta conversación');
    error.status = 403;
    throw error;
  }

  return await Message.find({ conversation: conversationId })
    .populate('sender', 'name email avatar')
    .sort({ createdAt: 1 });
};

module.exports = {
  fetchChatUsers,
  fetchUserConversations,
  fetchConversationMessages
};
