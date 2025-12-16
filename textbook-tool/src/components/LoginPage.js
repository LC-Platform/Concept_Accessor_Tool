import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../components/styles/Auth.css";

const BASE_URL = "http://10.2.8.12:8500";

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    console.log("🔥 LOGIN FORM SUBMITTED");
    console.log("📦 REQUEST BODY:", form);

    try {
      const res = await fetch(`${BASE_URL}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      console.log("📩 RAW RESPONSE:", res);

      const data = await res.json();
      console.log("📨 API RESPONSE JSON:", data);

      if (!res.ok) {
        setError(data?.message || "Login failed");
        return;
      }

      console.log("✅ LOGIN SUCCESS");

      // Store login state
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userEmail", form.email);

      // If API returns username, store it
      if (data?.username) {
        localStorage.setItem("username", data.username);
      }

      navigate("/");

    } catch (err) {
      console.log("💥 NETWORK ERROR:", err);
      setError("Server error");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            onChange={handleChange}
            required
          />

          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              onChange={handleChange}
              required
            />
            <span
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          <button className="primary-btn" type="submit">
            Login
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <span onClick={() => navigate("/signup")}>Signup</span>
        </p>

        <p className="auth-link" onClick={() => navigate("/forgot-password")}>
          Forgot Password?
        </p>
      </div>
    </div>
  );
}
