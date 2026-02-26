// HowItWorksPage.js

import "../styles/HowItWorksPage.css";
import { useNavigate } from "react-router-dom";
import iiithLogo from "../assets/iiith_logo.png";

export default function HowItWorksPage() {
  const navigate = useNavigate();

  const openUserGuide = () => {
    // You can replace this with actual PDF opening logic
    window.open("/user-guide.pdf", "_blank");
  };

  return (
    <div className="how-it-works-page">
      {/* Header */}
      <div className="how-header">
        <button className="back-button" onClick={() => navigate("/")}>
          ← Back to Home
        </button>
        <img src={iiithLogo} alt="IIIT Hyderabad" className="iiith-logo" />
      </div>

      {/* Main Content */}
      <div className="how-container">
        <div className="how-hero">
          <h1>How Concept Accessor Works</h1>
          <p>A step-by-step guide to transforming your learning experience</p>
          <button className="user-guide-btn" onClick={openUserGuide}>
            📖 Download Complete User Guide
          </button>
        </div>

        {/* Step 1 - Select Subject */}
        <div className="step-card">
          <div className="step-number">01</div>
          <div className="step-content">
            <h2>Browse Available Subjects</h2>
            <p>
              After logging in, you'll see a comprehensive list of all subjects for which e-books are available. Browse through subjects organized by your curriculum.
            </p>
            <div className="step-visual">
              <div className="visual-placeholder">
                📚
                <br />
                Subject Library
                <br />
                📖
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 - Select Chapter */}
        <div className="step-card">
          <div className="step-number">02</div>
          <div className="step-content">
            <h2>Choose Your Chapter</h2>
            <p>
              Once you select a subject, you'll see all available chapters within that e-book. Select the specific chapter you want to study for interactive analysis.
            </p>
            <div className="step-visual">
              <div className="visual-placeholder">
                📑
                <br />
                Chapter Selection
                <br />
                ↓
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 - Choose Analysis Mode */}
        <div className="step-card">
          <div className="step-number">03</div>
          <div className="step-content">
            <h2>Choose Your Analysis Mode</h2>
            <p>
              Select from different analysis modes using the navigation tabs:
            </p>
            <ul>
              <li>
                <strong>Word Analysis:</strong> Click highlighted domain terms for definitions, pronunciation, and concept maps
              </li>
              <li>
                <strong>Sentence Analysis:</strong> Select sentences for instant translation and paraphrasing
              </li>
              <li>
                <strong>Summary Mode:</strong> Click section numbers for automated summaries and translations
              </li>
            </ul>
          </div>
        </div>

        {/* Step 4 - Interactive Exploration */}
        <div className="step-card">
          <div className="step-number">04</div>
          <div className="step-content">
            <h2>Interactive Exploration</h2>
            <p>
              Engage with your content through various interactive features:
            </p>
            <div className="feature-grid">
              <div className="feature-item">
                <span className="feature-icon">🔍</span>
                <span>Click highlighted terms</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🎵</span>
                <span>Listen to pronunciation</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🌐</span>
                <span>Translate content</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>View concept maps</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 5 - Multimedia Content */}
        <div className="step-card">
          <div className="step-number">05</div>
          <div className="step-content">
            <h2>Access Multimedia Content</h2>
            <p>
              Enhance your understanding with rich multimedia resources:
            </p>
            <div className="multimedia-grid">
              <div className="multimedia-card">
                <h3>Labelled Images</h3>
                <p>Detailed diagrams with interactive labels</p>
              </div>
              <div className="multimedia-card">
                <h3>Process Videos</h3>
                <p>Explanatory videos for complex processes</p>
              </div>
              <div className="multimedia-card">
                <h3>Audio Pronunciations</h3>
                <p>Correct pronunciation of technical terms</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 6 - Summaries & Translation */}
        <div className="step-card">
          <div className="step-number">06</div>
          <div className="step-content">
            <h2>Generate & Translate Summaries</h2>
            <p>
              Create comprehensive summaries and translate them to multiple languages:
            </p>
            <div className="language-options">
              <span className="language-tag">🇮🇳 Hindi</span>
              <span className="language-tag">🇮🇳 Telugu</span>
              <span className="language-tag">🇧🇩 Bengali</span>
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="quick-start-section">
          <h2>Quick Start Tips</h2>
          <div className="tips-grid">
            <div className="tip-card">
              <h3>Look for Highlights</h3>
              <p>
                Only domain-specific terms are highlighted in yellow - these are interactive!
              </p>
            </div>
            <div className="tip-card">
              <h3>Use Section Numbers</h3>
              <p>
                Click on section numbers (like "3.1") for targeted summaries
              </p>
            </div>
            <div className="tip-card">
              <h3>Explore All Tabs</h3>
              <p>
                Each term has multiple analysis tabs - don't miss the concept maps!
              </p>
            </div>
            <div className="tip-card">
              <h3>Zoom for Details</h3>
              <p>
                Click on images and concept maps for full-screen detailed viewing
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="cta-section">
          <h2>Ready to Transform Your Learning?</h2>
          <p>
            Start using Concept Accessor today and experience interactive learning like never before.
          </p>
          <button
            className="cta-button"
            onClick={() => (window.location.href = "/")}
          >
            Get Started Now
          </button>
        </div>
      </div>
    </div>
  );
}
