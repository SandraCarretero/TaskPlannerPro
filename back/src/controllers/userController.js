const User = require('../models/userModel');
const { AppError } = require('../utils/errorUtil');
const fs = require('fs');
const path = require('path');

// Obtener todos los usuarios (solo para administradores)
exports.getAllUsers = async (req, res, next) => {
  try {
    // Verificar si el usuario es administrador
    if (req.user.role !== 'admin') {
      throw new AppError('No tienes permiso para realizar esta acción', 403);
    }

    const users = await User.find().select('-password');

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar perfil de usuario
exports.updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;

    // No permitir actualizar email o contraseña por esta ruta
    if (req.body.email || req.body.password) {
      throw new AppError(
        'Esta ruta no es para actualizar email o contraseña',
        400
      );
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// Actualizar avatar de usuario
exports.updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No se ha subido ningún archivo', 400);
    }

    const user = await User.findById(req.user.id);

    // Eliminar avatar anterior si existe
    if (user.avatar) {
      const oldAvatarPath = path.join(__dirname, '..', user.avatar);
      fs.unlink(oldAvatarPath, err => {
        if (err && err.code !== 'ENOENT') {
          console.error('Error al eliminar avatar anterior:', err);
        }
      });
    }

    // Actualizar avatar
    user.avatar = `/uploads/avatar/${req.file.filename}`;
    await user.save();

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Cambiar contraseña
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    // Verificar contraseña actual
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new AppError('Contraseña actual incorrecta', 401);
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Contraseña actualizada correctamente'
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAcount = async (req, res, next) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.user.id);

    if (!deletedUser) {
      throw new AppError('Usuario no encontrado', 404);
    }

    // Eliminar cookie con el token
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict'
    });

    res.status(200).json({
      status: 'success',
      message: 'Cuenta eliminada y sesión cerrada correctamente'
    });
  } catch (error) {
    next(error);
  }
};
