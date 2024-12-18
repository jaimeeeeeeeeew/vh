import express from "express";
import { Server as SocketIO } from "socket.io";
import axios from "axios";

process.on("uncaughtException", (err) => {
  console.error("Unhandled Exception:", err);
});

const app = express();
app.use(express.json());

const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT } = process.env;

// Inicializa el servidor de socket
const server = app.listen(PORT || 3000, () => {
  console.log(`Server is listening on port: ${PORT || 3000}`);
});

const io = new SocketIO(server);

// Manejar conexiones de socket
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  // Manejar mensajes entrantes desde el cliente Python
  socket.on("message_from_python",(data) => {
    console.log("Mensaje desde Python:", data);
    // Aquí puedes realizar cualquier acción en respuesta al mensaje recibido desde Python
  });

  
  // Manejar desconexiones de socket
  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

// Endpoint para recibir mensajes desde el Webhook de WhatsApp
app.post("/webhook", (req, res) => {
  console.log("Incoming webhook message:", JSON.stringify(req.body, null, 2));
  
  // Verificar si la solicitud de webhook contiene un mensaje
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (message) {
    // Manejar el mensaje según su tipo
    if (message.type === "text") {
      io.emit("message_from_glitch", message);
    } else if (message.type === "button") {
      const payload = message.button.payload;
      const from = message.from;
      const timestamp = message.timestamp;
      console.log(`Payload del botón presionado: ${payload}`);
      io.emit("message_from_glitch", {
        from,
        type: "button",
        payload,
        timestamp,
      });
    }
  }

  res.sendStatus(200);
});

// Ruta de verificación para el webhook (GET /webhook)
app.get("/webhook",(req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    console.log("Webhook verified successfully!");
  } else {
    res.sendStatus(403);
  }
});

// Ruta principal para mostrar un mensaje básico
app.get("/", (req, res) => {
  res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});
