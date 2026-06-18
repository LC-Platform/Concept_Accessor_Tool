// src/components/USRGraphHelpButton.js
import React, { useState, useEffect } from 'react';
import USRGraphDemo from './USRGraphDemo';

const USRGraphHelpButton = ({ userId, onDemoComplete }) => {
  const [showDemo, setShowDemo] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const hasSeenDemo = localStorage.getItem('usr_graph_demo_seen');
    const hasSeenTooltip = localStorage.getItem(`graph_tooltip_${userId}`);
    
    if (!hasSeenDemo && !hasSeenTooltip) {
      setTimeout(() => setShowTooltip(true), 2000);
      setTimeout(() => setShowTooltip(false), 10000);
      localStorage.setItem(`graph_tooltip_${userId}`, 'true');
    }
  }, [userId]);

  return (
    <>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={() => setShowDemo(true)}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #4a2c8a, #6a3fc0)',
            border: 'none',
            borderRadius: '20px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: '0 2px 8px rgba(74,44,138,0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(74,44,138,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(74,44,138,0.3)';
          }}
        >
          <span style={{ fontSize: '16px' }}>🔬</span>
          How to Read This Graph?
          <span style={{ fontSize: '12px' }}>▼</span>
        </button>

        {showTooltip && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '12px',
            background: '#2c3e50',
            color: 'white',
            padding: '10px 15px',
            borderRadius: '10px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            animation: 'fadeInUp 0.3s ease',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
          }}>
            🎓 New to sentence graphs? Click here for a quick tutorial!
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid #2c3e50'
            }} />
          </div>
        )}
      </div>

      {showDemo && (
        <USRGraphDemo
          onClose={() => setShowDemo(false)}
          onComplete={() => {
            if (onDemoComplete) onDemoComplete();
            localStorage.setItem('usr_graph_demo_seen', 'true');
          }}
        />
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default USRGraphHelpButton;