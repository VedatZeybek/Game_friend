import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // receiver holds user id for DMs. For game chats we store gameId string in `gameId`.
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // DM için
  gameId: { type: String }, // oyun sohbetleri için (RAWG id veya başka string)
  content: { type: String, required: true },
  isPublic: { type: Boolean, default: false }, // public chat için
  isGame: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Message", messageSchema);
