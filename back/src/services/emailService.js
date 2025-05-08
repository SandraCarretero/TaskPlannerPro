const { createTransporter, config } = require("../config/nodemailer")

/**
 * Crea el contenido HTML del correo de confirmación de registro
 * @param {string} name - Nombre del usuario
 * @param {string} email - Email del usuario
 * @returns {string} - HTML del correo
 */
const createRegistrationEmailHtml = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Registro</title>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Montserrat', sans-serif;
          line-height: 1.6;
          color: #444;
          background-color: #f8f8f8;
          margin: 0;
          padding: 0;
        }
        
        .email-wrapper {
          max-width: 600px;
          margin: 20px auto;
        }
        
        .email-container {
          background-color: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 15px rgba(0, 0, 0, 0.05);
        }
        
        .header {
          padding: 35px 40px;
          background: linear-gradient(135deg, #5f33e1 0%, #4d27c0 100%);
          text-align: center;
        }
        
        .header img {
          width: 70px;
          height: auto;
          margin-bottom: 20px;
        }
        
        .header h1 {
          color: white;
          font-size: 26px;
          font-weight: 600;
          margin: 0;
          letter-spacing: 0.5px;
        }
        
        .welcome-banner {
          background-color: #eee9ff;
          text-align: center;
          padding: 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        
        .welcome-banner h2 {
          color: #5f33e1;
          margin: 0;
          font-size: 20px;
          font-weight: 500;
        }
        
        .content {
          padding: 40px;
          background-color: white;
        }
        
        .intro {
          font-size: 16px;
          line-height: 1.7;
          color: #444;
          margin-bottom: 30px;
        }
        
        .highlight {
          background-color: #eee9ff;
          border-radius: 6px;
          padding: 20px;
          margin: 25px 0;
          border-left: 4px solid #5f33e1;
        }
        
        .highlight p {
          margin: 0;
          font-size: 15px;
          color: #444;
        }
        
        .action-button {
          text-align: center;
          margin: 30px 0;
        }
        
        .button {
          display: inline-block;
          background-color: #5f33e1;
          color: white;
          text-decoration: none;
          padding: 12px 28px;
          border-radius: 6px;
          font-weight: 500;
          font-size: 15px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 10px rgba(95, 51, 225, 0.2);
        }
        
        .button:hover {
          background-color: #4d27c0;
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(95, 51, 225, 0.25);
        }
        
        .help-section {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 6px;
          margin-top: 30px;
        }
        
        .help-section h3 {
          color: #333;
          font-size: 16px;
          margin-top: 0;
          margin-bottom: 10px;
          font-weight: 600;
        }
        
        .help-section p {
          margin: 0;
          font-size: 14px;
          color: #666;
        }
        
        .help-section a {
          color: #5f33e1;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.3s;
        }
        
        .help-section a:hover {
          border-color: #5f33e1;
        }
        
        .divider {
          height: 1px;
          background-color: #eee;
          margin: 30px 0;
        }
        
        .footer {
          background-color: #f9f9f9;
          padding: 25px 40px;
          text-align: center;
        }
        
        .footer-links {
          margin-bottom: 20px;
        }
        
        .footer-links a {
          color: #5f33e1;
          text-decoration: none;
          margin: 0 10px;
          font-size: 14px;
          transition: color 0.3s;
        }
        
        .footer-links a:hover {
          color: #4d27c0;
        }
        
        .footer p {
          color: #888;
          font-size: 12px;
          margin: 5px 0;
        }
        
        @media screen and (max-width: 600px) {
          .header, .content, .footer {
            padding: 25px 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="email-container">
          <div class="header">
            <h1>¡Bienvenido a Flowtask!</h1>
          </div>
          
          <div class="welcome-banner">
            <h2>¡Hola ${name}!</h2>
          </div>
          
          <div class="content">
            <p class="intro">
              Tu cuenta ha sido creada exitosamente. Estamos encantados de tenerte como parte 
              de nuestra comunidad. Con Flowtask, podrás organizar tus tareas y eventos y aumentar 
              tu productividad de manera efectiva.
            </p>
            
            <div class="highlight">
              <p>
                <strong>Tu cuenta está lista para usar.</strong> Puedes acceder a todas las 
                funcionalidades de nuestra aplicación inmediatamente.
              </p>
            </div>
            
            <div class="divider"></div>
            
            <div class="help-section">
              <h3>¿Necesitas ayuda para comenzar?</h3>
              <p>
                Si tienes alguna pregunta o necesitas asistencia, visita nuestra 
                <a href="#">sección de ayuda</a> o contáctanos a través de 
                <a href="mailto:soporte@taskplanner.com">soporte@taskplanner.com</a>.
              </p>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-links">
              <a href="#">Sitio web</a>
              <a href="#">Política de privacidad</a>
              <a href="#">Términos de servicio</a>
            </div>
            <p>&copy; ${new Date().getFullYear()} Flowtask. Todos los derechos reservados.</p>
            <p style="font-size: 11px; color: #999; margin-top: 15px;">
              Este es un correo automático. Por favor no respondas a este mensaje.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Envía un correo electrónico genérico
 * @param {Object} data - Datos del correo
 * @param {string} data.name - Nombre del destinatario
 * @param {string} data.email - Email del destinatario
 * @param {string} data.message - Mensaje del correo
 * @returns {Promise<Object>} - Resultado del envío
 */

/**
 * Envía un correo de confirmación de registro
 * @param {Object} userData - Datos del usuario
 * @param {string} userData.name - Nombre del usuario
 * @param {string} userData.email - Email del usuario
 * @returns {Promise<Object>} - Resultado del envío
 */
const sendRegistrationConfirmation = async (userData) => {
  const { name, email } = userData
  const transporter = createTransporter()

  const mailOptions = {
    from: config.EMAIL_USER,
    to: email,
    subject: `¡Bienvenido/a ${name}! Confirmación de registro`,
    html: createRegistrationEmailHtml(name),
    text: `¡Hola ${name}!\n\nGracias por registrarte en nuestra plataforma. Tu cuenta ha sido creada exitosamente.\n\nAhora puedes acceder a todas las funcionalidades de nuestra aplicación.\n\nSi tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.\n\nSaludos,\nEl equipo.`,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    return { success: true, message: "Correo de confirmación enviado exitosamente." }
  } catch (error) {
    console.error("Error al enviar el email de confirmación:", error)
    return { success: false, error: "Error al enviar el correo de confirmación." }
  }
}


module.exports = {
  sendRegistrationConfirmation,
}
