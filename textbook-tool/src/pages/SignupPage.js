import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css";

const BASE_URL = "http://10.2.8.12:8300";

export default function SignupPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    name: "",
    email: "",
    standard: "",
    password: "",
    confirm_password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Client-side validation
    if (form.password !== form.confirm_password) {
    setFieldError("Passwords do not match");
    setLoading(false);
    return;
    }


    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    // Prepare payload according to backend requirements
    const payload = {
      username: form.username.trim(),
      name: form.name.trim(),
      email: form.email.trim(),
      standard: form.standard,
      password: form.password,  // Changed from password_hash
      confirm_password: form.confirm_password  // Added confirm_password
    };

    console.log("📤 Signup Payload:", payload);

    try {
      const res = await fetch(`${BASE_URL}/signup/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
      });

      console.log("📥 Response Status:", res.status);
      
      const responseText = await res.text();
      console.log("📥 Raw Response:", responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Failed to parse JSON:", parseError);
        setError("Server returned invalid response");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        let errorMsg = "Signup failed";
        
        // Handle FastAPI validation errors
        if (data?.detail) {
          if (Array.isArray(data.detail)) {
            errorMsg = data.detail.map(err => {
              const field = err.loc?.[1] || 'field';
              return `${field}: ${err.msg}`;
            }).join(', ');
          } else {
            errorMsg = data.detail;
          }
        } else if (data?.message) {
          errorMsg = data.message;
        }
        
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Success
      console.log("✅ Signup successful:", data);
      alert("Account created successfully! Please login.");
      navigate("/login");
      
    } catch (err) {
      console.error("❌ Fetch error:", err);
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>


        {error && (
          <div className="auth-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username *</label>
          <input
            id="username"
            name="username"
            placeholder="Username"
            autoComplete="username"
            value={form.username}
            onChange={handleChange}
            required
            disabled={loading}
          />

          <label htmlFor="name">Full Name *</label>
          <input
            id="name"
            name="name"
            placeholder="Full name"
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
            required
            disabled={loading}
          />

          <label htmlFor="email">Email *</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            required
            disabled={loading}
          />

          <label htmlFor="standard">Standard *</label>
          <input
            id="standard"
            name="standard"
            placeholder="e.g. 11 or 12"
            value={form.standard}
            onChange={handleChange}
            required
            disabled={loading}
          />

          <label htmlFor="password">Password * (min 6 characters)</label>
          <div className="password-field">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              required
              minLength="6"
              disabled={loading}
            />
            <span
              className="password-toggle"
              onClick={() => !loading && setShowPassword(!showPassword)}
              style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          <label htmlFor="confirm_password">Confirm Password *</label>
          {fieldError && (
          <div className="field-error">
            {fieldError}
          </div>
          )}

          <div className="password-field">
            <input
              id="confirm_password"
              name="confirm_password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              autoComplete="new-password"
              value={form.confirm_password}
              onChange={handleChange}
              required
              disabled={loading}
            />
            <span
              className="password-toggle"
              onClick={() => !loading && setShowConfirmPassword(!showConfirmPassword)}
              style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {showConfirmPassword ? "🙈" : "👁️"}
            </span>
          </div>

          <button
            type="submit"
            className="primary-btn"
            disabled={loading}
            style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <span 
            onClick={() => !loading && navigate("/login")}
            style={{ cursor: loading ? 'not-allowed' : 'pointer', color: '#007bff' }}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}