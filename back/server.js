require('dotenv').config();
const { server } = require("./src/app");
const { connectDB } = require('./src/config/db');

// Configuración de puerto
const PORT = process.env.PORT || 3000;

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Conexión a MongoDB usando la función de config/db.js
    await connectDB();
    
    // Iniciar servidor
    server.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  }
};

// Iniciar el servidor
startServer();

// Manejar errores no capturados
process.on("unhandledRejection", (err) => {
  console.error("Error no manejado:", err);
  server.close(() => {
    process.exit(1);
  });
});