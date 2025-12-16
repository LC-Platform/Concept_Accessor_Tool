// HomePage.js
import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../components/styles/HomePage.css";
import heroImage from "../assets/download.jpeg";
import iiithLogo from "../assets/iiith_logo.png";

export default function HomePage({ onUpload }) {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // LOGIN CHECK
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const username = localStorage.getItem("username") || "User";

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (!isLoggedIn) {
      alert("Please login to upload a PDF.");
      navigate("/login");
      return;
    }

    if (file) {
      onUpload(file);
      navigate("/analyze");
    }
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleLearnMore = () => {
    navigate("/how-it-works");
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("username");
    navigate("/login");
  };

  return (
    <div className="homepage-container">
      {/* =================== HEADER BAR =================== */}
      <div className="header-bar">
        <div className="header-content">

          {/* LEFT SIDE - LOGO + TEXT */}
          <div className="header-left" onClick={() => navigate("/")}>
            <img src={iiithLogo} alt="IIIT Hyderabad" className="iiith-logo" />
          </div>

          {/* RIGHT SIDE NAV MENU */}
          <div className="header-links">
            <button onClick={() => scrollToSection("features")} className="nav-link-btn">
              Features
            </button>

            <button onClick={() => handleNavigation("/how-it-works")} className="nav-link-btn">
              How It Works
            </button>

            <button onClick={() => handleNavigation("/about")} className="nav-link-btn">
              About
            </button>

            {isLoggedIn && (
              <span className="welcome-text">
                👋 Welcome, <strong>{username}</strong>
              </span>
            )}

            {isLoggedIn ? (
              <button className="secondary-btn" onClick={handleLogout}>Logout</button>
            ) : (
              <button className="secondary-btn" onClick={() => navigate("/login")}>Login</button>
            )}
          </div>
        </div>
      </div>


      {/* =================== HERO SECTION =================== */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">AI-Powered Learning</div>

            <h1>Transform Your Textbooks into Interactive Learning Experiences</h1>

            <p>
              Tired of reading endless pages? Upload your PDF textbook and let our AI create engaging,
              visual, and interactive learning materials tailored just for you.
            </p>

            {/* ===== CTA BUTTONS ===== */}
            <div className="cta-section">
              <button className="secondary-btn" onClick={handleLearnMore}>
                Learn More
              </button>
            </div>


            {/* Supported text */}
            <div className="supported-text">
              <span>Supported format: PDF</span>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>

          {/* ===== HERO IMAGE + FLOATING CARDS ===== */}
          <div className="hero-image">
            <div className="image-container">
              <img src={heroImage} alt="Learning Illustration" />

              <div className="floating-card card-1">
                <div className="card-icon">📊</div>
                <div className="card-text">Visual Summaries</div>
              </div>

              <div className="floating-card card-2">
                <div className="card-icon">🧠</div>
                <div className="card-text">AI Explanations</div>
              </div>

              <div className="floating-card card-3">
                <div className="card-icon">🔍</div>
                <div className="card-text">Smart Quizzes</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================== FEATURES SECTION =================== */}
      <div className="features-section" id="features">
        <div className="section-header">
          <h2>Why Choose Our Platform?</h2>
          <p>We transform traditional textbooks into engaging learning experiences</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Personalized Learning</h3>
            <p>Our AI adapts to your learning style and pace, creating customized study materials.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Visual Learning</h3>
            <p>Transform dense text into diagrams, charts, and visual summaries for better retention.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Save Time</h3>
            <p>Quickly grasp complex concepts without reading through hundreds of pages.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎵</div>
            <h3>Audio Pronunciations</h3>
            <p>Listen to correct pronunciation of complex terms with integrated audio playback.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🌐</div>
            <h3>Multi-language Support</h3>
            <p>Translate content to Hindi, Telugu, and Bengali for regional language learners.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Interactive PDF</h3>
            <p>Click-to-explore functionality directly on your textbook PDFs for seamless learning.</p>
          </div>
        </div>
      </div>

      {/* =================== HOW IT WORKS PREVIEW =================== */}
      <div className="preview-section">
        <div className="section-header">
          <h2>See How It Works</h2>
          <p>Get started in just a few simple steps</p>
        </div>

        <div className="preview-steps">
          <div className="preview-step">
            <div className="step-number">1</div>
            <h3>Upload Your PDF</h3>
            <p>Upload any textbook chapter in PDF format</p>
          </div>

          <div className="preview-step">
            <div className="step-number">2</div>
            <h3>Choose Analysis Mode</h3>
            <p>Select from Word, Sentence, or Summary analysis</p>
          </div>

          <div className="preview-step">
            <div className="step-number">3</div>
            <h3>Explore & Learn</h3>
            <p>Click on highlighted terms and sections to explore</p>
          </div>
        </div>

        <div className="preview-cta">
          <button className="primary-btn" onClick={handleLearnMore}>
            View Detailed Guide
          </button>
        </div>
      </div>

      {/* =================== FOOTER =================== */}
      <div className="footer">
        <div className="footer-content">
          <div className="footer-logo">
            <img src={iiithLogo} alt="IIIT Hyderabad" className="iiith-logo" />
            <p>Transforming Education Through Technology</p>
          </div>

        <div className="footer-links">
            <button onClick={() => handleNavigation("/privacy")} className="nav-link-btn">
              Privacy Policy
            </button>

            <button onClick={() => handleNavigation("/terms")} className="nav-link-btn">
              Terms of Service
            </button>

            <button onClick={() => handleNavigation("/contact")} className="nav-link-btn">
              Contact Us
            </button>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} IIIT Hyderabad. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
