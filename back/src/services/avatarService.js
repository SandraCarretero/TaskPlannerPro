const fs = require('fs');
const path = require('path');
const Photo = require('../models/avatarModel');
const User = require('../models/userModel');
const { AppError } = require('../utils/errorUtil');
const { broadcastUpdate } = require('./websocketService');

exports.uploadAvatar = async (file, userId) => {
  const relativePath = `/uploads/avatar/${file.filename}`;

  const avatar = new Photo({
    filename: file.filename,
    path: relativePath,
    mimetype: file.mimetype,
    size: file.size,
    user: userId,
    isAvatar: true
  });

  await avatar.save();

  await User.findByIdAndUpdate(userId, { avatar: avatar._id });

  broadcastUpdate({
    type: 'AVATAR_UPDATED',
    payload: avatar
  });

  return avatar;
};

exports.getUserAvatar = async userId => {
  const user = await User.findById(userId).populate('avatar');
  if (!user) throw new AppError('Usuario no encontrado', 404);
  return user.avatar;
};

exports.deleteUserAvatar = async userId => {
  const user = await User.findById(userId).populate('avatar');

  if (!user || !user.avatar) throw new AppError('Avatar no encontrado', 404);

  const avatar = user.avatar;
  const filePath = path.join(path.resolve(__dirname, '../../'), avatar.path);

  fs.unlink(filePath, err => {
    if (err) console.error('Error al eliminar archivo:', err);
  });

  user.avatar = undefined;
  await user.save();
  await Photo.findByIdAndDelete(avatar._id);

  broadcastUpdate({
    type: 'AVATAR_DELETED',
    payload: { id: avatar._id }
  });
};
