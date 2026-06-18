// src/components/QuickStartGuide.js
import React, { useState, useEffect } from 'react';

const QuickStartGuide = ({ onComplete, userId, chapterId }) => {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(true);
  
  useEffect(() => {
    const hasSeenQuickStart = localStorage.getItem(`quickstart_${userId}_${chapterId}`);
    if (hasSeenQuickStart) {
      setShow(false);
    }
  }, [userId, chapterId]);
  
  const steps = [
    {
      text: "🔍 Click on any highlighted word",
      highlight: ".pdf-viewer mark",
      action: () => {
        const firstTerm = document.querySelector('.pdf-viewer mark');
        if (firstTerm) {
          firstTerm.style.animation = 'pulse 0.5s 3';
          firstTerm.click();
        }
      }
    },
    {
      text: "🗺️ Watch the Concept Map appear",
      highlight: ".analysis-panel",
      action: null
    },
    {
      text: "🎧 Click the speaker to hear pronunciation",
      highlight: ".audio-button, button:has(▶)",
      action: () => {
        const audioBtn = document.querySelector('.audio-button, button:has(▶)');
        if (audioBtn) audioBtn.click();
      }
    },
    {
      text: "🌐 Try translating to your language",
      highlight: "select:has(option)",
      action: () => {
        const select = document.querySelector('select');
        if (select) select.focus();
      }
    },
    {
      text: "🎉 You're ready to learn!",
      highlight: null,
      action: null,
      isFinal: true
    }
  ];
  
  if (!show) return null;
  
  const currentStep = steps[step];
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '30px',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        animation: 'scaleIn 0.3s ease'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>
          {step === 0 && '🔍'}
          {step === 1 && '🗺️'}
          {step === 2 && '🎧'}
          {step === 3 && '🌐'}
          {step === 4 && '🎉'}
        </div>
        
        <h3 style={{ marginBottom: '15px', color: '#333' }}>
          {step === 0 && 'Find Your First Concept'}
          {step === 1 && 'Explore the Concept Map'}
          {step === 2 && 'Listen and Learn'}
          {step === 3 && 'Translate to Your Language'}
          {step === 4 && 'You\'re Ready!'}
        </h3>
        
        <p style={{ marginBottom: '20px', color: '#666', lineHeight: '1.6' }}>
          {currentStep.text}
        </p>
        
        {currentStep.highlight && (
          <div style={{
            padding: '10px',
            background: '#e8f4f8',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '12px'
          }}>
            💡 Look for the highlighted area in your PDF
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={() => {
              localStorage.setItem(`quickstart_${userId}_${chapterId}`, 'true');
              setShow(false);
              onComplete();
            }}
            style={{
              padding: '8px 20px',
              background: '#f0f0f0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            Skip
          </button>
          
          <button
            onClick={() => {
              if (currentStep.action) {
                currentStep.action();
              }
              
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                localStorage.setItem(`quickstart_${userId}_${chapterId}`, 'true');
                setShow(false);
                onComplete();
              }
            }}
            style={{
              padding: '8px 25px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'white',
              fontWeight: 'bold'
            }}
          >
            {step === steps.length - 1 ? 'Start Learning! 🚀' : 'Next →'}
          </button>
        </div>
        
        <div style={{
          marginTop: '15px',
          display: 'flex',
          justifyContent: 'center',
          gap: '8px'
        }}>
          {steps.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: idx === step ? '#667eea' : '#ddd',
                transition: 'all 0.3s'
              }}
            />
          ))}
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

export default QuickStartGuide;