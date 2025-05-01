const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const validateEmailData = require('../middlewares/validateEmailData');

// Ruta de prueba
router.get('/', emailController.testRoute);

// Ruta para enviar email
router.post('/send-email', validateEmailData, emailController.sendEmail);

module.exports = router; 