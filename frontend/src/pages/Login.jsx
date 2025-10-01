import { useState } from "react";
import "./Login.css"; // "./" eklendi
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      console.log("Token:", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      alert(err.response?.data?.error || "Giriş başarısız!");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Hoş Geldiniz</h1>
          <p className="login-subtitle">Hesabınıza giriş yapın</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-button">
            Giriş Yap
          </button>
        </form>

        <p className="register-link">
          Hesabınız yok mu?
          <Link to="/register">Kayıt Ol</Link>
        </p>
      </div>
    </div>
  );
}