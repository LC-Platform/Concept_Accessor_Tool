// AboutPage.js
import React from "react";
import "../components/styles/AboutPage.css";
import { useNavigate } from "react-router-dom"; 
import iiithLogo from "../assets/iiith_logo.png";

export default function AboutPage() {

  const navigate = useNavigate(); 

  return (
    <div className="about-container">
      {/* Header */}
      <div className="header-bar">
        <img src={iiithLogo} alt="IIIT Hyderabad" className="iiith-logo" />
        <button className="back-btn" onClick={() => navigate("/")}>← Back to Home</button>
      </div>

      {/* Main Content */}
      <div className="about-content">
        <div className="about-hero">
          <h1>About Concept Accessor</h1>
          <p className="hero-subtitle">
            Transforming Traditional Learning into Interactive Experiences
          </p>
        </div>

        <div className="about-sections">
          {/* Mission Section */}
          <section className="about-section">
            <h2>Our Mission</h2>
            <p>
              Concept Accessor is an innovative educational technology platform developed 
              at IIIT Hyderabad that revolutionizes how students interact with textbook content. 
              Our mission is to make learning more engaging, accessible, and effective through 
              AI-powered analysis and interactive multimedia features.
            </p>
          </section>

          {/* What We Do Section */}
          <section className="about-section">
            <h2>What We Do</h2>
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">🔍</div>
                <h3>Smart Text Analysis</h3>
                <p>Automatically identify and highlight domain-specific terms for focused learning</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🎵</div>
                <h3>Audio Pronunciation</h3>
                <p>Listen to correct pronunciation of complex terms with integrated audio playback</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🌐</div>
                <h3>Multi-language Support</h3>
                <p>Translate content to Hindi, Telugu, and Bengali for regional language learners</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <h3>Visual Learning</h3>
                <p>Access labelled diagrams, concept maps, and process videos for better understanding</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📝</div>
                <h3>Smart Summarization</h3>
                <p>Generate section-wise summaries and comprehensive chapter overviews</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">⚡</div>
                <h3>Interactive PDF</h3>
                <p>Click-to-explore functionality directly on your textbook PDFs</p>
              </div>
            </div>
          </section>

          {/* Technology Section */}
          <section className="about-section">
            <h2>Technology</h2>
            <p>
              Built with cutting-edge AI and natural language processing technologies, 
              Concept Accessor combines machine learning algorithms with educational psychology 
              principles to create an optimal learning environment. Our platform leverages:
            </p>
            <ul className="tech-list">
              <li>Advanced NLP for domain term extraction</li>
              <li>Computer vision for image and diagram processing</li>
              <li>Machine translation for multi-language support</li>
              <li>Audio synthesis for pronunciation guidance</li>
              <li>Interactive PDF rendering technology</li>
            </ul>
          </section>

          {/* Team Section */}
          <section className="about-section">
            <h2>Development Team</h2>
            <p>
              Concept Accessor is developed by researchers at the International Institute 
              of Information Technology, Hyderabad (IIIT-H), combining expertise in computer 
              science, education technology, and human-computer interaction.
            </p>
            <div className="team-members">
              <div className="team-member">
                <h4>Sashank Tatavolu</h4>
                <p>Lead Developer & Researcher</p>
                <a href="mailto:sashank.tatavolu@research.iiit.ac.in">
                  sashank.tatavolu@research.iiit.ac.in
                </a>
              </div>
              <div className="team-member">
                <h4>Anjani Adapa</h4>
                <p>Researcher & Content Specialist</p>
                <a href="mailto:anjani.adapa@research.iiit.ac.in">
                  anjani.adapa@research.iiit.ac.in
                </a>
              </div>
            </div>
          </section>

          {/* Institution Section */}
          <section className="about-section">
            <h2>About IIIT Hyderabad</h2>
            <p>
              The International Institute of Information Technology, Hyderabad (IIIT-H) is 
              a premier research university focused on information technology and related 
              disciplines. Known for its strong research programs and industry collaborations, 
              IIIT-H continues to push the boundaries of technology and innovation.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}