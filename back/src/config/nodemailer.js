const config = {
  PORT: process.env.PORT || 3000,
  EMAIL_USER: 'sandracarretero24@gmail.com',
  EMAIL_PASS: 'gcivsgupwtgxlewc' 
};

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
