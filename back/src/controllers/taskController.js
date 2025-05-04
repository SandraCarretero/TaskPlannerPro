const taskService = require('../services/taskService');
const { broadcastUpdate } = require('../services/websocketService');
const { AppError } = require('../utils/errorUtil');

// Obtener todas las tareas del usuario
exports.getTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getUserTasks(req.user.id);
    res.status(200).json({ status: 'success', results: tasks.length, data: { tasks } });
  } catch (error) {
    next(error);
  }
};

// Obtener una tarea específica
exports.getTask = async (req, res, next) => {
  try {
    const task = await taskService.getUserTaskById(req.params.id, req.user.id);
    res.status(200).json({ status: 'success', data: { task } });
  } catch (error) {
    next(error);
  }
};

// Crear una nueva tarea
exports.createTask = async (req, res, next) => {
  try {
    const taskData = { ...req.body, user: req.user.id };
    const task = await taskService.createTask(taskData);
    broadcastUpdate({ type: 'TASK_CREATED', payload: task });
    res.status(201).json({ status: 'success', data: { task } });
  } catch (error) {
    next(error);
  }
};

// Actualizar una tarea
exports.updateTask = async (req, res, next) => {
  try {
    const updates = req.body;
    const task = await taskService.updateTask(req.params.id, req.user.id, updates);
    broadcastUpdate({ type: 'TASK_UPDATED', payload: task });
    res.status(200).json({ status: 'success', data: { task } });
  } catch (error) {
    next(error);
  }
};

// Eliminar una tarea
exports.deleteTask = async (req, res, next) => {
  try {
    await taskService.deleteTask(req.params.id, req.user.id);
    broadcastUpdate({ type: 'TASK_DELETED', payload: { id: req.params.id } });
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};

// Obtener todas las tareas (admin)
exports.getAllTasks = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      throw new AppError('No tienes permiso para realizar esta acción', 403);
    }
    const tasks = await taskService.getAllTasks();
    res.status(200).json({ status: 'success', results: tasks.length, data: { tasks } });
  } catch (error) {
    next(error);
  }
};
