const taskService = require('../services/taskService');
const { AppError } = require('../utils/errorUtil');

exports.getTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getUserTasks(req.user.id);
    res
      .status(200)
      .json({ status: 'success', results: tasks.length, data: { tasks } });
  } catch (error) {
    next(error);
  }
};

exports.getTask = async (req, res, next) => {
  try {
    const task = await taskService.getUserTaskById(req.params.id, req.user.id);
    res.status(200).json({ status: 'success', data: { task } });
  } catch (error) {
    next(error);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const taskData = { ...req.body };
    const task = await taskService.createTask(taskData);
    res.status(201).json({ status: 'success', data: { task } });
  } catch (error) {
    next(error);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const updates = req.body;
    const task = await taskService.updateTask(
      req.params.id,
      updates
    );

    if (!task) throw new AppError('Tarea no encontrada', 404);
    res.status(200).json({ status: 'success', data: { task } });
  } catch (error) {
    next(error);
  }
};

exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ['pending', 'progress', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Estado no válido', 400);
    }
    
    const updates = { status };
    
    const task = await taskService.updateTask(req.params.id, updates);
    
    res.status(200).json({ status: 'success', data: { task } });
  } catch (error) {
    next(error);
  }
}

exports.deleteTask = async (req, res, next) => {
  try {
    const deleted = await taskService.deleteTask(req.params.id);
    if (!deleted) throw new AppError('Tarea no encontrada', 404);
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
    res
      .status(200)
      .json({ status: 'success', results: tasks.length, data: { tasks } });
  } catch (error) {
    next(error);
  }
};
