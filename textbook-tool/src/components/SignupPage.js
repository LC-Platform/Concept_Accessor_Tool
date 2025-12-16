import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../components/styles/Auth.css";

const BASE_URL = "http://10.2.8.12:8500";

export default function SignupPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    confirm_password: ""   // REQUIRED BY BACKEND
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    console.log("🔥 SIGNUP FORM SUBMITTED");
    console.log("📦 REQUEST BODY:", form);

    try {
      console.log("🚀 Sending Signup Request...");
      const res = await fetch(`${BASE_URL}/signup/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      console.log("📩 RAW RESPONSE:", res);
      const data = await res.json();
      console.log("📨 API RESPONSE JSON:", data);

      if (!res.ok) {
        console.log("❌ SIGNUP FAILED");
        setError(data?.message || "Signup failed");
        return;
      }

      console.log("✅ SIGNUP SUCCESS — Redirecting to Login...");
      navigate("/login");

    } catch (err) {
      console.log("💥 NETWORK ERROR:", err);
      setError("Server error");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit}>

          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            placeholder="Username"
            autoComplete="username"
            onChange={handleChange}
            required
          />

          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            name="name"
            placeholder="Full name"
            autoComplete="name"
            onChange={handleChange}
            required
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            onChange={handleChange}
            required
          />

          {/* PASSWORD */}
          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="new-password"
              onChange={handleChange}
              required
            />
            <span
              className="password-toggle"
              onClick={() => {
                console.log("👁️ Toggle Password →", !showPassword);
                setShowPassword(!showPassword);
              }}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          {/* CONFIRM PASSWORD */}
          <label htmlFor="confirm_password">Confirm Password</label>
          <div className="password-field">
            <input
              id="confirm_password"
              name="confirm_password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              autoComplete="new-password"
              onChange={handleChange}
              required
            />
            <span
              className="password-toggle"
              onClick={() => {
                console.log("👁️ Toggle Confirm Password →", !showConfirmPassword);
                setShowConfirmPassword(!showConfirmPassword);
              }}
            >
              {showConfirmPassword ? "🙈" : "👁️"}
            </span>
          </div>

          <button
            type="submit"
            className="primary-btn"
            onClick={() => console.log("🖱️ SIGNUP BUTTON CLICKED")}
          >
            Signup
          </button>

        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <span onClick={() => navigate("/login")}>Login</span>
        </p>
      </div>
    </div>
  );
}
