// Configuración global
const config = {
  PORT: process.env.PORT || 3000,
  EMAIL_USER: 'sandracarretero24@gmail.com', // Reemplaza con tu correo Gmail
  EMAIL_PASS: 'gcivsgupwtgxlewc' // Reemplaza con tu contraseña de aplicación
};

// Configuración de Nodemailer
const createTransporter = () => {
  const nodemailer = require('nodemailer');

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

module.exports = {
  config,
  createTransporter
};
