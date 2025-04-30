const Event = require("../models/eventModel")
const { AppError } = require("../utils/errorUtil")
const { broadcastUpdate } = require("../services/websocketService")

// Obtener todos los eventos del usuario
exports.getEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ user: req.user.id }).populate("photos").sort({ startDate: 1 })

    res.status(200).json({
      status: "success",
      results: events.length,
      data: {
        events,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Obtener un evento específico
exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("photos")

    if (!event) {
      throw new AppError("Evento no encontrado", 404)
    }

    res.status(200).json({
      status: "success",
      data: {
        event,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Crear un nuevo evento
exports.createEvent = async (req, res, next) => {
  try {
    const { title, description, startDate, endDate, location } = req.body

    const event = new Event({
      title,
      description,
      startDate,
      endDate,
      location,
      user: req.user.id,
    })

    await event.save()

    // Notificar a los clientes conectados
    broadcastUpdate({
      type: "EVENT_CREATED",
      payload: event,
    })

    res.status(201).json({
      status: "success",
      data: {
        event,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Actualizar un evento
exports.updateEvent = async (req, res, next) => {
  try {
    const { title, description, startDate, endDate, location } = req.body

    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      {
        title,
        description,
        startDate,
        endDate,
        location,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true },
    ).populate("photos")

    if (!event) {
      throw new AppError("Evento no encontrado", 404)
    }

    // Notificar a los clientes conectados
    broadcastUpdate({
      type: "EVENT_UPDATED",
      payload: event,
    })

    res.status(200).json({
      status: "success",
      data: {
        event,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Eliminar un evento
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    })

    if (!event) {
      throw new AppError("Evento no encontrado", 404)
    }

    // Notificar a los clientes conectados
    broadcastUpdate({
      type: "EVENT_DELETED",
      payload: { id: req.params.id },
    })

    res.status(204).json({
      status: "success",
      data: null,
    })
  } catch (error) {
    next(error)
  }
}

// Para administradores: obtener todos los eventos de todos los usuarios
exports.getAllEvents = async (req, res, next) => {
  try {
    // Verificar si el usuario es administrador
    if (req.user.role !== "admin") {
      throw new AppError("No tienes permiso para realizar esta acción", 403)
    }

    const events = await Event.find().populate("user", "name email").populate("photos").sort({ startDate: 1 })

    res.status(200).json({
      status: "success",
      results: events.length,
      data: {
        events,
      },
    })
  } catch (error) {
    next(error)
  }
}
