const Task = require('../models/taskModel');
const { AppError } = require('../utils/errorUtil');

// Obtener todas las tareas del usuario
exports.getUserTasks = async (userId) => {
  return await Task.find({ user: userId }).populate('photos').sort({ createdAt: -1 });
};

// Obtener una tarea específica
exports.getUserTaskById = async (taskId, userId) => {
  const task = await Task.findOne({ _id: taskId, user: userId }).populate('photos');
  if (!task) throw new AppError('Tarea no encontrada', 404);
  return task;
};

// Crear una nueva tarea
exports.createTask = async (taskData) => {
  const task = new Task(taskData);
  await task.save();
  return task;
};

// Actualizar una tarea
exports.updateTask = async (taskId, userId, updates) => {
  const task = await Task.findOneAndUpdate(
    { _id: taskId, user: userId },
    { ...updates, updatedAt: Date.now() },
    { new: true, runValidators: true }
  ).populate('photos');
  if (!task) throw new AppError('Tarea no encontrada', 404);
  return task;
};

// Eliminar una tarea
exports.deleteTask = async (taskId, userId) => {
  const task = await Task.findOneAndDelete({ _id: taskId, user: userId });
  if (!task) throw new AppError('Tarea no encontrada', 404);
  return task;
};

// Obtener todas las tareas (para admins)
exports.getAllTasks = async () => {
  return await Task.find()
    .populate('user', 'name email')
    .populate('photos')
    .sort({ createdAt: -1 });
};
