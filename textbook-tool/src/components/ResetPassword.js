import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Auth.css";

const BASE_URL = "http://10.2.8.12:8500";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";
  const code = location.state?.code || "";

  const [form, setForm] = useState({
    new_password: "",
    confirm_password: "",
  });

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");

    if (form.new_password !== form.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/reset-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          new_password: form.new_password,
          confirm_password: form.confirm_password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.message || "Failed to reset password");
        return;
      }

      setMsg(data.message);

      setTimeout(() => navigate("/login"), 1500);

    } catch (err) {
      setError("Server error");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset Password</h2>

        {msg && <p className="auth-success">{msg}</p>}
        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleReset}>

          <label htmlFor="new-password">New Password</label>
          <input
            id="new-password"
            type="password"
            name="new_password"
            placeholder="Enter new password"
            autoComplete="new-password"
            onChange={handleChange}
            required
          />

          <label htmlFor="confirm-password">Confirm Password</label>
          <input
            id="confirm-password"
            type="password"
            name="confirm_password"
            placeholder="Confirm password"
            autoComplete="new-password"
            onChange={handleChange}
            required
          />

          <button type="submit" className="primary-btn">
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
