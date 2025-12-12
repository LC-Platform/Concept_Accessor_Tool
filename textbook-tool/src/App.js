// App.js (with enhanced 404 page)
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import HomePage from "./components/HomePage";
import ConceptLayout from "./components/ConceptLayout";
import AboutPage from "./components/AboutPage";
import ContactPage from "./components/ContactPage";
import HowItWorksPage from "./components/HowItWorksPage";
import LegalPage from "./components/LegalPage";
import "./components/ModernLayout.css";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import ForgotPassword from "./components/ForgotPassword";
import VerifyResetCode from "./components/VerifyResetCode";
import ResetPassword from "./components/ResetPassword";


function App() {
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleUpload = (file) => {
    setUploadedFile(file);
  };

  return (
    <Router>
      <Routes>
        {/* Main Pages */}
        <Route path="/" element={<HomePage onUpload={handleUpload} />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-reset-code" element={<VerifyResetCode />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/analyze"
          element={<ConceptLayout uploadedFile={uploadedFile} />}
        />
        
        {/* Informational Pages */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        
        {/* Legal Pages */}
        <Route path="/privacy" element={<LegalPage />} />
        <Route path="/terms" element={<LegalPage />} />
        
        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

// Enhanced 404 component with navigation
function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <div className="not-found-illustration">
          <div className="error-code">404</div>
          <div className="error-icon">🔍</div>
        </div>
        
        <h1 className="not-found-title">Page Not Found</h1>
        
        <p className="not-found-description">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="not-found-actions">
          <button 
            className="primary-btn"
            onClick={() => navigate(-1)}
          >
            ← Go Back
          </button>
          <button 
            className="secondary-btn"
            onClick={() => navigate('/')}
          >
            Go Home
          </button>
        </div>
        
        <div className="not-found-links">
          <p>You might be looking for:</p>
          <div className="suggested-links">
            <a href="/how-it-works">How It Works</a>
            <a href="/about">About Us</a>
            <a href="/contact">Contact</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;