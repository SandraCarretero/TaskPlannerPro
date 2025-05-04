const Event = require('../models/eventModel');
const { broadcastUpdate } = require('./websocketService');

exports.getUserEvents = async userId => {
  return await Event.find({ user: userId })
    .populate('photos')
    .sort({ startDate: 1 });
};

exports.getEventById = async (eventId, userId) => {
  return await Event.findOne({ _id: eventId, user: userId }).populate('photos');
};

exports.createEvent = async (data, userId) => {
  const { title, description, startDate, endDate, location } = data;

  const event = new Event({
    title,
    description,
    startDate,
    endDate,
    location,
    user: userId
  });

  await event.save();

  broadcastUpdate({
    type: 'EVENT_CREATED',
    payload: event
  });

  return event;
};

exports.updateEvent = async (eventId, data, userId) => {
  const { title, description, startDate, endDate, location } = data;

  const event = await Event.findOneAndUpdate(
    { _id: eventId, user: userId },
    {
      title,
      description,
      startDate,
      endDate,
      location,
      updatedAt: Date.now()
    },
    { new: true, runValidators: true }
  ).populate('photos');

  if (event) {
    broadcastUpdate({
      type: 'EVENT_UPDATED',
      payload: event
    });
  }

  return event;
};

exports.deleteEvent = async (eventId, userId) => {
  const event = await Event.findOneAndDelete({
    _id: eventId,
    user: userId
  });

  if (event) {
    broadcastUpdate({
      type: 'EVENT_DELETED',
      payload: { id: eventId }
    });
    return true;
  }

  return false;
};

exports.getAllEvents = async () => {
  return await Event.find()
    .populate('user', 'name email')
    .populate('photos')
    .sort({ startDate: 1 });
};
