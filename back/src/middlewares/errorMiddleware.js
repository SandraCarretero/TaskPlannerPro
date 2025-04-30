// Middleware para manejar errores
exports.errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500
    err.status = err.status || "error"
  
    // Errores de desarrollo
    if (process.env.NODE_ENV === "development") {
      return res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
      })
    }
  
    // Errores de producción
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      })
    }
  
    // Errores de programación u otros errores desconocidos
    console.error("ERROR 💥", err)
    return res.status(500).json({
      status: "error",
      message: "Algo salió mal",
    })
  }
  