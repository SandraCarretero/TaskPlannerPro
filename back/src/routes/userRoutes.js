const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { uploadAvatar } = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Rutas protegidas para todos los usuarios
router.use(protect);

router.patch('/profile', userController.updateProfile);
router.patch('/avatar', uploadAvatar.single('avatar'), userController.updateAvatar);
router.patch('/password', userController.changePassword);
router.delete('/me', userController.deleteAcount)

// Rutas solo para administradores
router.get('/', restrictTo('admin'), userController.getAllUsers);

module.exports = router;
