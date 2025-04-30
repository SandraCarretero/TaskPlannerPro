const Task = require("../models/taskModel")
const { AppError } = require("../utils/errorUtil")
const { broadcastUpdate } = require("../services/websocketService")

// Obtener todas las tareas del usuario
exports.getTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).populate("photos").sort({ createdAt: -1 })

    res.status(200).json({
      status: "success",
      results: tasks.length,
      data: {
        tasks,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Obtener una tarea específica
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("photos")

    if (!task) {
      throw new AppError("Tarea no encontrada", 404)
    }

    res.status(200).json({
      status: "success",
      data: {
        task,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Crear una nueva tarea
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, dueDate, status, priority, tags } = req.body

    const task = new Task({
      title,
      description,
      dueDate,
      status,
      priority,
      tags,
      user: req.user.id,
    })

    await task.save()

    // Notificar a los clientes conectados
    broadcastUpdate({
      type: "TASK_CREATED",
      payload: task,
    })

    res.status(201).json({
      status: "success",
      data: {
        task,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Actualizar una tarea
exports.updateTask = async (req, res, next) => {
  try {
    const { title, description, dueDate, status, priority, tags } = req.body

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      {
        title,
        description,
        dueDate,
        status,
        priority,
        tags,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true },
    ).populate("photos")

    if (!task) {
      throw new AppError("Tarea no encontrada", 404)
    }

    // Notificar a los clientes conectados
    broadcastUpdate({
      type: "TASK_UPDATED",
      payload: task,
    })

    res.status(200).json({
      status: "success",
      data: {
        task,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Eliminar una tarea
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    })

    if (!task) {
      throw new AppError("Tarea no encontrada", 404)
    }

    // Notificar a los clientes conectados
    broadcastUpdate({
      type: "TASK_DELETED",
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

// Para administradores: obtener todas las tareas de todos los usuarios
exports.getAllTasks = async (req, res, next) => {
  try {
    // Verificar si el usuario es administrador
    if (req.user.role !== "admin") {
      throw new AppError("No tienes permiso para realizar esta acción", 403)
    }

    const tasks = await Task.find().populate("user", "name email").populate("photos").sort({ createdAt: -1 })

    res.status(200).json({
      status: "success",
      results: tasks.length,
      data: {
        tasks,
      },
    })
  } catch (error) {
    next(error)
  }
}
