const taskService = require('../services/taskService');
const { AppError } = require('../utils/errorUtil');

// Obtener todas las tareas del usuario
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
    const taskData = { ...req.body };
    const task = await taskService.createTask(taskData);
    res.status(201).json({ status: 'success', data: { task } });
  } catch (error) {
    next(error);
  }
};

// Actualizar una tarea
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
    // Extraer solo el campo de estado del body
    const { status } = req.body;
    
    // Validar que el estado sea válido
    const validStatuses = ['pending', 'progress', 'completed'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Estado no válido', 400);
    }
    
    // Crear un objeto que solo contenga el campo de estado
    const updates = { status };
    
    // Usar el mismo servicio pero solo con el campo de estado
    const task = await taskService.updateTask(req.params.id, updates);
    
    res.status(200).json({ status: 'success', data: { task } });
  } catch (error) {
    next(error);
  }
}

// Eliminar una tarea
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
