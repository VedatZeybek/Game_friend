import { useState } from "react";
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
	  console.log("TokenNNNNNNNNNNNNNNN:", res.data.token);
      navigate("/dashboard");
    } catch (err) {
	  console.log("TokenNNNNNNNNNNNNNNN:", res.data.token);
      alert(err.response.data.error);
    }
  };

  return (
    <div>
      <form onSubmit={handleLogin}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Login</button>
      </form>

      <p>
       You Don't Have Account?<Link to="/register">Register</Link>
      </p>
    </div>
  );
}
