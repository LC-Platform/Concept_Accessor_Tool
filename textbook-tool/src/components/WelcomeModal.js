// src/components/WelcomeModal.js
import React, { useState } from 'react';

const WelcomeModal = ({ onStartTour, onSkip }) => {
  const [show, setShow] = useState(true);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        maxWidth: '500px',
        width: '90%',
        padding: '30px',
        textAlign: 'center',
        animation: 'scaleIn 0.3s ease'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎓</div>
        <h2 style={{ marginBottom: '10px', color: '#333' }}>Welcome to Your Smart E-Reader!</h2>
        <p style={{ color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
          You now have 5 superpowers to help you learn faster and understand better.
        </p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '15px',
          marginBottom: '30px'
        }}>
          <div style={{
            padding: '15px',
            background: '#f0f7ff',
            borderRadius: '10px',
            textAlign: 'center'
          }}> 
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔬</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Sentence Analysis</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Break down complex sentences</div>
          </div>
          
          <div style={{
            padding: '15px',
            background: '#f0f7ff',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Concept Maps</div>
            <div style={{ fontSize: '11px', color: '#666' }}>See how ideas connect</div>
          </div>
          
          <div style={{
            padding: '15px',
            background: '#f0f7ff',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔄</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Process Maps</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Visualize step-by-step</div>
          </div>
          
          <div style={{
            padding: '15px',
            background: '#f0f7ff',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎧</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Audio Learning</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Listen and learn</div>
          </div>
          
          <div style={{
            padding: '15px',
            background: '#f0f7ff',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌐</div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Translation</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Learn in your language</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={onSkip}
            style={{
              padding: '10px 25px',
              background: '#f0f0f0',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            Skip for now
          </button>
          <button
            onClick={onStartTour}
            style={{
              padding: '10px 25px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'white',
              fontWeight: 'bold'
            }}
          >
            Start Interactive Tour 🚀
          </button>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default WelcomeModal;