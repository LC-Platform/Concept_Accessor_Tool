import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/HomePage.css";
import heroImage from "../assets/study_image.png";
import iiithLogo from "../assets/iiith_logo.png";

export default function HomePage({ onUpload }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // ===== AUTH CHECK =====
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const username = localStorage.getItem("username") || "User";

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (isLoggedIn) {
      navigate("/subjects", { replace: true });
    }
  }, [navigate]);

  // ===== SCROLL & MOUSE TRACKING =====
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      });
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Add this useEffect to your HomePage component for animated counters



// You can also add this for smooth parallax scrolling on mouse move
useEffect(() => {
  const handleParallax = (e) => {
    const cards = document.querySelectorAll('.floating-card');
    const moveX = (e.clientX - window.innerWidth / 2) / 50;
    const moveY = (e.clientY - window.innerHeight / 2) / 50;

    cards.forEach((card, index) => {
      const depth = (index + 1) * 0.5;
      card.style.transform = `translate(${moveX * depth}px, ${moveY * depth}px)`;
    });
  };

  window.addEventListener('mousemove', handleParallax);
  return () => window.removeEventListener('mousemove', handleParallax);
}, []);

  // ===== FILE UPLOAD =====
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

  // ===== SCROLL =====
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // ===== LOGOUT =====
  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("username");
    localStorage.removeItem("userEmail");
    navigate("/login");
  };

  return (
    <div className="homepage-container">
      {/* Animated background elements with parallax */}
      <div className="bg-orbs">
        <div 
          className="orb orb-1"
          style={{
            transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * 20}px) translateY(${scrollY * 0.3}px)`
          }}
        ></div>
        <div 
          className="orb orb-2"
          style={{
            transform: `translate(${mousePosition.x * -15}px, ${mousePosition.y * -15}px) translateY(${scrollY * 0.2}px)`
          }}
        ></div>
        <div 
          className="orb orb-3"
          style={{
            transform: `translate(${mousePosition.x * 25}px, ${mousePosition.y * 25}px) translateY(${scrollY * 0.4}px)`
          }}
        ></div>
      </div>

      {/* Floating particles */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 10}s`
          }}></div>
        ))}
      </div>

      {/* ================= HEADER ================= */}
      <header className={`header-bar ${scrollY > 50 ? 'scrolled' : ''}`}>
        <div className="header-content">
          {/* LOGO */}
          <div className="header-left" onClick={() => navigate("/")}>
            <div className="logo-wrapper">
              <img src={iiithLogo} alt="IIIT Hyderabad" className="iiith-logo" />
            </div>
            <span className="brand-name">
              <span className="brand-letter">E</span>
              <span className="brand-letter">-</span>
              <span className="brand-letter">R</span>
              <span className="brand-letter">e</span>
              <span className="brand-letter">a</span>
              <span className="brand-letter">d</span>
              <span className="brand-letter">e</span>
              <span className="brand-letter">r</span>
              
            </span>
          </div>

          {/* NAV */}
          <nav className="header-links">
            <button className="nav-link-btn" onClick={() => scrollToSection("features")}>
              <span>Features</span>
              <div className="nav-underline"></div>
            </button>

            <button className="nav-link-btn" onClick={() => navigate("/how-it-works")}>
              <span>How It Works</span>
              <div className="nav-underline"></div>
            </button>

            <button className="nav-link-btn" onClick={() => navigate("/about")}>
              <span>About</span>
              <div className="nav-underline"></div>
            </button>

            {isLoggedIn && (
              <div className="user-badge">
                <div className="avatar">
                  <span>{username.charAt(0).toUpperCase()}</span>
                  <div className="avatar-ring"></div>
                </div>
                <span className="username">{username}</span>
              </div>
            )}

            {isLoggedIn ? (
              <button className="logout-btn" onClick={handleLogout}>
                <span className="btn-text">Logout</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10.6667 11.3333L14 8L10.6667 4.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className="btn-shine"></div>
              </button>
            ) : (
              <button className="login-btn" onClick={() => navigate("/login")}>
                <span className="btn-text">Login</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 14H12.6667C13.0203 14 13.3594 13.8595 13.6095 13.6095C13.8595 13.3594 14 13.0203 14 12.6667V3.33333C14 2.97971 13.8595 2.64057 13.6095 2.39052C13.3594 2.14048 13.0203 2 12.6667 2H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5.33333 11.3333L2 8L5.33333 4.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 8H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className="btn-shine"></div>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <span className="hero-badge">
              <span className="badge-dot"></span>
              <span className="badge-text">AI-Powered Learning</span>
              <div className="badge-glow"></div>
            </span>

            <h1 className="hero-title">
              <span className="title-line">Turn Your Textbooks into</span>
              <span className="title-line gradient-text">Interactive Learning</span>
              <span className="title-line">Experiences</span>
            </h1>

            <p className="hero-description">
              Browse subjects, explore chapters, and learn directly from
              intelligent PDFs with AI-powered explanations, summaries,
              and visual aids.
            </p>

            <div className="cta-section">
              <button
                className="primary-btn magnetic-btn"
                onClick={() => navigate("/login")}
              >
                <span className="btn-content">
                  <span>Start Learning Now</span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <div className="btn-particles">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="btn-particle"></div>
                  ))}
                </div>
                <div className="btn-glow"></div>
              </button>

              <button
                className="secondary-btn magnetic-btn"
                onClick={() => navigate("/how-it-works")}
              >
                <span className="btn-content">
                  <span>Learn More</span>
                </span>
                <div className="btn-border"></div>
              </button>
            </div>

            <input
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>

          <div className="hero-image">
            <div className="image-wrapper">
              {/* Animated rings behind image */}
              <div className="image-rings">
                <div className="ring ring-1"></div>
                <div className="ring ring-2"></div>
                <div className="ring ring-3"></div>
              </div>
              <div className="image-container">
                <img src={heroImage} alt="AI Learning Illustration" />
                <div className="image-overlay"></div>
              </div>
            </div>
          </div>
        </div>
      </section>


     {/* ================= FEATURES ================= */}
      <section className="features-section" id="features">
        <div className="section-header">
          <span className="section-badge">
            <span>Features</span>
            <div className="badge-shine"></div>
          </span>

          <h2>
            <span className="section-title-line">Why Choose Our</span>
            <span className="section-title-line gradient-text">Platform?</span>
          </h2>

          <p>Designed for smarter, faster, and deeper learning</p>
        </div>

        <div className="features-grid">
          {[
            {
              icon: "🎯",
              title: "Personalized Learning",
              desc: "AI adapts content to your pace and understanding level.",
            },
            {
              icon: "📊",
              title: "Visual Explanations",
              desc: "Concept maps, diagrams, and labeled images for clarity.",
            },
            {
              icon: "⚡",
              title: "Save Time",
              desc: "Understand faster without reading every single page.",
            },
            {
              icon: "🌐",
              title: "Multi-Language",
              desc: "Translate content to Indian regional languages easily.",
            },
            {
              icon: "🧠",
              title: "Smart Analysis",
              desc: "Word, sentence, summary & Q/A analysis modes.",
            },
            {
              icon: "📘",
              title: "Interactive PDFs",
              desc: "Click concepts directly inside your PDF documents.",
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="feature-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="feature-background"></div>

              <div className="feature-icon">
                <span>{feature.icon}</span>
                <div className="icon-ring"></div>
              </div>

              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>

              {/* Arrow removed intentionally */}

              <div className="card-shine"></div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <img src={iiithLogo} alt="IIIT Hyderabad" className="footer-logo" />
            <p className="footer-tagline">Empowering education through AI</p>
          </div>
          <div className="footer-right">
            <p className="copyright">
              © {new Date().getFullYear()} IIIT Hyderabad. All rights reserved.
            </p>
          </div>
        </div>
        <div className="footer-wave"></div>
      </footer>
    </div>
  );
}