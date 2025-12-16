// ContactPage.js
import React, { useState } from "react";
import "../components/styles/ContactPage.css";
import iiithLogo from "../assets/iiith_logo.png";
import { useNavigate } from "react-router-dom";

export default function ContactPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log("Form submitted:", formData);
    alert("Thank you for your message! We'll get back to you soon.");
    setFormData({
      name: "",
      email: "",
      subject: "",
      message: ""
    });
  };

  return (
    <div className="contact-container">
      {/* Header */}
      <div className="header-bar">
        <img src={iiithLogo} alt="IIIT Hyderabad" className="iiith-logo" />
        <button className="back-btn" onClick={() => navigate("/")}>← Back to Home</button>
      </div>

      {/* Main Content */}
      <div className="contact-content">
        <div className="contact-hero">
          <h1>Contact Us</h1>
          <p className="hero-subtitle">
            Get in touch with our team for support, feedback, or collaboration opportunities
          </p>
        </div>

        <div className="contact-sections">
          {/* Contact Information */}
          <section className="contact-info">
            <h2>Get In Touch</h2>
            <div className="contact-methods">
              <div className="contact-method">
                <div className="contact-icon">📧</div>
                <div className="contact-details">
                  <h3>Email Us</h3>
                  <p>We'll respond within 24 hours</p>
                  <div className="email-addresses">
                    <a href="mailto:sashank.tatavolu@research.iiit.ac.in">
                      sashank.tatavolu@research.iiit.ac.in
                    </a>
                    <a href="mailto:anjani.adapa@research.iiit.ac.in">
                      anjani.adapa@research.iiit.ac.in
                    </a>
                  </div>
                </div>
              </div>

              <div className="contact-method">
                <div className="contact-icon">🏛️</div>
                <div className="contact-details">
                  <h3>Visit Us</h3>
                  <p>International Institute of Information Technology</p>
                  <address>
                    Gachibowli, Hyderabad<br />
                    Telangana 500032, India
                  </address>
                </div>
              </div>

              <div className="contact-method">
                <div className="contact-icon">💬</div>
                <div className="contact-details">
                  <h3>Support Areas</h3>
                  <ul>
                    <li>Technical Support</li>
                    <li>Feature Requests</li>
                    <li>Research Collaboration</li>
                    <li>Educational Partnerships</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Form */}
          <section className="contact-form-section">
            <h2>Send us a Message</h2>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject *</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="What is this regarding?"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  placeholder="Please describe your inquiry in detail..."
                ></textarea>
              </div>

              <button type="submit" className="submit-btn">
                Send Message
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}