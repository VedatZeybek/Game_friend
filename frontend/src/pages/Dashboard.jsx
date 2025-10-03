import { useEffect, useState, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";
import "./Dashboard.css";
import GamesSidebar from "./components/GameSideBar.jsx";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendId, setFriendId] = useState("");
  const [publicMessage, setPublicMessage] = useState("");
  const [dmMessage, setDmMessage] = useState("");
  const [gameMessage, setGameMessage] = useState("");

  const [publicMessages, setPublicMessages] = useState([]);
  const [dmMessages, setDmMessages] = useState([]);
  const [gameMessages, setGameMessages] = useState({});

  const [dmUser, setDmUser] = useState("");
  const [activeView, setActiveView] = useState("global");

  const [games, setGames] = useState([]);
  const [activeGame, setActiveGame] = useState(null);

  const socketRef = useRef(null);
  const publicMessagesEndRef = useRef(null);
  const dmMessagesEndRef = useRef(null);
  const gameMessagesEndRef = useRef(null);

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  const getUserId = () => user?._id || user?.id || user?.userId || "";

  const scrollToBottom = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showProfile && profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfile]);

  useEffect(() => {
    publicMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [publicMessages]);

  useEffect(() => {
    dmMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmMessages]);

  useEffect(() => {
    gameMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeGame, gameMessages]);

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
      socketRef.current?.disconnect();
    };
  }, [token, navigate]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRes = await axios.get("http://localhost:5000/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(userRes.data);

        const friendsRes = await axios.get(
          "http://localhost:5000/api/users/friends",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setFriends(friendsRes.data);
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        }
      }
    };

    if (token) fetchUserData();
  }, [token, navigate]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const publicRes = await axios.get(
          "http://localhost:5000/api/messages/public",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPublicMessages(publicRes.data);

        if (dmUser) {
          const dmRes = await axios.get(
            `http://localhost:5000/api/messages/dm/${dmUser}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setDmMessages(dmRes.data);
        }

        if (activeGame) {
          const gameRes = await axios.get(
            `http://localhost:5000/api/messages/game/${activeGame.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setGameMessages((prev) => ({
            ...prev,
            [activeGame.id]: gameRes.data,
          }));
        }
      } catch (err) {
        console.error("Messages fetch error:", err);
      }
    };

    if (token) fetchMessages();
  }, [token, dmUser, activeGame]);

  useEffect(() => {
    if (!socketRef.current) return;

    const handleReceiveMessage = (msg) => {
      if (msg.isPublic) {
        setPublicMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      } else if (msg.receiverId === dmUser || msg.sender._id === dmUser) {
        setDmMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      } else if (msg.isGame && activeGame?.id === msg.gameId) {
        setGameMessages((prev) => ({
          ...prev,
          [activeGame.id]: [...(prev[activeGame.id] || []), msg],
        }));
      }
    };

    socketRef.current.on("receiveMessage", handleReceiveMessage);

    return () => {
      socketRef.current?.off("receiveMessage", handleReceiveMessage);
    };
  }, [dmUser, activeGame]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    socketRef.current?.disconnect();
    navigate("/login");
  };

  const handleSendPublic = async (e) => {
    e.preventDefault();
    if (!publicMessage.trim()) return;

    const msgData = { content: publicMessage.trim(), receiverId: null, isPublic: true };

    try {
      const res = await axios.post(
        "http://localhost:5000/api/messages/send",
        msgData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPublicMessages((prev) => [...prev, res.data]);
      socketRef.current?.emit("sendMessage", res.data);
      setPublicMessage("");
      setTimeout(() => scrollToBottom(publicMessagesEndRef), 100);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendDM = async (e) => {
    e.preventDefault();
    if (!dmMessage.trim() || !dmUser) return;

    const msgData = { content: dmMessage.trim(), receiverId: dmUser, isPublic: false };

    try {
      const res = await axios.post(
        "http://localhost:5000/api/messages/send",
        msgData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDmMessages((prev) => [...prev, res.data]);
      socketRef.current?.emit("sendMessage", res.data);
      setDmMessage("");
      setTimeout(() => scrollToBottom(dmMessagesEndRef), 100);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendGameMessage = async (e) => {
    e.preventDefault();
    if (!gameMessage.trim() || !activeGame) return;

    const msgData = {
      content: gameMessage.trim(),
      receiverId: null,
      gameId: activeGame.id,
      isGame: true,
      isPublic: false,
    };

    try {
      const res = await axios.post(
        "http://localhost:5000/api/messages/send",
        msgData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGameMessages((prev) => ({
        ...prev,
        [activeGame.id]: [...(prev[activeGame.id] || []), res.data],
      }));
      socketRef.current?.emit("sendMessage", res.data);
      setGameMessage("");
      setTimeout(() => scrollToBottom(gameMessagesEndRef), 100);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!friendId.trim()) return;

    try {
      const res = await axios.post(
        "http://localhost:5000/api/users/add-friend",
        { friendId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFriends((prev) => [...prev, res.data.friend]);
      setFriendId("");
    } catch (err) {
      console.error(err);
    }
  };

    const [discoveredUsers, setDiscoveredUsers] = useState([]);
    const [userSearch, setUserSearch] = useState("");
    const [toast, setToast] = useState("");

    const fetchAllUsers = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/users", { headers: { Authorization: `Bearer ${token}` } });
        setDiscoveredUsers(res.data.filter(u => u._id !== getUserId()));
      } catch (err) {
        console.error("Fetch users error:", err);
      }
    };

  const handleSelectDM = (friend) => {
    setDmUser(friend._id);
    setDmMessages([]);
    setActiveView("dm");
  };

  const handleSelectGlobal = () => {
    setActiveView("global");
    // ensure activeGame is cleared so games view isn't shown
    setActiveGame(null);
    // scroll to bottom of public messages after view switches
    setTimeout(() => scrollToBottom(publicMessagesEndRef), 100);
  };

  const handleOpenGames = () => {
    // when opening games, show the games browser (clear any activeGame)
    setActiveGame(null);
    setActiveView("games");
  };

  const handleSelectGame = (game) => {
    setActiveGame(game);
    setActiveView("games");
  };

// Fetch games from RAWG API
  // games are now fetched by GamesSidebar; `onGamesLoaded` will populate `games`


  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>GameChat</h1>
          <div className="user-info">
            <span className="user-status"></span>
            <span style={{display:'flex', flexDirection:'column'}}>
              <span>{user?.username || "User"}</span>
              <span style={{fontSize:12, color:'#9ca3af'}}>{getUserId() ? `ID: ${getUserId()}` : ''}</span>
            </span>
          </div>
        </div>

        <div className="sidebar-menu">
          <div
            className={`menu-item ${activeView === "global" ? "active" : ""}`}
            onClick={handleSelectGlobal}
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

          <div
            className={`menu-item ${activeView === "games" ? "active" : ""}`}
            onClick={handleOpenGames}
          >
            <span className="menu-icon">🎮</span>
            <span>Games</span>
          </div>

          {dmUser && (
            <div
              className={`menu-item ${activeView === "dm" ? "active" : ""}`}
              onClick={() => setActiveView("dm")}
            >
              <span className="menu-icon">💬</span>
              <span>DM: {friends.find((f) => f._id === dmUser)?.username}</span>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="content-header">
          <div className="content-header-inner">
            <h2>
            {activeView === "global"
              ? "🌍 Global Chat"
              : activeView === "friends"
              ? "👥 Friends & Add Friends"
              : activeView === "dm"
              ? `💬 DM with ${friends.find((f) => f._id === dmUser)?.username}`
              : activeView === "games" && activeGame
              ? `🎮 ${activeGame?.name} Chat`
              : "🎮 Games"}
            </h2>
            <div>
              <div style={{position: 'relative'}} ref={profileRef}>
                <button
                  className="profile-btn"
                  onClick={() => setShowProfile((s) => !s)}
                  title="Profile"
                >
                  <span className="profile-avatar">
                    {user?.username ? user.username.charAt(0).toUpperCase() : "U"}
                  </span>
                  <span style={{fontWeight: 600}}>{user?.username || "User"}</span>
                </button>
                {showProfile && (
                  <div className="profile-panel">
                    <div className="profile-large">
                      <div className="avatar-lg">
                        {user?.username ? user.username.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <p style={{margin:0, fontWeight:700}}>{user?.username || "User"}</p>
                        <p style={{margin:0, color:'#9ca3af', fontSize:12}}>ID: {user?._id || "-"}</p>
                      </div>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                      <button
                        className="copy-btn"
                        onClick={() => {
                          const uid = getUserId();
                          if (uid) navigator.clipboard.writeText(uid);
                        }}
                      >
                        Copy ID
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="content-body">
          {activeView === "global" && (
            <div className="chat-container">
              <div className="messages-area">
                {publicMessages.length === 0 ? (
                  <p className="empty">No messages yet. Start chatting!</p>
                ) : (
                  <>
                    {publicMessages.map((m) => (
                      <div key={m._id} className="message">
                        <b>{m.sender?.username || "Unknown"}:</b> {m.content}
                      </div>
                    ))}
                    <div ref={publicMessagesEndRef} />
                  </>
                )}
              </div>
              <div className="message-input-container">
                <form className="message-input-form" onSubmit={handleSendPublic}>
                  <input
                    value={publicMessage}
                    onChange={(e) => setPublicMessage(e.target.value)}
                    placeholder="Type your message..."
                  />
                  <button type="submit" className="send-btn">Send</button>
                </form>
              </div>
            </div>
          )}

          {activeView === "friends" && (
            <div className="friends-container">
              <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginBottom:12}}>
                <button className="send-btn" onClick={fetchAllUsers}>Discover Users</button>
              </div>
              <div className="add-friend-form">
                <input
                  type="text"
                  placeholder="Enter Friend ID"
                  value={friendId}
                  onChange={(e) => setFriendId(e.target.value)}
                />
                <button onClick={handleAddFriend}>Add Friend</button>
              </div>
              {discoveredUsers.length > 0 && (
                <div style={{marginTop:12}}>
                  <h4 style={{color:'#d1d5db'}}>Discovered Users</h4>
                  <div style={{margin:'8px 0 12px 0', display:'flex', gap:8}}>
                    <input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{flex:1, padding:8, borderRadius:8, border:'1px solid rgba(138,43,226,0.12)', background:'rgba(30,30,45,0.4)', color:'#fff'}}/>
                  </div>
                  <ul style={{listStyle:'none', padding:0, marginTop:8}}>
                    {discoveredUsers.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                      <li key={u._id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'rgba(45,45,60,0.4)', borderRadius:8, marginBottom:8}}>
                        <div>
                          <div style={{fontWeight:700}}>{u.username}</div>
                          <div style={{fontSize:12, color:'#9ca3af'}}>ID: {u._id}</div>
                        </div>
                          <div style={{display:'flex', gap:8}}>
                          <button className="copy-btn" onClick={() => navigator.clipboard.writeText(u._id)}>Copy ID</button>
                          <button className="send-btn" onClick={async () => {
                            try {
                              const res = await axios.post("http://localhost:5000/api/users/add-friend", { friendId: u._id }, { headers: { Authorization: `Bearer ${token}` } });
                              // add to local friends list
                              setFriends(prev => [...prev, res.data.friend]);
                              setToast(`${u.username} added as friend`);
                              setTimeout(() => setToast(''), 3000);
                            } catch (err) { console.error(err); }
                          }}>Add</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {toast && <div className="toast">{toast}</div>}
              <ul className="friends-list">
                {friends.length === 0 ? (
                  <li className="empty">No friends yet. Add some friends!</li>
                ) : (
                  friends.map((f) => (
                    <li
                      key={f._id}
                      className={`friend-card ${dmUser === f._id ? "active" : ""}`}
                      onClick={() => handleSelectDM(f)}
                    >
                      <div className="friend-name">👤 {f.username}</div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

          {activeView === "dm" && (
            <div className="chat-container">
              <div className="messages-area">
                {!dmUser ? (
                  <p className="empty">Select a friend to start chatting</p>
                ) : dmMessages.length === 0 ? (
                  <p className="empty">No messages yet. Start a conversation!</p>
                ) : (
                  <>
                    {dmMessages.map((m) => (
                      <div key={m._id} className="message">
                        <b>{m.sender?.username || "Unknown"}:</b> {m.content}
                      </div>
                    ))}
                    <div ref={dmMessagesEndRef} />
                  </>
                )}
              </div>
              <div className="message-input-container">
                <form className="message-input-form" onSubmit={handleSendDM}>
                  <input
                    value={dmMessage}
                    onChange={(e) => setDmMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={!dmUser}
                  />
                  <button type="submit" disabled={!dmUser}>Send</button>
                </form>
              </div>
            </div>
          )}

      {activeView === "games" && !activeGame && (
        <GamesSidebar
          onSelectGame={(g) => {
            setActiveGame(g);
            setActiveView("games");
          }}
          onGamesLoaded={(results) => setGames(results)}
        />
      )}

          {activeView === "games" && activeGame && (
            <div className="chat-container">
              <div className="messages-area">
                {(gameMessages[activeGame.id] || []).length === 0 ? (
                  <p className="empty">No messages yet. Start chatting!</p>
                ) : (
                  <>
                    {gameMessages[activeGame.id].map((m) => (
                      <div key={m._id} className="message">
                        <b>{m.sender?.username || "Unknown"}:</b> {m.content}
                      </div>
                    ))}
                    <div ref={gameMessagesEndRef} />
                  </>
                )}
              </div>
              <div className="message-input-container">
                <form className="message-input-form" onSubmit={handleSendGameMessage}>
                  <input
                    value={gameMessage}
                    onChange={(e) => setGameMessage(e.target.value)}
                    placeholder={`Message in ${activeGame.name} chat...`}
                  />
                  <button type="submit">Send</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}