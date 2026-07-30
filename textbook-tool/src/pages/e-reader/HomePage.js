import React, { useRef, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/HomePage.css";
import heroImage from "../../assets/study_image.png";
import iiithLogo from "../../assets/iiith_logo.png";

// ── Generate particles once, outside the component, so they never change ──
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: `${(i * 8.33 + 4) % 100}%`,          // deterministic, evenly spread
  animationDelay: `${(i * 0.9) % 5}s`,
  animationDuration: `${10 + (i * 1.7) % 8}s`,
  size: `${2 + (i % 3)}px`,
}));

const FEATURES = [
  { icon: "🎯", title: "Personalized Learning",  desc: "AI adapts content to your pace and understanding level." },
  { icon: "📊", title: "Visual Explanations",    desc: "Concept maps, diagrams, and labeled images for clarity." },
  { icon: "⚡", title: "Save Time",              desc: "Understand faster without reading every single page." },
  { icon: "🌐", title: "Multi-Language",         desc: "Translate content to Indian regional languages easily." },
  { icon: "🧠", title: "Smart Analysis",         desc: "Word, sentence, summary & Q/A analysis modes." },
  { icon: "📘", title: "Interactive PDFs",       desc: "Click concepts directly inside your PDF documents." },
];

export default function HomePage({ onUpload }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ── Detect touch device once, via media query (no state thrash) ──
  const isTouchDevice = useMemo(
    () => window.matchMedia("(hover: none) and (pointer: coarse)").matches,
    []
  );

  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const username   = localStorage.getItem("username") || "User";

  // ── Auth redirect — run synchronously before first paint ──
  // Using a ref-guard so it only runs once and doesn't cause a second render
  const redirected = useRef(false);
  if (!redirected.current && isLoggedIn) {
    redirected.current = true;
    // Schedule after mount so Router is ready
    setTimeout(() => navigate("/subjects", { replace: true }), 0);
  }

  // ── Scroll header shadow ──
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Parallax (desktop only, no state updates = no flicker) ──
  useEffect(() => {
    if (isTouchDevice) return;
    const cards = document.querySelectorAll(".floating-card");
    const onMove = (e) => {
      const mx = (e.clientX - window.innerWidth  / 2) / 50;
      const my = (e.clientY - window.innerHeight / 2) / 50;
      cards.forEach((c, i) => {
        const d = (i + 1) * 0.5;
        c.style.transform = `translate(${mx * d}px, ${my * d}px)`;
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [isTouchDevice]);

  // ── Close mobile menu on outside click ──
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const close = (e) => {
      if (!e.target.closest(".mobile-menu") && !e.target.closest(".menu-toggle")) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [mobileMenuOpen]);

  // ── Lock body scroll when mobile menu is open ──
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("username");
    localStorage.removeItem("userEmail");
    navigate("/login");
    setMobileMenuOpen(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!isLoggedIn) { alert("Please login to upload a PDF."); navigate("/login"); return; }
    if (file && onUpload) { onUpload(file); navigate("/analyze"); }
  };

  return (
    <div className="homepage-container">

      {/* ── Static background orbs (no inline style on mobile) ── */}
      <div className="bg-orbs" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* ── Particles: pre-calculated, rendered once ── */}
      <div className="particles" aria-hidden="true">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              left:              p.left,
              animationDelay:    p.animationDelay,
              animationDuration: p.animationDuration,
              width:             p.size,
              height:            p.size,
            }}
          />
        ))}
      </div>

      {/* ═══════════════ HEADER ═══════════════ */}
      <header className={`header-bar ${scrolled ? "scrolled" : ""}`}>
        <div className="header-content">

          <div className="header-left" onClick={() => navigate("/")}>
            <div className="logo-wrapper">
              <img src={iiithLogo} alt="IIIT Hyderabad" className="iiith-logo" loading="eager" />
            </div>
            <span className="brand-name" aria-label="E-Reader">
              {"E-Reader".split("").map((ch, i) => (
                <span key={i} className="brand-letter">{ch}</span>
              ))}
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="header-links desktop-nav">
            <button className="nav-link-btn" onClick={() => scrollToSection("features")}>
              <span>Features</span><div className="nav-underline" />
            </button>
            <button className="nav-link-btn" onClick={() => navigate("/how-it-works")}>
              <span>How It Works</span><div className="nav-underline" />
            </button>
            <button className="nav-link-btn" onClick={() => navigate("/about")}>
              <span>About</span><div className="nav-underline" />
            </button>

            {isLoggedIn && (
              <div className="user-badge">
                <div className="avatar">
                  <span>{username.charAt(0).toUpperCase()}</span>
                  <div className="avatar-ring" />
                </div>
                <span className="username">{username}</span>
              </div>
            )}

            {isLoggedIn ? (
              <button className="logout-btn" onClick={handleLogout}>
                <span className="btn-text">Logout</span>
                <LogoutIcon />
                <div className="btn-shine" />
              </button>
            ) : (
              <button className="login-btn" onClick={() => navigate("/login")}>
                <span className="btn-text">Login</span>
                <LoginIcon />
                <div className="btn-shine" />
              </button>
            )}
          </nav>

          {/* Mobile hamburger */}
          <button
            className={`menu-toggle ${mobileMenuOpen ? "active" : ""}`}
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <span /><span /><span />
          </button>
        </div>

        {/* Mobile menu — rendered in DOM always, visibility via class */}
        <div
          className={`mobile-menu ${mobileMenuOpen ? "open" : ""}`}
          aria-hidden={!mobileMenuOpen}
        >
          <nav className="mobile-nav">
            <button className="mobile-nav-link" onClick={() => scrollToSection("features")}>Features</button>
            <button className="mobile-nav-link" onClick={() => { navigate("/how-it-works"); setMobileMenuOpen(false); }}>How It Works</button>
            <button className="mobile-nav-link" onClick={() => { navigate("/about"); setMobileMenuOpen(false); }}>About</button>

            {isLoggedIn && (
              <div className="mobile-user-info">
                <div className="mobile-avatar">{username.charAt(0).toUpperCase()}</div>
                <span className="mobile-username">{username}</span>
              </div>
            )}

            {isLoggedIn ? (
              <button className="mobile-logout-btn" onClick={handleLogout}>Logout</button>
            ) : (
              <button className="mobile-login-btn" onClick={() => { navigate("/login"); setMobileMenuOpen(false); }}>Login</button>
            )}
          </nav>
        </div>
      </header>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <span className="hero-badge">
              <span className="badge-dot" />
              <span className="badge-text">AI-Powered Learning</span>
              <div className="badge-glow" />
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
              <button className="primary-btn magnetic-btn" onClick={() => navigate("/login")}>
                <span className="btn-content">
                  <span>Start Learning Now</span>
                  <ChevronIcon />
                </span>
                <div className="btn-glow" />
              </button>

              <button className="secondary-btn magnetic-btn" onClick={() => navigate("/how-it-works")}>
                <span className="btn-content"><span>Learn More</span></span>
                <div className="btn-border" />
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
              <div className="image-rings" aria-hidden="true">
                <div className="ring ring-1" /><div className="ring ring-2" /><div className="ring ring-3" />
              </div>
              <div className="image-container">
                <img src={heroImage} alt="AI Learning Illustration" loading="eager" decoding="async" />
                <div className="image-overlay" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <section className="features-section" id="features">
        <div className="section-header">
          <span className="section-badge">
            <span>Features</span>
            <div className="badge-shine" />
          </span>
          <h2>
            <span className="section-title-line">Why Choose Our</span>
            <span className="section-title-line gradient-text">Platform?</span>
          </h2>
          <p>Designed for smarter, faster, and deeper learning</p>
        </div>

        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="feature-background" />
              <div className="feature-icon">
                <span>{f.icon}</span>
                <div className="icon-ring" />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <div className="card-shine" />
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-left">
            <img src={iiithLogo} alt="IIIT Hyderabad" className="footer-logo" loading="lazy" />
            <p className="footer-tagline">Empowering education through AI</p>
          </div>
          <div className="footer-right">
            <p className="copyright">© {new Date().getFullYear()} IIIT Hyderabad. All rights reserved.</p>
          </div>
        </div>
        <div className="footer-wave" />
      </footer>
    </div>
  );
}

/* ── Tiny inline SVG components to avoid repeated JSX ── */
function LoginIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 14H12.6667C13.0203 14 13.3594 13.8595 13.6095 13.6095C13.8595 13.3594 14 13.0203 14 12.6667V3.33333C14 2.97971 13.8595 2.64057 13.6095 2.39052C13.3594 2.14048 13.0203 2 12.6667 2H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.33333 11.3333L2 8L5.33333 4.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 8H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.6667 11.3333L14 8L10.6667 4.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}