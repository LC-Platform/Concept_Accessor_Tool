// LegalPage.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LegalPage.css";
import iiithLogo from "../assets/iiith_logo.png";

export default function LegalPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("privacy");

  return (
    <div className="legal-container">
      {/* Header */}
      <div className="header-bar">
        <img src={iiithLogo} alt="IIIT Hyderabad" className="iiith-logo" />
        <button className="back-btn" onClick={() => navigate("/")}>← Back to Home</button>
      </div>

      {/* Main Content */}
      <div className="legal-content">
        <div className="legal-hero">
          <h1>Legal Information</h1>
          <p className="hero-subtitle">
            Understanding our policies and terms of service
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="legal-tabs">
          <button 
            className={`tab-btn ${activeTab === "privacy" ? "active" : ""}`}
            onClick={() => setActiveTab("privacy")}
          >
            Privacy Policy
          </button>
          <button 
            className={`tab-btn ${activeTab === "terms" ? "active" : ""}`}
            onClick={() => setActiveTab("terms")}
          >
            Terms of Service
          </button>
        </div>

        {/* Content Area */}
        <div className="legal-content-area">
          {activeTab === "privacy" && (
            <div className="policy-content">
              <h2>Privacy Policy</h2>
              <p className="last-updated">Last updated: {new Date().toLocaleDateString()}</p>

              <section className="policy-section">
                <h3>1. Information We Collect</h3>
                <p>
                  Concept Accessor is designed with your privacy in mind. We collect minimal 
                  information necessary to provide our educational services:
                </p>
                <ul>
                  <li>
                    <strong>Uploaded Documents:</strong> PDF files you upload for processing 
                    are temporarily stored to generate interactive content
                  </li>
                  <li>
                    <strong>Usage Data:</strong> Anonymous interaction data to improve our services
                  </li>
                  <li>
                    <strong>Technical Information:</strong> Browser type, device information for 
                    compatibility purposes
                  </li>
                </ul>
              </section>

              <section className="policy-section">
                <h3>2. How We Use Your Information</h3>
                <p>We use collected information solely for:</p>
                <ul>
                  <li>Processing and analyzing uploaded educational content</li>
                  <li>Generating interactive learning materials</li>
                  <li>Improving our AI algorithms and user experience</li>
                  <li>Providing technical support and maintenance</li>
                </ul>
              </section>

              <section className="policy-section">
                <h3>3. Data Storage and Security</h3>
                <p>
                  Your data security is our priority. We implement the following measures:
                </p>
                <ul>
                  <li>Uploaded documents are processed in secure environments</li>
                  <li>Temporary storage with automatic deletion protocols</li>
                  <li>Encrypted data transmission using SSL/TLS protocols</li>
                  <li>Regular security audits and updates</li>
                </ul>
              </section>

              <section className="policy-section">
                <h3>4. Data Sharing and Disclosure</h3>
                <p>
                  We do not sell, trade, or rent your personal information to third parties. 
                  Limited data may be shared with:
                </p>
                <ul>
                  <li>Research collaborators at IIIT Hyderabad for academic purposes</li>
                  <li>Service providers who assist in platform operation (under strict confidentiality)</li>
                  <li>When required by law or to protect our rights</li>
                </ul>
              </section>

              <section className="policy-section">
                <h3>5. Your Rights and Choices</h3>
                <p>You have the right to:</p>
                <ul>
                  <li>Access and download your processed content</li>
                  <li>Request deletion of your uploaded documents</li>
                  <li>Opt-out of anonymous data collection for research</li>
                  <li>Contact us with privacy concerns</li>
                </ul>
              </section>

              <section className="policy-section">
                <h3>6. Contact Information</h3>
                <p>
                  For privacy-related questions or concerns, please contact our team:
                </p>
                <div className="contact-info">
                  <p>
                    <strong>Email:</strong>{' '}
                    <a href="mailto:sashank.tatavolu@research.iiit.ac.in">
                      sashank.tatavolu@research.iiit.ac.in
                    </a>
                  </p>
                  <p>
                    <strong>Alternative Contact:</strong>{' '}
                    <a href="mailto:anjani.adapa@research.iiit.ac.in">
                      anjani.adapa@research.iiit.ac.in
                    </a>
                  </p>
                </div>
              </section>
            </div>
          )}

          {activeTab === "terms" && (
            <div className="terms-content">
              <h2>Terms of Service</h2>
              <p className="last-updated">Last updated: {new Date().toLocaleDateString()}</p>

              <section className="terms-section">
                <h3>1. Acceptance of Terms</h3>
                <p>
                  By accessing and using Concept Accessor, you accept and agree to be bound 
                  by these Terms of Service. If you disagree with any part, you may not 
                  access our services.
                </p>
              </section>

              <section className="terms-section">
                <h3>2. Educational Use License</h3>
                <p>
                  Concept Accessor grants you a limited, non-exclusive, non-transferable 
                  license to use our platform for educational and research purposes.
                </p>
                <p><strong>You agree not to:</strong></p>
                <ul>
                  <li>Use the service for commercial purposes without authorization</li>
                  <li>Attempt to reverse engineer or decompile our technology</li>
                  <li>Upload malicious or copyrighted content without permission</li>
                  <li>Use automated systems to access our services excessively</li>
                </ul>
              </section>

              <section className="terms-section">
                <h3>3. User Responsibilities</h3>
                <p>As a user, you are responsible for:</p>
                <ul>
                  <li>Ensuring you have rights to upload and process any documents</li>
                  <li>Maintaining the confidentiality of your account (if applicable)</li>
                  <li>Using the platform in compliance with applicable laws</li>
                  <li>Providing accurate information when required</li>
                </ul>
              </section>

              <section className="terms-section">
                <h3>4. Intellectual Property</h3>
                <p>
                  <strong>Your Content:</strong> You retain ownership of any educational 
                  content you upload. By uploading, you grant us license to process and 
                  analyze the content to provide our services.
                </p>
                <p>
                  <strong>Our Technology:</strong> The Concept Accessor platform, including 
                  all AI algorithms, software, and interface designs, is the intellectual 
                  property of IIIT Hyderabad and its researchers.
                </p>
              </section>

              <section className="terms-section">
                <h3>5. Service Availability</h3>
                <p>
                  We strive to maintain 24/7 service availability but do not guarantee 
                  uninterrupted access. We may perform maintenance, updates, or modify 
                  services with reasonable notice.
                </p>
              </section>

              <section className="terms-section">
                <h3>6. Limitation of Liability</h3>
                <p>
                  Concept Accessor is provided "as is" for educational purposes. We are 
                  not liable for:
                </p>
                <ul>
                  <li>Accuracy of generated content and translations</li>
                  <li>Technical issues or service interruptions</li>
                  <li>Educational outcomes resulting from platform use</li>
                  <li>Third-party content or links</li>
                </ul>
              </section>

              <section className="terms-section">
                <h3>7. Termination</h3>
                <p>
                  We reserve the right to terminate or suspend access to our service 
                  immediately, without prior notice, for conduct that violates these 
                  terms or may harm our platform or other users.
                </p>
              </section>

              <section className="terms-section">
                <h3>8. Changes to Terms</h3>
                <p>
                  We may update these Terms of Service periodically. Continued use of 
                  our platform after changes constitutes acceptance of the modified terms.
                </p>
              </section>

              <section className="terms-section">
                <h3>9. Governing Law</h3>
                <p>
                  These terms shall be governed by the laws of India. Any disputes shall 
                  be subject to the exclusive jurisdiction of the courts in Hyderabad.
                </p>
              </section>

              <section className="terms-section">
                <h3>10. Contact</h3>
                <p>
                  For questions about these Terms of Service, please contact:
                </p>
                <div className="contact-info">
                  <p>
                    <strong>Email:</strong>{' '}
                    <a href="mailto:sashank.tatavolu@research.iiit.ac.in">
                      sashank.tatavolu@research.iiit.ac.in
                    </a>
                  </p>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="legal-footer">
          <p>
            By using Concept Accessor, you acknowledge that you have read, understood, 
            and agree to be bound by these policies and terms.
          </p>
        </div>
      </div>
    </div>
  );
}