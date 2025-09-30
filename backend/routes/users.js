// backend/routes/users.js
import express from "express";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Arkadaş listesi
router.get("/friends", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id).populate("friends", "username email");
  res.json(user.friends);
});

// Arkadaş ekleme
router.post("/add-friend", authMiddleware, async (req, res) => {
  const { friendId } = req.body;
  const user = req.user;
  if (!user.friends.includes(friendId)) {
    user.friends.push(friendId);
    await user.save();
  }
  res.json({ message: "Friend added" });
});

export default router;
