const User = require('../models/userModel');
const { AppError } = require('../utils/errorUtil');
const fs = require('fs');
const path = require('path');

exports.getAllUsers = async (currentUser) => {
  if (currentUser.role !== 'admin') {
    throw new AppError('No tienes permiso para realizar esta acción', 403);
  }

  const users = await User.find().select('-password');
  return users;
};

exports.updateProfile = async (userId, updateData) => {
  const { name, email, password } = updateData;

  if (email || password) {
    throw new AppError('Esta ruta no es para actualizar email o contraseña', 400);
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { name },
    { new: true, runValidators: true }
  ).select('-password');

  return updatedUser;
};

exports.updateAvatar = async (userId, file) => {
  if (!file) {
    throw new AppError('No se ha subido ningún archivo', 400);
  }

  const user = await User.findById(userId);

  // Eliminar avatar anterior si existe
  if (user.avatar) {
    const oldAvatarPath = path.join(__dirname, '..', user.avatar);
    fs.unlink(oldAvatarPath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Error al eliminar avatar anterior:', err);
      }
    });
  }

  user.avatar = `/uploads/avatar/${file.filename}`;
  await user.save();

  return user;
};

exports.changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId);
  const isPasswordValid = await user.comparePassword(currentPassword);

  if (!isPasswordValid) {
    throw new AppError('Contraseña actual incorrecta', 401);
  }

  user.password = newPassword;
  await user.save();

  return true;
};

exports.deleteAccount = async (userId) => {
  const deletedUser = await User.findByIdAndDelete(userId);

  if (!deletedUser) {
    throw new AppError('Usuario no encontrado', 404);
  }

  return true;
};
