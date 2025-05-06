const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");

// Importar rutas
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const eventRoutes = require("./routes/eventRoutes");
const photoRoutes = require("./routes/avatarRoutes");
const userRoutes = require("./routes/userRoutes");
const emailRoutes = require("./routes/emailRoutes");
const chatRoutes = require("./routes/chatRoutes");

const websocketService = require("./services/websocketService");

// Importar middlewares
const { errorHandler } = require("./middlewares/errorMiddleware");

// Inicializar Express
const app = express();
const server = http.createServer(app);

const wss = websocketService.initWebSocket(server);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(express.static(path.join(__dirname, "../../fron")));

// Rutas de la API
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/users", userRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/chat', chatRoutes);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../front/index.html"));
});

// Middleware de manejo de errores
app.use(errorHandler);

// Exportar app y server para uso en server.js
module.exports = { app, server, wss };