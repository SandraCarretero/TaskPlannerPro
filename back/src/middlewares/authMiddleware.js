const jwt = require("jsonwebtoken")
const { promisify } = require("util")
const User = require("../models/userModel")
const { AppError } = require("../utils/errorUtil")

// Clave secreta para JWT
const JWT_SECRET = process.env.JWT_SECRET || "taskplanner-secret-key"

// Middleware para proteger rutas
exports.protect = async (req, res, next) => {
  try {
    let token

    // Obtener token del header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1]
    }

    if (!token) {
      throw new AppError("No has iniciado sesión. Por favor, inicia sesión para acceder", 401)
    }

    // Verificar token
    const decoded = await promisify(jwt.verify)(token, JWT_SECRET)

    // Verificar si el usuario existe
    const user = await User.findById(decoded.id)
    if (!user) {
      throw new AppError("El usuario al que pertenece este token ya no existe", 401)
    }

    // Guardar usuario en req para uso posterior
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
    }

    next()
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return next(new AppError("Token inválido. Por favor, inicia sesión de nuevo", 401))
    }
    if (error.name === "TokenExpiredError") {
      return next(new AppError("Tu sesión ha expirado. Por favor, inicia sesión de nuevo", 401))
    }
    next(error)
  }
}

// Middleware para restringir acceso según rol
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError("No tienes permiso para realizar esta acción", 403))
    }
    next()
  }
}
