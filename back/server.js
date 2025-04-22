const app = require('./src/app');
const { connectDB } = require('./src/config/db');

const port = 3000; // Tendrá que depender de la variable de entorno

const startServer = async () => {
  try {
    // Conexión con la base de datos
    await connectDB();
    
    // Levantamos el servidor
    app.listen(port, () => {
      console.log(`Servidor corriendo en puerto ${port}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();