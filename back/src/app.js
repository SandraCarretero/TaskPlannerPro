const express = require("express");
const cors = require("cors");
const path = require("path");
const WebSocket = require("ws");
const http = require("http");

// Importar rutas
const authRoutes = require("./routes/auth.routes");
const taskRoutes = require("./routes/task.routes");
const eventRoutes = require("./routes/event.routes");
const photoRoutes = require("./routes/photo.routes");
const userRoutes = require("./routes/user.routes");

// Importar middlewares
const { errorHandler } = require("./middlewares/error.middleware");

// Inicializar Express
const app = express();
const server = http.createServer(app);

// Configurar WebSocket
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/uploads", express.static(path.join(__dirname, "../uploads")));

// WebSocket para comunicación en tiempo real
wss.on("connection", (ws) => {
  console.log("Cliente conectado a WebSocket");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log("Mensaje recibido:", data);

      // Broadcast a todos los clientes conectados
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    } catch (error) {
      console.error("Error al procesar mensaje WebSocket:", error);
    }
  });

  ws.on("close", () => {
    console.log("Cliente desconectado");
  });
});

// Rutas de la API
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/users", userRoutes);

// Middleware de manejo de errores
app.use(errorHandler);

// Exportar app y server para uso en server.js
module.exports = { app, server, wss };