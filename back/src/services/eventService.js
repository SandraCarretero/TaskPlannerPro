const Event = require('../models/eventModel');
const User = require('../models/userModel');
const { AppError } = require('../utils/errorUtil');

exports.getUserEvents = async userId => {
  return await Event.find({ users: userId }).sort({ startDate: 1 });
};

exports.getEventById = async (eventId, userId) => {
  const event = await Event.findOne({ _id: eventId, users: userId });
  if (!event) throw new AppError('Evento no encontrado', 404);
  return event;
};

exports.createEvent = async eventData => {
  try {
    let query = {};
    if (eventData.targetGroup === 'user') {
      query = { role: 'user' };
    } else if (eventData.targetGroup === 'admin') {
      query = { role: 'admin' };
    }

    const users = await User.find(query, '_id');

    if (!users.length) {
      throw new AppError(
        'No se encontraron usuarios para el grupo especificado',
        404
      );
    }

    const userIds = users.map(u => u._id);

    const event = new Event({
      ...eventData,
      users: userIds
    });

    await event.save();
    return event;
  } catch (error) {
    console.error('Error al guardar evento:', error);
    throw error;
  }
};

exports.updateEvent = async (eventId, updates) => {
  try {
    let newUsers = [];
    if (updates.targetGroup) {
      let query = {};
      if (updates.targetGroup === 'user') {
        query = { role: 'user' };
      } else if (updates.targetGroup === 'admin') {
        query = { role: 'admin' };
      }
      const users = await User.find(query, '_id');
      if (!users.length) {
        throw new AppError(
          'No se encontraron usuarios para el grupo especificado',
          404
        );
      }
      newUsers = users.map(u => u._id);
    }

    const event = await Event.findOneAndUpdate(
      { _id: eventId },
      {
        ...updates,
        ...(updates.targetGroup ? { users: newUsers } : {}),
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!event) throw new AppError('Evento no encontrado', 404);
    return event;
  } catch (error) {
    console.error('Error al actualizar evento:', error);
    throw error;
  }
};

exports.deleteEvent = async (eventId, userId) => {
  const event = await Event.findOneAndDelete({ _id: eventId });
  if (!event) throw new AppError('Evento no encontrado', 404);
  return event;
};

exports.getAllEvents = async () => {
  return await Event.find()
    .populate('users', 'name email')
    .sort({ startDate: 1 });
};
