const jwt = require("jsonwebtoken")
const User = require("../models/userModel")
const { sendWelcomeEmail } = require("../services/emailService")
const { AppError } = require("../utils/errorUtil")

// Clave secreta para JWT
const JWT_SECRET = process.env.JWT_SECRET || "taskplanner-secret-key"

// Controlador para registro de usuarios
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      throw new AppError("El email ya está registrado", 400)
    }

    // Crear nuevo usuario
    const user = new User({
      name,
      email,
      password,
    })

    await user.save()

    // Enviar email de bienvenida
    await sendWelcomeEmail(user.email, user.name)

    // Generar token JWT
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" })

    res.status(201).json({
      status: "success",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// Controlador para login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Verificar si el usuario existe
    const user = await User.findOne({ email })
    if (!user) {
      throw new AppError("Credenciales inválidas", 401)
    }

    // Verificar contraseña
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      throw new AppError("Credenciales inválidas", 401)
    }

    // Generar token JWT
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" })

    res.status(200).json({
      status: "success",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

// Controlador para obtener el usuario actual
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password")

    if (!user) {
      throw new AppError("Usuario no encontrado", 404)
    }

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    })
  } catch (error) {
    next(error)
  }
}
