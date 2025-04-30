const WebSocket = require("ws")

// Almacenar referencia al servidor WebSocket
let wss

// Inicializar el servidor WebSocket
exports.initWebSocket = (server) => {
  wss = new WebSocket.Server({ server })

  wss.on("connection", (ws) => {
    console.log("Cliente conectado a WebSocket")

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message)
        console.log("Mensaje recibido:", data)
      } catch (error) {
        console.error("Error al procesar mensaje WebSocket:", error)
      }
    })

    ws.on("close", () => {
      console.log("Cliente desconectado")
    })

    // Enviar mensaje de bienvenidav
    ws.send(
      JSON.stringify({
        type: "CONNECTED",
        payload: { message: "Conectado al servidor WebSocket" },
      }),
    )
  })

  return wss
}

// Enviar actualización a todos los clientes conectados
exports.broadcastUpdate = (data) => {
  if (!wss) {
    console.error("El servidor WebSocket no está inicializado")
    return
  }

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data))
    }
  })
}
