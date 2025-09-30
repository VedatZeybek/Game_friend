import axios from "axios";

const BASE_URL = "http://localhost:5000/api/messages";

// Tüm mesajları çek
export const fetchMessages = async () => {
  const token = localStorage.getItem("token");
  const res = await axios.get(BASE_URL, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data; // mesaj listesi
};

// Yeni mesaj gönder
export const sendMessage = async (content, toUserId) => {
  const token = localStorage.getItem("token");
  const res = await axios.post(BASE_URL, { content, to: toUserId }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
};
