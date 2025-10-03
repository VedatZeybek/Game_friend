import { useEffect, useState, useRef } from "react";
import axios from "axios";
import "../pages/Dashboard.css"; // reuse styles

export default function ProfileButton() {
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) return;
      try {
        const res = await axios.get("http://localhost:5000/api/users/me", { headers: { Authorization: `Bearer ${token}` } });
        setUser(res.data);
      } catch (err) {
        // ignore
      }
    };
    fetchUser();
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showProfile && profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfile]);

  const getUserId = () => user?._id || user?.id || user?.userId || "";

  return (
    <div className="profile-container" ref={profileRef}>
      <button className="profile-btn" onClick={() => setShowProfile(s => !s)}>
        <span className="profile-avatar">{user?.username ? user.username.charAt(0).toUpperCase() : "U"}</span>
        <span style={{fontWeight:600}}>{user?.username || "User"}</span>
      </button>
      {showProfile && (
        <div className="profile-panel">
          <div className="profile-large">
            <div className="avatar-lg">{user?.username ? user.username.charAt(0).toUpperCase() : "U"}</div>
            <div>
              <p style={{margin:0, fontWeight:700}}>{user?.username || "User"}</p>
              <p style={{margin:0, color:'#9ca3af', fontSize:12}}>ID: {getUserId() || "-"}</p>
            </div>
          </div>
          <div style={{display:'flex', justifyContent:'flex-end'}}>
            <button className="copy-btn" onClick={() => { const uid = getUserId(); if (uid) navigator.clipboard.writeText(uid); }}>Copy ID</button>
          </div>
        </div>
      )}
    </div>
  );
}
