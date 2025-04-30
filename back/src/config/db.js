const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb+srv://sandracarretero24:mongodb24@clustertrazos.hvsapqb.mongodb.net/taskplanner?retryWrites=true&w=majority&appName=ClusterTrazos'
    );
    console.log('Conexión a la base de datos establecida');
  } catch (error) {
    console.error('Error de conexión a MongoDB:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };