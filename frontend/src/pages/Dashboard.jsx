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
  const [activeView, setActiveView] = useState("global"); // "global" or "friends"

  const socketRef = useRef(null);
  const publicMessagesEndRef = useRef(null);
  const dmMessagesEndRef = useRef(null);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // Manuel scroll fonksiyonu - sadece kullanıcı mesaj gönderdiğinde
  const scrollToBottom = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Yeni mesaj geldiğinde otomatik scroll YOK - kullanıcı istediği yerde kalabilir

  // Socket bağlantısı
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    socketRef.current = io("http://localhost:5000", {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current.on("connect", () => {
      console.log("Socket connected:", socketRef.current.id);
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

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

        const friendsRes = await axios.get(
          "http://localhost:5000/api/users/friends",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
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
        const publicRes = await axios.get(
          "http://localhost:5000/api/messages/public",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setPublicMessages(publicRes.data);

        if (dmUser) {
          const dmRes = await axios.get(
            `http://localhost:5000/api/messages/dm/${dmUser}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
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
          const exists = prev.some((m) => m._id === msg._id);
          if (exists) return prev;
          return [...prev, msg];
        });
      } else {
        if (
          (msg.sender._id === dmUser || msg.sender._id === user?._id) &&
          (msg.receiverId === dmUser || msg.receiverId === user?._id)
        ) {
          setDmMessages((prev) => {
            const exists = prev.some((m) => m._id === msg._id);
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
      const response = await axios.post(
        "http://localhost:5000/api/messages/send",
        msgData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Public message sent:", response.data);
      setPublicMessages((prev) => [...prev, response.data]);

      if (socketRef.current) {
        socketRef.current.emit("sendMessage", response.data);
      }

      setPublicMessage("");
      
      // Sadece kendi mesajını gönderince scroll yap
      setTimeout(() => scrollToBottom(publicMessagesEndRef), 100);
    } catch (err) {
      console.error("Send public message error:", err);
      alert(
        "Mesaj gönderilemedi! " + (err.response?.data?.message || err.message)
      );
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
      const response = await axios.post(
        "http://localhost:5000/api/messages/send",
        msgData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("DM sent:", response.data);
      setDmMessages((prev) => [...prev, response.data]);

      if (socketRef.current) {
        socketRef.current.emit("sendMessage", response.data);
      }
      setDmMessage("");
      
      // Sadece kendi mesajını gönderince scroll yap
      setTimeout(() => scrollToBottom(dmMessagesEndRef), 100);
    } catch (err) {
      console.error("Send DM error:", err);
      alert(
        "Mesaj gönderilemedi! " + (err.response?.data?.message || err.message)
      );
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
    setDmMessages([]);
    setActiveView("global");
  };

  // Enter tuşu ile mesaj gönderme
  const handleKeyPress = (e, callback) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      callback(e);
    }
  };

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>GameChat</h1>
          <div className="user-info">
            <span className="user-status"></span>
            <span>{user?.username || "User"}</span>
          </div>
        </div>

        <div className="sidebar-menu">
          <div
            className={`menu-item ${activeView === "global" ? "active" : ""}`}
            onClick={() => setActiveView("global")}
          >
            <span className="menu-icon">🌍</span>
            <span>Global Chat</span>
          </div>
          <div
            className={`menu-item ${activeView === "friends" ? "active" : ""}`}
            onClick={() => setActiveView("friends")}
          >
            <span className="menu-icon">👥</span>
            <span>Friends</span>
          </div>
          {dmUser && (
            <div
              className={`menu-item ${activeView === "dm" ? "active" : ""}`}
              onClick={() => setActiveView("dm")}
            >
              <span className="menu-icon">💬</span>
              <span>
                DM: {friends.find((f) => f._id === dmUser)?.username}
              </span>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-header">
          <h2>
            {activeView === "global"
              ? "🌍 Global Chat"
              : activeView === "friends"
              ? "👥 Friends & Add Friends"
              : `💬 DM with ${
                  friends.find((f) => f._id === dmUser)?.username
                }`}
          </h2>
        </div>

        <div className="content-body">
          {/* Global Chat View */}
          {activeView === "global" && (
            <div className="chat-container">
              <div className="messages-area">
                {publicMessages.length === 0 ? (
                  <p className="empty">No messages yet. Start chatting!</p>
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
              <div className="message-input-container">
                <form
                  onSubmit={handleSendPublic}
                  className="message-input-form"
                >
                  <input
                    value={publicMessage}
                    onChange={(e) => setPublicMessage(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleSendPublic)}
                    placeholder="Type your message..."
                  />
                  <button type="submit" className="send-btn">
                    Send
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Friends View */}
          {activeView === "friends" && (
            <div className="friends-container">
              <div className="add-friend-form">
                <input
                  type="text"
                  placeholder="Enter Friend ID"
                  value={friendId}
                  onChange={(e) => setFriendId(e.target.value)}
                />
                <button onClick={handleAddFriend}>Add Friend</button>
              </div>

              <ul className="friends-list">
                {friends.length === 0 ? (
                  <li className="empty">No friends yet. Add some friends!</li>
                ) : (
                  friends.map((f) => (
                    <li
                      key={f._id}
                      className={`friend-card ${
                        dmUser === f._id ? "active" : ""
                      }`}
                      onClick={() => handleSelectDM(f)}
                    >
                      <div className="friend-name">👤 {f.username}</div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {/* DM Chat View */}
          {activeView === "dm" && (
            <div className="chat-container">
              <div className="messages-area">
                {!dmUser ? (
                  <p className="empty">Select a friend to start chatting</p>
                ) : dmMessages.length === 0 ? (
                  <p className="empty">
                    No messages yet. Start a conversation!
                  </p>
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
              <div className="message-input-container">
                <form onSubmit={handleSendDM} className="message-input-form">
                  <input
                    value={dmMessage}
                    onChange={(e) => setDmMessage(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, handleSendDM)}
                    placeholder="Type your message..."
                    disabled={!dmUser}
                  />
                  <button type="submit" className="send-btn" disabled={!dmUser}>
                    Send
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}