import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";
import heroImage from "../assets/download.jpeg"; 
import iiithLogo from "../assets/iiith_logo.png"; 

export default function HomePage({ onUpload }) {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUpload(file);
      navigate("/analyze");
    }
  };

  return (
    <div className="homepage-container">
      {/* Header Section */}
      <div className="header-bar">
        <img
          src= {iiithLogo}
          alt="IIIT Hyderabad"
          className="iiith-logo"
        />
      </div>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-text">
          <h1>Turn Your Textbooks into Interactive Learning Tool!</h1>
          <p>
            Tired of reading endless pages? Transform plain text into a smarter,
            visual, and engaging learning experience.
          </p>
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current.click()}
          >
            Upload
          </button>
          <input
            type="file"
            accept="application/pdf"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>

        <div className="hero-image">
          <img src={heroImage} alt="Learning Illustration" />
        </div>
      </div>

      {/* Feature Cards */}
      <div className="feature-section">
        <div className="feature-card">
          <h3>Keyword Highlighter Mode</h3>
          <p>Concepts are highlighted and explained briefly.</p>
          <button>Get</button>
        </div>

        <div className="feature-card">
          <h3>Full Summary Mode</h3>
          <p>
            Get a summary of the full text — with smart highlighted concepts
            explained.
          </p>
          <button>Get</button>
        </div>

        <div className="feature-card">
          <h3>Section-wise Summary Mode</h3>
          <p>
            Get a summary of each section — with smart highlighted concepts
            explained.
          </p>
          <button>Get</button>
        </div>
      </div>
    </div>
  );
}
