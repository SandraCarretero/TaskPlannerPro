const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('../utils/errorUtil');

// Obtener la ruta base del proyecto (backend)
const basePath = path.resolve(__dirname, '../../');

// Asegurar que existan los directorios para subir archivos
const createUploadDirs = () => {
  const dirs = [
    path.join(basePath, 'uploads'),
    path.join(basePath, 'uploads/avatar'),
    path.join(basePath, 'uploads/photos')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Configuración para subir fotos
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(basePath, 'uploads/photos'));
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split('/')[1];
    cb(null, `photo-${req.user.id}-${Date.now()}.${ext}`);
  }
});

const photoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'El archivo no es una imagen. Por favor, sube solo imágenes',
        400
      ),
      false
    );
  }
};

exports.uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: photoFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Configuración para subir avatares
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(basePath, 'uploads/avatar')); // Cambiado a avatar (singular)
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split('/')[1];
    cb(null, `avatar-${req.user.id}-${Date.now()}.${ext}`);
  }
});

exports.uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: photoFilter,
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});