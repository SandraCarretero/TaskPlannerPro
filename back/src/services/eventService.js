const Event = require('../models/eventModel');
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
    const event = new Event(eventData);
    await event.save();
    console.log('Evento guardado:', event); // Verifica si la tarea se guarda correctamente
    return event;
  } catch (error) {
    console.error('Error al guardar evento:', error); // Muestra el error si ocurre
    throw error;
  }
}

exports.updateEvent = async (eventId, updates) => {
  const event = await Event.findOneAndUpdate(
    { _id: eventId },
    { ...updates, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );
  if (!event) throw new AppError('Evento no encontrado', 404);
  return event;
}

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
