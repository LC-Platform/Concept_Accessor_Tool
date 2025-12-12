import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Auth.css";

const BASE_URL = "http://10.2.8.12:8500";

export default function VerifyResetCode() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");

    try {
      const res = await fetch(`${BASE_URL}/verify-reset-code/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Invalid code");
        return;
      }

      setMsg(data.message);
      setTimeout(() => {
        navigate("/reset-password", { state: { email, code } });
      }, 1200);

    } catch (err) {
      setError("Server error");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Verify Code</h2>

        {msg && <p className="auth-success">{msg}</p>}
        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleVerify}>
          <label htmlFor="otp-code">Enter 6-digit code</label>
          <input
            id="otp-code"
            type="text"
            placeholder="******"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />

          <button type="submit" className="primary-btn">Verify</button>
        </form>

        <p className="auth-switch" onClick={() => navigate("/forgot-password")}>
          Resend Code
        </p>
      </div>
    </div>
  );
}
