const Task = require('../models/taskModel');
const { AppError } = require('../utils/errorUtil');

// Obtener todas las tareas del usuario
exports.getUserTasks = async userId => {
  return await Task.find({ users: userId }).sort({ createdAt: -1 });
};

// Obtener una tarea específica
exports.getUserTaskById = async (taskId, userId) => {
  const task = await Task.findOne({ _id: taskId, users: userId });
  if (!task) throw new AppError('Tarea no encontrada', 404);
  return task;
};

// Crear una nueva tarea
exports.createTask = async taskData => {
  try {
    const task = new Task(taskData);
    await task.save(); // Verifica si la tarea se guarda correctamente
    return task;
  } catch (error) {
    console.error('Error al guardar tarea:', error); // Muestra el error si ocurre
    throw error;
  }
};

// Actualizar una tarea
exports.updateTask = async (taskId, updates) => {
  const task = await Task.findOneAndUpdate(
    { _id: taskId },
    { ...updates, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );
  if (!task) throw new AppError('Tarea no encontrada', 404);
  return task;
};

// Eliminar una tarea
exports.deleteTask = async taskId => {
  const task = await Task.findOneAndDelete({ _id: taskId });
  if (!task) throw new AppError('Tarea no encontrada', 404);
  return task;
};

// Obtener todas las tareas (para admins)
exports.getAllTasks = async () => {
  return await Task.find()
    .populate('users', 'name email')
    .sort({ createdAt: -1 });
};
