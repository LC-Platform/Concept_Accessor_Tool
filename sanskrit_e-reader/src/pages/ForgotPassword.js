import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";

const BASE_URL = "http://10.2.8.12:8400";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");

    try {
      const res = await fetch(`${BASE_URL}/forgot-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Failed to send reset code");
        return;
      }

      setMsg(data.message);
      setTimeout(() => {
        navigate("/verify-reset-code", { state: { email } });
      }, 1200);

    } catch (err) {
      setError("Server error");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Forgot Password</h2>

        {msg && <p className="auth-success">{msg}</p>}
        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <label htmlFor="fp-email">Email</label>
          <input
            id="fp-email"
            type="email"
            placeholder="Enter registered email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" className="primary-btn">
            Send Reset Code
          </button>
        </form>

        <p className="auth-switch" onClick={() => navigate("/login")}>
          Back to Login
        </p>
      </div>
    </div>
  );
}
    