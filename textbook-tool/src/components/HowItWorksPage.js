// HowItWorksPage.js
import React from "react";
import "./HowItWorksPage.css";
import { useNavigate } from "react-router-dom";
import iiithLogo from "../assets/iiith_logo.png";

export default function HowItWorksPage() {
  
  
  const navigate = useNavigate();  
  const openUserGuide = () => {
    // You can replace this with actual PDF opening logic
    window.open("/user-guide.pdf", "_blank");
  };

  return (
    <div className="how-it-works-container">
      {/* Header */}
      <div className="header-bar">
        <img src={iiithLogo} alt="IIIT Hyderabad" className="iiith-logo" />
        <button className="back-btn" onClick={() => navigate("/")}>← Back to Home</button>
      </div>

      {/* Main Content */}
      <div className="how-it-works-content">
        <div className="hero-section">
          <h1>How Concept Accessor Works</h1>
          <p className="hero-subtitle">
            A step-by-step guide to transforming your learning experience
          </p>
          
          <button className="guide-btn" onClick={openUserGuide}>
            📖 Download Complete User Guide
          </button>
        </div>

        <div className="steps-container">
          {/* Step 1 */}
          <div className="step-card">
            <div className="step-number">01</div>
            <div className="step-content">
              <h3>Upload Your PDF</h3>
              <p>
                Start by uploading your textbook chapter in PDF format. Our system 
                automatically processes the document and prepares it for interactive analysis.
              </p>
              <div className="step-visual">
                <div className="upload-demo">
                  <div className="pdf-icon">📄</div>
                  <div className="upload-arrow">↑</div>
                  <div className="platform-icon">🖥️</div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="step-card">
            <div className="step-number">02</div>
            <div className="step-content">
              <h3>Choose Your Analysis Mode</h3>
              <p>
                Select from different analysis modes using the navigation tabs:
              </p>
              <ul className="mode-list">
                <li>
                  <strong>Word Analysis:</strong> Click highlighted domain terms for definitions, 
                  pronunciation, and concept maps
                </li>
                <li>
                  <strong>Sentence Analysis:</strong> Select sentences for instant translation 
                  and paraphrasing
                </li>
                <li>
                  <strong>Summary Mode:</strong> Click section numbers for automated summaries 
                  and translations
                </li>
              </ul>
            </div>
          </div>

          {/* Step 3 */}
          <div className="step-card">
            <div className="step-number">03</div>
            <div className="step-content">
              <h3>Interactive Exploration</h3>
              <p>
                Engage with your content through various interactive features:
              </p>
              <div className="features-grid">
                <div className="feature-demo">
                  <div className="demo-icon">🔍</div>
                  <span>Click highlighted terms</span>
                </div>
                <div className="feature-demo">
                  <div className="demo-icon">🎵</div>
                  <span>Listen to pronunciation</span>
                </div>
                <div className="feature-demo">
                  <div className="demo-icon">🌐</div>
                  <span>Translate content</span>
                </div>
                <div className="feature-demo">
                  <div className="demo-icon">📊</div>
                  <span>View concept maps</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="step-card">
            <div className="step-number">04</div>
            <div className="step-content">
              <h3>Access Multimedia Content</h3>
              <p>
                Enhance your understanding with rich multimedia resources:
              </p>
              <div className="media-types">
                <div className="media-type">
                  <h4>Labelled Images</h4>
                  <p>Detailed diagrams with interactive labels</p>
                </div>
                <div className="media-type">
                  <h4>Process Videos</h4>
                  <p>Explanatory videos for complex processes</p>
                </div>
                <div className="media-type">
                  <h4>Audio Pronunciations</h4>
                  <p>Correct pronunciation of technical terms</p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="step-card">
            <div className="step-number">05</div>
            <div className="step-content">
              <h3>Generate & Translate Summaries</h3>
              <p>
                Create comprehensive summaries and translate them to multiple languages:
              </p>
              <div className="translation-demo">
                <div className="lang-option">
                  <span>🇮🇳 Hindi</span>
                </div>
                <div className="lang-option">
                  <span>🇮🇳 Telugu</span>
                </div>
                <div className="lang-option">
                  <span>🇧🇩 Bengali</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="quick-start-section">
          <h2>Quick Start Tips</h2>
          <div className="tips-grid">
            <div className="tip-card">
              <h4>Look for Highlights</h4>
              <p>Only domain-specific terms are highlighted in yellow - these are interactive!</p>
            </div>
            <div className="tip-card">
              <h4>Use Section Numbers</h4>
              <p>Click on section numbers (like "3.1") for targeted summaries</p>
            </div>
            <div className="tip-card">
              <h4>Explore All Tabs</h4>
              <p>Each term has multiple analysis tabs - don't miss the concept maps!</p>
            </div>
            <div className="tip-card">
              <h4>Zoom for Details</h4>
              <p>Click on images and concept maps for full-screen detailed viewing</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="cta-section">
          <h2>Ready to Transform Your Learning?</h2>
          <p>Start using Concept Accessor today and experience interactive learning like never before.</p>
          <button className="get-started-btn" onClick={() => window.location.href = "/"}>
            Get Started Now
          </button>
        </div>
      </div>
    </div>
  );
}