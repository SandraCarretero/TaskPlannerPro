const nodemailer = require("nodemailer")

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || "taskplanner@example.com", // Reemplazar con email real
    pass: process.env.EMAIL_PASS || "password123", // Reemplazar con contraseña real
  },
})

// Enviar email de bienvenida
exports.sendWelcomeEmail = async (email, name) => {
  try {
    const mailOptions = {
      from: '"Task Planner" <taskplanner@example.com>',
      to: email,
      subject: "¡Bienvenido a Task Planner!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="cid:logo" alt="Task Planner Logo" style="width: 100px; height: auto;">
          </div>
          <h1 style="color: #333; text-align: center;">¡Bienvenido a Task Planner!</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">Hola ${name},</p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">Gracias por registrarte en Task Planner. Estamos emocionados de tenerte como parte de nuestra comunidad.</p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">Con Task Planner, podrás:</p>
          <ul style="color: #666; font-size: 16px; line-height: 1.5;">
            <li>Organizar tus tareas diarias</li>
            <li>Programar eventos importantes</li>
            <li>Mantener un seguimiento de tus actividades</li>
            <li>¡Y mucho más!</li>
          </ul>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5000"}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Comenzar ahora</a>
          </div>
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    console.log(`Email de bienvenida enviado a ${email}`)
  } catch (error) {
    console.error("Error al enviar email de bienvenida:", error)
  }
}
