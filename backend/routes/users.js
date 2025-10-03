// backend/routes/users.js
import express from "express";
import User from "../models/User.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Return all users (for discovery) - minimal fields
router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}).select("username");
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Arkadaş listesi
router.get("/friends", authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id).populate("friends", "username email");
  res.json(user.friends);
});

// Me route - return current authenticated user
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("username email games friends").populate("friends", "username");
    // return explicit object to ensure _id is present on client
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      games: user.games || [],
      friends: user.friends || []
    });
  } catch (err) {
    console.error("Get /me error:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// Arkadaş ekleme
router.post("/add-friend", authMiddleware, async (req, res) => {
  const { friendId } = req.body;
  const user = req.user;
  if (!user.friends.includes(friendId)) {
    user.friends.push(friendId);
    await user.save();
  }
  try {
    const friend = await User.findById(friendId).select("username");
    res.json({ message: "Friend added", friend });
  } catch (err) {
    console.error("Add friend error:", err);
    res.status(500).json({ message: "Failed to add friend" });
  }
});

export default router;
