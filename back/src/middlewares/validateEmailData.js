/**
 * Middleware para validar los datos del email
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función next de Express
 */
const validateEmailData = (req, res, next) => {
    const { name, email, message } = req.body;
    
    // Verificar que todos los campos requeridos estén presentes
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Faltan datos en el formulario.' });
    }
    
    // Validar el nombre
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'El nombre no es válido.' });
    }
    
    // Validar el email
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'El email no es válido.' });
    }
    
    // Validar el mensaje
    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'El mensaje no es válido.' });
    }
    
    // Si todo está bien, continuar con el siguiente middleware
    next();
  };
  
  module.exports = validateEmailData; 