const avatarService = require('../services/avatarService');
const { AppError } = require('../utils/errorUtil');

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No se ha subido ningún archivo', 400);

    const avatar = await avatarService.uploadAvatar(req.file, req.user.id);

    res.status(201).json({
      status: 'success',
      data: { avatar }
    });
  } catch (error) {
    next(error);
  }
};

exports.getAvatar = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.id;
    const avatar = await avatarService.getUserAvatar(userId);

    res.status(200).json({
      status: 'success',
      data: { avatar }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAvatar = async (req, res, next) => {
  try {
    await avatarService.deleteUserAvatar(req.user.id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};
