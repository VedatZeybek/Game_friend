// backend/server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

// Route’ları import et
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import messageRoutes from "./routes/messages.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// MongoDB Bağlantısı
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

// HTTP server + Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" } // frontend’in çalıştığı port izinli olmalı
});

io.on("connection", (socket) => {
  console.log("New client connected");

  // DM odalarına katılma
  socket.on("joinDM", (userId) => {
    socket.join(userId);
  });

  // Mesaj gönderme
  socket.on("sendMessage", (msg) => {
    if (msg.isPublic) {
      io.emit("receiveMessage", msg); // public chat
    } else {
      socket.to(msg.receiver).emit("receiveMessage", msg); // DM
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// HTTP server’ı dinle
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
