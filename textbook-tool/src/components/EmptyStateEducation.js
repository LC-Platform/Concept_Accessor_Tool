// src/components/EmptyStateEducation.js
import React, { useState } from 'react';

export const WordEmptyState = () => {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      borderRadius: '12px',
      margin: '20px',
      animation: 'fadeIn 0.5s ease'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
      <h3 style={{ marginBottom: '10px', color: '#333' }}>Explore Concepts Like Never Before</h3>
      <p style={{ marginBottom: '20px', color: '#555' }}>
        Click on any highlighted term in the PDF to unlock powerful learning tools
      </p>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'transform 0.2s',
          onMouseEnter: (e) => e.currentTarget.style.transform = 'translateY(-5px)',
          onMouseLeave: (e) => e.currentTarget.style.transform = 'translateY(0)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📖</div>
          <strong>Definition</strong>
          <p style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
            Get clear explanations with audio pronunciation
          </p>
        </div>
        
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'transform 0.2s',
          onMouseEnter: (e) => e.currentTarget.style.transform = 'translateY(-5px)',
          onMouseLeave: (e) => e.currentTarget.style.transform = 'translateY(0)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
          <strong>Concept Map</strong>
          <p style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
            See how ideas connect visually
          </p>
        </div>
        
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'transform 0.2s',
          onMouseEnter: (e) => e.currentTarget.style.transform = 'translateY(-5px)',
          onMouseLeave: (e) => e.currentTarget.style.transform = 'translateY(0)'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎬</div>
          <strong>Media Gallery</strong>
          <p style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
            Watch videos and explore diagrams
          </p>
        </div>
      </div>
      
      <button
        onClick={() => setShowDetails(!showDetails)}
        style={{
          padding: '8px 16px',
          background: '#4a90e2',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        {showDetails ? 'Show less' : 'Learn how this helps you →'}
      </button>
      
      {showDetails && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '8px',
          textAlign: 'left'
        }}>
          <h4 style={{ marginBottom: '10px' }}>💡 Why this helps you learn better:</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>🧠 <strong>Remember 50% more</strong> - Visual connections improve memory retention</li>
            <li>⚡ <strong>Learn 2x faster</strong> - Break down complex ideas into simple concepts</li>
            <li>🎯 <strong>Understand deeply</strong> - See how topics relate to each other</li>
            <li>🔊 <strong>Multi-sensory learning</strong> - Listen, read, and visualize simultaneously</li>
          </ul>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
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

export const SentenceEmptyState = () => {
  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
      borderRadius: '12px',
      margin: '20px',
      animation: 'fadeIn 0.5s ease'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔬</div>
      <h3 style={{ marginBottom: '10px', color: '#2e7d32' }}>Master Difficult Sentences</h3>
      <p style={{ marginBottom: '20px', color: '#555' }}>
        Click any sentence in the PDF to:
      </p>
      
      <div style={{ textAlign: 'left', maxWidth: '300px', margin: '0 auto' }}>
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>✅</span>
          <div>
            <strong>See simplified version</strong>
            <div style={{ fontSize: '12px', color: '#666' }}>Complex ideas made easy to understand</div>
          </div>
        </div>
        
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🗺️</span>
          <div>
            <strong>Visual relationship map</strong>
            <div style={{ fontSize: '12px', color: '#666' }}>See how each part connects</div>
          </div>
        </div>
        
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🌐</span>
          <div>
            <strong>Translate to your language</strong>
            <div style={{ fontSize: '12px', color: '#666' }}>Available in 6 Indian languages</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SummaryEmptyState = () => {
  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
      borderRadius: '12px',
      margin: '20px'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>📝</div>
      <h3 style={{ marginBottom: '10px', color: '#e65100' }}>Get Section Summaries</h3>
      <p style={{ marginBottom: '20px', color: '#555' }}>
        Click on any section marker <span style={{ background: '#ff9800', padding: '2px 6px', borderRadius: '4px', color: 'white' }}>§</span> in the PDF to:
      </p>
      
      <div style={{ textAlign: 'left', maxWidth: '300px', margin: '0 auto' }}>
        <div style={{ marginBottom: '10px' }}>✓ Get instant summary of that section</div>
        <div style={{ marginBottom: '10px' }}>✓ Listen to audio summary</div>
        <div style={{ marginBottom: '10px' }}>✓ Translate to your preferred language</div>
        <div style={{ marginBottom: '10px' }}>✓ Save time by reading only key points</div>
      </div>
      
      <div style={{
        marginTop: '20px',
        padding: '10px',
        background: 'rgba(255,255,255,0.7)',
        borderRadius: '8px',
        fontSize: '12px'
      }}>
        💡 <strong>Pro tip:</strong> Section summaries help you review faster before exams!
      </div>
    </div>
  );
};