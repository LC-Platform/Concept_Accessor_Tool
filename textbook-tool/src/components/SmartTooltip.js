// src/components/SmartTooltip.js
import React, { useState, useEffect, useRef } from 'react';

const SmartTooltip = ({ children, feature, userId, message, position = 'top' }) => {
  const [show, setShow] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const timeoutRef = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    // Check if user has used this feature before
    const usedFeature = localStorage.getItem(`used_${feature}_${userId}`);
    const dismissedTooltip = localStorage.getItem(`dismissed_${feature}_${userId}`);
    
    if (!usedFeature && !dismissedTooltip) {
      // Show tooltip after 3 seconds
      timeoutRef.current = setTimeout(() => {
        setShow(true);
      }, 3000);
    }
    
    return () => clearTimeout(timeoutRef.current);
  }, [feature, userId]);

  const handleUse = () => {
    localStorage.setItem(`used_${feature}_${userId}`, 'true');
    setHasInteracted(true);
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(`dismissed_${feature}_${userId}`, 'true');
    setShow(false);
  };

  const getTooltipContent = () => {
    const tips = {
      conceptMap: {
        title: "🗺️ Discover Concept Maps",
        message: message || "Click here to see how concepts connect! This helps you remember 50% more.",
        action: "View Map"
      },
      sentenceAnalysis: {
        title: "🔬 Analyze Any Sentence",
        message: message || "Click any sentence to break it down. Learn complex ideas easily!",
        action: "Try Now"
      },
      translation: {
        title: "🌐 Translate Content",
        message: message || "Learning in your language? Translate any definition or summary instantly!",
        action: "Translate"
      },
      audio: {
        title: "🎧 Listen & Learn",
        message: message || "Hear correct pronunciation and explanations. Great for auditory learners!",
        action: "Play Audio"
      },
      definition: {
        title: "📖 Quick Definitions",
        message: message || "Get clear definitions with examples. Never get stuck on difficult words!",
        action: "See Definition"
      }
    };
    
    return tips[feature] || {
      title: "💡 Pro Tip",
      message: message || "This feature helps you learn faster. Give it a try!",
      action: "Try It"
    };
  };

  const tooltipContent = getTooltipContent();

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      {children}
      
      {show && !hasInteracted && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            zIndex: 1000,
            ...(position === 'top' && {
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: '10px'
            }),
            ...(position === 'bottom' && {
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: '10px'
            }),
            ...(position === 'left' && {
              right: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              marginRight: '10px'
            }),
            ...(position === 'right' && {
              left: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              marginLeft: '10px'
            }),
            minWidth: '250px',
            background: '#2c3e50',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            animation: 'fadeInUp 0.3s ease'
          }}
        >
          {/* Arrow */}
          <div style={{
            position: 'absolute',
            ...(position === 'top' && {
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid #2c3e50'
            }),
            ...(position === 'bottom' && {
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid #2c3e50'
            }),
            ...(position === 'left' && {
              left: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderLeft: '8px solid #2c3e50'
            }),
            ...(position === 'right' && {
              right: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderRight: '8px solid #2c3e50'
            })
          }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
            <strong style={{ color: '#ffd700', fontSize: '13px' }}>
              {tooltipContent.title}
            </strong>
            <button
              onClick={handleDismiss}
              style={{
                background: 'none',
                border: 'none',
                color: '#999',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px'
              }}
            >
              ✕
            </button>
          </div>
          
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', lineHeight: '1.4', color: '#ecf0f1' }}>
            {tooltipContent.message}
          </p>
          
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleDismiss}
              style={{
                padding: '4px 10px',
                background: 'transparent',
                border: '1px solid #7f8c8d',
                borderRadius: '4px',
                color: '#bdc3c7',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Not now
            </button>
            <button
              onClick={handleUse}
              style={{
                padding: '4px 10px',
                background: '#3498db',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 'bold'
              }}
            >
              {tooltipContent.action} →
            </button>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default SmartTooltip;