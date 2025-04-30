const Photo = require('../models/avatarModel');
const User = require('../models/userModel');
const { AppError } = require('../utils/errorUtil');
const { broadcastUpdate } = require('../services/websocketService');
const fs = require('fs');
const path = require('path');

// Subir un avatar
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No se ha subido ningún archivo', 400);
    }

    console.log('Archivo recibido:', req.file);

    // Ruta para guardar el avatar (relativa a la raíz del proyecto)
    const relativePath = `/uploads/avatar/${req.file.filename}`;
    console.log('Ruta relativa guardada:', relativePath);

    // Crear registro del avatar
    const avatar = new Photo({
      filename: req.file.filename,
      path: relativePath,
      mimetype: req.file.mimetype,
      size: req.file.size,
      user: req.user.id,
      isAvatar: true
    });

    await avatar.save();

    // Verificar la ruta guardada en la base de datos
    const savedAvatar = await Photo.findById(avatar._id);
    console.log('Avatar guardado en DB:', savedAvatar);

    // Actualizar el avatar del usuario
    await User.findByIdAndUpdate(req.user.id, { avatar: avatar._id });

    // Notificar a los clientes conectados
    broadcastUpdate({
      type: 'AVATAR_UPDATED',
      payload: avatar
    });

    res.status(201).json({
      status: 'success',
      data: {
        avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

// Obtener el avatar del usuario
exports.getAvatar = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.id;

    // Buscar el usuario y obtener su avatar
    const user = await User.findById(userId).populate('avatar');

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

// Eliminar el avatar
exports.deleteAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('avatar');

    if (!user || !user.avatar) {
      throw new AppError('Avatar no encontrado', 404);
    }

    const avatar = user.avatar;

    // Eliminar archivo físico (ajustado para la nueva ruta)
    const filePath = path.join(path.resolve(__dirname, '../../'), avatar.path);
    fs.unlink(filePath, err => {
      if (err) {
        console.error('Error al eliminar archivo:', err);
      }
    });

    // Eliminar referencia en el usuario
    user.avatar = undefined;
    await user.save();

    // Eliminar registro de la base de datos
    await Photo.findByIdAndDelete(avatar._id);

    // Notificar a los clientes conectados
    broadcastUpdate({
      type: 'AVATAR_DELETED',
      payload: { id: avatar._id }
    });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};
