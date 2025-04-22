const express = require('express');

// const userRoutes = require('./routes/userRoutes');
// const productRoutes = require('./routes/productRoutes');

// const notFoundMiddleware = require('./middlewares/notFoundMiddleware');
// const flowControlMiddleware = require('./middlewares/flowControlMiddleware');
// const errorHandlerMiddleware = require('./middlewares/errorHandlerMiddleware');

const cors = require('cors');
const app = express();

// Middleware para parsear JSON
// app.use(express.json());

// Evitar conflictos CORS
// app.use(cors());

// Montamos rutas en diferentes paths base
// app.use('/users', userRoutes);
// app.use('/products', productRoutes);

// Manejador de rutas no encontradas
// app.use(notFoundMiddleware);
// app.use(flowControlMiddleware);
// app.use(errorHandlerMiddleware);

module.exports = app;
