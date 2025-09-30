// backend/routes/messages.js
import express from "express";
import Message from "../models/Message.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Public chat mesajları
router.get("/public", authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({ isPublic: true })
      .populate("sender", "username")
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error("Public messages fetch error:", err);
    res.status(500).json({ message: "Failed to fetch public messages" });
  }
});

// DM mesajları
router.get("/dm/:userId", authMiddleware, async (req, res) => {
  const { userId } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    })
      .populate("sender", "username")
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error("DM messages fetch error:", err);
    res.status(500).json({ message: "Failed to fetch DM messages" });
  }
});

// Mesaj gönderme (public veya DM)
router.post("/send", authMiddleware, async (req, res) => {
  const { content, receiverId, isPublic } = req.body;

  try {
    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId || null,
      content,
      isPublic: isPublic || false
    });

    // sender bilgisi ile populate et
    await message.populate("sender", "username");

    res.json(message);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
});

export default router;
