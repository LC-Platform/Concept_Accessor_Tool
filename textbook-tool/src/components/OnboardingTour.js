// src/components/OnboardingTour.js
import React, { useState, useEffect, useRef } from 'react';

const OnboardingTour = ({ userId, chapterId, onComplete, isFirstChapter }) => {
  const [step, setStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [targetElement, setTargetElement] = useState(null);
  const tooltipRef = useRef(null);

  const steps = [
    {
      title: "🎯 Welcome to Your Smart Learning Assistant!",
      message: "You have 3 superpowers to help you learn faster and better. Let me show you how they work.",
      target: null,
      position: "center",
      action: null
    },
    {
      title: "🔬 Superpower #1: Sentence Analysis",
      message: "Stuck on a difficult sentence? Click any sentence to see it broken down into simple form with visual relationships. Try clicking a sentence now!",
      target: ".toggle-btn:contains('Sentence')",
      position: "bottom",
      action: () => {
        const sentenceBtn = Array.from(document.querySelectorAll('.toggle-btn'))
          .find(btn => btn.textContent === "Sentence");
        if (sentenceBtn) sentenceBtn.click();
      }
    },
    {
      title: "🗺️ Superpower #2: Concept Map",
      message: "Want to understand how ideas connect? Click on any highlighted word to see its concept map. The map shows relationships between topics visually!",
      target: ".toggle-btn:contains('Word')",
      position: "bottom",
      action: () => {
        const wordBtn = Array.from(document.querySelectorAll('.toggle-btn'))
          .find(btn => btn.textContent === "Word");
        if (wordBtn) wordBtn.click();
      }
    },
    {
      title: "🔄 Superpower #3: Process Map",
      message: "Need to understand a step-by-step process? Click the Concept Map tab to see how things flow from start to finish.",
      target: "button:contains('ConceptMap')",
      position: "left",
      action: () => {
        const conceptTab = Array.from(document.querySelectorAll('button'))
          .find(btn => btn.textContent === "ConceptMap");
        if (conceptTab) conceptTab.click();
      }
    },
    {
      title: "🎧 Superpower #4: Audio Learning",
      message: "Listen to definitions and translations! Click the speaker icon next to any term to hear pronunciation and explanations.",
      target: ".audio-button",
      position: "top",
      action: null
    },
    {
      title: "🌐 Superpower #5: Translation",
      message: "Learning in your native language? Use the translation dropdown to convert definitions and summaries into Hindi, Telugu, Bengali, and more!",
      target: "select:has(option:contains('Hindi'))",
      position: "top",
      action: null
    },
    {
      title: "🎯 Your Turn to Explore!",
      message: "Now it's your turn! Try clicking on any highlighted word in the PDF to see its concept map and definition. I'll be here if you need help!",
      target: ".pdf-viewer mark",
      position: "center",
      action: null,
      isFinal: true
    }
  ];

  useEffect(() => {
    if (steps[step].target && !steps[step].isFinal) {
      findAndPositionTarget();
    }
  }, [step]);

  const findAndPositionTarget = () => {
    let target = null;
    const selector = steps[step].target;
    
    if (selector === ".pdf-viewer mark") {
      target = document.querySelector(selector);
    } else if (selector === ".toggle-btn:contains('Sentence')") {
      target = Array.from(document.querySelectorAll('.toggle-btn'))
        .find(btn => btn.textContent === "Sentence");
    } else if (selector === ".toggle-btn:contains('Word')") {
      target = Array.from(document.querySelectorAll('.toggle-btn'))
        .find(btn => btn.textContent === "Word");
    } else if (selector === "button:contains('ConceptMap')") {
      target = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent === "ConceptMap");
    } else {
      target = document.querySelector(selector);
    }
    
    setTargetElement(target);
    
    if (target) {
      const rect = target.getBoundingClientRect();
      const tooltipRect = tooltipRef.current?.getBoundingClientRect() || { width: 300, height: 200 };
      
      let top = rect.top - 10;
      let left = rect.left + (rect.width / 2) - 150;
      
      if (steps[step].position === "bottom") {
        top = rect.bottom + 10;
      } else if (steps[step].position === "left") {
        left = rect.left - 310;
        top = rect.top + (rect.height / 2) - 100;
      } else if (steps[step].position === "right") {
        left = rect.right + 10;
        top = rect.top + (rect.height / 2) - 100;
      } else if (steps[step].position === "center") {
        top = window.innerHeight / 2 - 100;
        left = window.innerWidth / 2 - 150;
      }
      
      // Ensure tooltip stays in viewport
      top = Math.max(10, Math.min(top, window.innerHeight - (tooltipRect?.height || 200) - 10));
      left = Math.max(10, Math.min(left, window.innerWidth - (tooltipRect?.width || 300) - 10));
      
      setPosition({ top, left });
    }
  };

  const handleNext = () => {
    if (steps[step].action) {
      steps[step].action();
    }
    
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem(`onboarding_complete_${userId}_${chapterId}`, 'true');
      localStorage.setItem(`onboarding_seen`, 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(`onboarding_complete_${userId}_${chapterId}`, 'true');
    localStorage.setItem(`onboarding_seen`, 'true');
    onComplete();
  };

  const isFinal = steps[step].isFinal;
  const showTargetHighlight = targetElement && !isFinal;

  return (
    <>
      {showTargetHighlight && (
        <div
          style={{
            position: 'fixed',
            top: targetElement?.getBoundingClientRect().top - 5,
            left: targetElement?.getBoundingClientRect().left - 5,
            width: targetElement?.getBoundingClientRect().width + 10,
            height: targetElement?.getBoundingClientRect().height + 10,
            border: '3px solid #ff9800',
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            zIndex: 9998,
            pointerEvents: 'none',
            animation: 'pulse 1.5s infinite'
          }}
        />
      )}
      
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          maxWidth: '320px',
          zIndex: 9999,
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          animation: 'slideIn 0.3s ease'
        }}
      >
        <div style={{ position: 'relative' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
            {steps[step].title}
          </h3>
          <p style={{ margin: '0 0 15px 0', lineHeight: '1.5', fontSize: '14px' }}>
            {steps[step].message}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            {!isFinal && (
              <button
                onClick={handleSkip}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Skip Tour
              </button>
            )}
            <button
              onClick={handleNext}
              style={{
                padding: '8px 20px',
                background: 'white',
                color: '#667eea',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px'
              }}
            >
              {isFinal ? 'Start Learning! 🚀' : (step === steps.length - 2 ? 'Got it! →' : 'Next →')}
            </button>
          </div>
          <div style={{
            position: 'absolute',
            top: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid #667eea',
            display: steps[step].position === 'top' ? 'block' : 'none'
          }} />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0% { border-color: #ff9800; box-shadow: 0 0 0 0 rgba(255,152,0,0.4); }
          70% { border-color: #ff9800; box-shadow: 0 0 0 10px rgba(255,152,0,0); }
          100% { border-color: #ff9800; box-shadow: 0 0 0 0 rgba(255,152,0,0); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default OnboardingTour;