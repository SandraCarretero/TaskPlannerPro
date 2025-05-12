const eventService = require('../services/eventService');
const { AppError } = require('../utils/errorUtil');

exports.getEvents = async (req, res, next) => {
  try {
    const events = await eventService.getUserEvents(req.user.id);
    res.status(200).json({
      status: 'success',
      results: events.length,
      data: { events }
    });
  } catch (error) {
    next(error);
  }
};

exports.getEvent = async (req, res, next) => {
  try {
    const event = await eventService.getEventById(req.params.id, req.user.id);
    if (!event) throw new AppError('Evento no encontrado', 404);
    res.status(200).json({
      status: 'success',
      data: { event }
    });
  } catch (error) {
    next(error);
  }
};

exports.createEvent = async (req, res, next) => {
  try {
    const eventData = { ...req.body };
    const event = await eventService.createEvent(eventData);
    res.status(201).json({
      status: 'success',
      data: { event }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const updates = req.body;
    const event = await eventService.updateEvent(
      req.params.id,
      updates
    );
    if (!event) throw new AppError('Evento no encontrado', 404);
    res.status(200).json({ status: 'success', data: { event } });
  } catch (error) {
    next(error);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const deleted = await eventService.deleteEvent(req.params.id);
    if (!deleted) throw new AppError('Evento no encontrado', 404);
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};

exports.getAllEvents = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      throw new AppError('No tienes permiso para realizar esta acción', 403);
    }

    const events = await eventService.getAllEvents();
    res.status(200).json({
      status: 'success',
      results: events.length,
      data: { events }
    });
  } catch (error) {
    next(error);
  }
};
