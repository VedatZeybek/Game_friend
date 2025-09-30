import { useEffect, useState, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendId, setFriendId] = useState("");
  const [publicMessage, setPublicMessage] = useState("");
  const [dmMessage, setDmMessage] = useState("");

  const [publicMessages, setPublicMessages] = useState([]);
  const [dmMessages, setDmMessages] = useState([]);

  const [dmUser, setDmUser] = useState("");

  const socketRef = useRef(null);
  const publicMessagesEndRef = useRef(null);
  const dmMessagesEndRef = useRef(null);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // Otomatik scroll fonksiyonu
  const scrollToBottom = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom(publicMessagesEndRef);
  }, [publicMessages]);

  useEffect(() => {
    scrollToBottom(dmMessagesEndRef);
  }, [dmMessages]);

  // Socket bağlantısı
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    // Socket bağlantısı kur
    socketRef.current = io("http://localhost:5000", {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current.on("connect", () => {
      console.log("Socket connected:", socketRef.current.id);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, navigate]);

  // Kullanıcı bilgilerini ve arkadaşları yükle
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRes = await axios.get("http://localhost:5000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(userRes.data);

        const friendsRes = await axios.get("http://localhost:5000/api/users/friends", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFriends(friendsRes.data);
      } catch (err) {
        console.error("User data fetch error:", err);
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        }
      }
    };

    if (token) {
      fetchUserData();
    } else {
      navigate("/login");
    }
  }, [token, navigate]);

  // Mesajları yükle
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        // Public mesajları al
        const publicRes = await axios.get("http://localhost:5000/api/messages/public", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPublicMessages(publicRes.data);

        // DM mesajları al (eğer DM kullanıcısı seçiliyse)
        if (dmUser) {
          const dmRes = await axios.get(`http://localhost:5000/api/messages/dm/${dmUser}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setDmMessages(dmRes.data);
        }
      } catch (err) {
        console.error("Messages fetch error:", err);
      }
    };

    if (token) {
      fetchMessages();
    }
  }, [token, dmUser]);

  // Socket.io mesaj dinleme
  useEffect(() => {
    if (!socketRef.current) return;

    const handleReceiveMessage = (msg) => {
      console.log("Received message:", msg);
      
      if (msg.isPublic) {
        setPublicMessages((prev) => {
          // Aynı mesajın tekrar eklenmesini engelle
          const exists = prev.some(m => m._id === msg._id);
          if (exists) return prev;
          return [...prev, msg];
        });
      } else {
        // DM mesajları - gönderen veya alıcı aktif kullanıcıysa göster
        if ((msg.sender._id === dmUser || msg.sender._id === user?._id) && 
            (msg.receiverId === dmUser || msg.receiverId === user?._id)) {
          setDmMessages((prev) => {
            const exists = prev.some(m => m._id === msg._id);
            if (exists) return prev;
            return [...prev, msg];
          });
        }
      }
    };

    socketRef.current.on("receiveMessage", handleReceiveMessage);

    return () => {
      socketRef.current?.off("receiveMessage", handleReceiveMessage);
    };
  }, [dmUser, user]);

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    navigate("/login");
  };

  // Public mesaj gönderme
  const handleSendPublic = async (e) => {
    e.preventDefault();
    if (!publicMessage.trim()) return;

    const msgData = {
      content: publicMessage.trim(),
      receiverId: null,
      isPublic: true,
    };

    try {
      const response = await axios.post("http://localhost:5000/api/messages/send", msgData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log("Public message sent:", response.data);
      
      // Mesajı hemen ekle
      setPublicMessages((prev) => [...prev, response.data]);
      
      // Socket'e gönder
      if (socketRef.current) {
        socketRef.current.emit("sendMessage", response.data);
      }
      
      setPublicMessage("");
    } catch (err) {
      console.error("Send public message error:", err);
      alert("Mesaj gönderilemedi! " + (err.response?.data?.message || err.message));
    }
  };

  // DM mesaj gönderme
  const handleSendDM = async (e) => {
    e.preventDefault();
    if (!dmMessage.trim() || !dmUser) return;

    const msgData = {
      content: dmMessage.trim(),
      receiverId: dmUser,
      isPublic: false,
    };

    try {
      const response = await axios.post("http://localhost:5000/api/messages/send", msgData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log("DM sent:", response.data);
      
      // Mesajı hemen ekle
      setDmMessages((prev) => [...prev, response.data]);
      
      // Socket'e gönder
      if (socketRef.current) {
        socketRef.current.emit("sendMessage", response.data);
      }
      setDmMessage("");
    } catch (err) {
      console.error("Send DM error:", err);
      alert("Mesaj gönderilemedi! " + (err.response?.data?.message || err.message));
    }
  };

  // Arkadaş ekleme
  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!friendId.trim()) return;

    try {
      const response = await axios.post(
        "http://localhost:5000/api/users/add-friend",
        { friendId: friendId.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setFriends((prev) => [...prev, response.data.friend]);
      setFriendId("");
      alert("Arkadaş eklendi!");
    } catch (err) {
      console.error("Add friend error:", err);
      alert(err.response?.data?.message || "Arkadaş eklenemedi!");
    }
  };

  // DM kullanıcısı seçme
  const handleSelectDM = (friend) => {
    setDmUser(friend._id);
    setDmMessages([]); // Önceki mesajları temizle
  };

  // Enter tuşu ile mesaj gönderme
  const handleKeyPress = (e, callback) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      callback(e);
    }
  };

  return (
    <div className="dashboard">
      {/* Üst bar */}
      <div className="dashboard-header">
        <h1>Welcome {user?.username || "User"}</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Quit
        </button>
      </div>

      {/* İçerik */}
      <div className="dashboard-content">
        {/* Arkadaş Listesi */}
        <div className="card">
          <h2>Friends</h2>
          <ul className="friends-list">
            {friends.length === 0 ? (
              <li className="empty">No friends yet</li>
            ) : (
              friends.map((f) => (
                <li
                  key={f._id}
                  className={dmUser === f._id ? "active" : ""}
                  onClick={() => handleSelectDM(f)}
                >
                  {f.username}
                </li>
              ))
            )}
          </ul>
          <form onSubmit={handleAddFriend} style={{ marginTop: "1rem" }}>
            <input
              type="text"
              placeholder="Friend ID"
              value={friendId}
              onChange={(e) => setFriendId(e.target.value)}
            />
            <button type="submit">Add Friend</button>
          </form>
        </div>

        {/* Public Chat */}
        <div className="card">
          <h2>Public Chat</h2>
          <div className="messages-box">
            {publicMessages.length === 0 ? (
              <p className="empty">No messages yet</p>
            ) : (
              <>
                {publicMessages.map((m, i) => (
                  <div key={m._id || i} className="message">
                    <b>{m.sender?.username || "Unknown"}:</b> {m.content}
                  </div>
                ))}
                <div ref={publicMessagesEndRef} />
              </>
            )}
          </div>
          <form onSubmit={handleSendPublic} className="message-input">
            <input
              value={publicMessage}
              onChange={(e) => setPublicMessage(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, handleSendPublic)}
              placeholder="Type a message"
            />
            <button type="submit">Send</button>
          </form>
        </div>

        {/* DM Chat */}
        <div className="card">
          <h2>
            DM Chat{" "}
            {dmUser && `(with ${friends.find((f) => f._id === dmUser)?.username})`}
          </h2>
          <div className="messages-box">
            {!dmUser ? (
              <p className="empty">Select a friend to start chatting</p>
            ) : dmMessages.length === 0 ? (
              <p className="empty">No messages yet</p>
            ) : (
              <>
                {dmMessages.map((m, i) => (
                  <div key={m._id || i} className="message">
                    <b>{m.sender.username}:</b> {m.content}
                  </div>
                ))}
                <div ref={dmMessagesEndRef} />
              </>
            )}
          </div>
          <form onSubmit={handleSendDM} className="message-input">
            <input
              value={dmMessage}
              onChange={(e) => setDmMessage(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, handleSendDM)}
              placeholder="Type a message"
              disabled={!dmUser}
            />
            <button type="submit" disabled={!dmUser}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}