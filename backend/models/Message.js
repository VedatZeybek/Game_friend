import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // DM için
  content: { type: String, required: true },
  isPublic: { type: Boolean, default: false } // public chat için
}, { timestamps: true });

export default mongoose.model("Message", messageSchema);
