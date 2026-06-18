// src/components/HelpButton.js
import React, { useState } from 'react';

const HelpButton = ({ feature, onHelp, position = 'top-right' }) => {
  const [showHelp, setShowHelp] = useState(false);
  
  const getHelpContent = () => {
    const helpContents = {
      'concept-map': {
        title: '🗺️ How to Use Concept Maps',
        steps: [
          '1. Click on any highlighted word in the PDF',
          '2. The concept map will appear in this panel',
          '3. Click on connected nodes to explore related concepts',
          '4. Use zoom controls (+/-) to see details',
          '5. Double-click to zoom in/out'
        ],
        tip: '💡 Concept maps help you remember 50% more by showing visual connections between ideas!'
      },
      'sentence-analysis': {
        title: '🔬 How to Analyze Sentences',
        steps: [
          '1. Click the "Sentence" tab at the top',
          '2. Click on any sentence in the PDF',
          '3. See the simplified version appear',
          '4. Click "View Graph" to see the relationship map',
          '5. Use translation to understand in your language'
        ],
        tip: '💡 Break down complex sentences into simple, easy-to-understand pieces!'
      },
      'process-map': {
        title: '🔄 How to Use Process Maps',
        steps: [
          '1. Select a term that represents a process',
          '2. Click the "ConceptMap" tab',
          '3. Look for flow diagrams showing steps',
          '4. Follow the arrows to understand sequence',
          '5. Each step is explained in detail'
        ],
        tip: '💡 Process maps make complex workflows easy to understand at a glance!'
      },
      'translation': {
        title: '🌐 How to Translate Content',
        steps: [
          '1. Go to Definition or Summary section',
          '2. Click the language dropdown menu',
          '3. Select your preferred language',
          '4. Translation appears instantly',
          '5. Listen to audio in your language too!'
        ],
        tip: '💡 Available in Hindi, Telugu, Bengali, Marathi, Tamil, and Gujarati!'
      },
      'audio': {
        title: '🎧 How to Use Audio Learning',
        steps: [
          '1. Look for the speaker icon (▶) next to terms',
          '2. Click to hear pronunciation',
          '3. Listen to definitions and translations',
          '4. Perfect for auditory learners',
          '5. Improves pronunciation and retention'
        ],
        tip: '💡 Combine reading with listening to learn 2x faster!'
      }
    };
    
    return helpContents[feature] || {
      title: `💡 How to Use ${feature}`,
      steps: ['Click on features to learn how they work', 'Watch the tooltips for guidance', 'Try each feature to understand its value'],
      tip: '💡 The more you explore, the more you learn!'
    };
  };
  
  const content = getHelpContent();
  
  const positionStyles = {
    'top-right': { top: '10px', right: '10px' },
    'top-left': { top: '10px', left: '10px' },
    'bottom-right': { bottom: '10px', right: '10px' },
    'bottom-left': { bottom: '10px', left: '10px' }
  };
  
  return (
    <>
      <button
        onClick={() => setShowHelp(!showHelp)}
        style={{
          position: 'absolute',
          ...positionStyles[position],
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: '#4a90e2',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          transition: 'all 0.2s',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.background = '#357abd';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.background = '#4a90e2';
        }}
      >
        ?
      </button>
      
      {showHelp && (
        <div
          style={{
            position: 'absolute',
            ...(position === 'top-right' && { top: '40px', right: '10px' }),
            ...(position === 'top-left' && { top: '40px', left: '10px' }),
            ...(position === 'bottom-right' && { bottom: '40px', right: '10px' }),
            ...(position === 'bottom-left' && { bottom: '40px', left: '10px' }),
            background: 'white',
            borderRadius: '8px',
            padding: '15px',
            width: '280px',
            zIndex: 101,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #e0e0e0'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '14px' }}>{content.title}</h4>
            <button
              onClick={() => setShowHelp(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#999'
              }}
            >
              ✕
            </button>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            {content.steps.map((step, idx) => (
              <div key={idx} style={{ fontSize: '12px', marginBottom: '8px', color: '#555' }}>
                {step}
              </div>
            ))}
          </div>
          
          <div style={{
            padding: '8px',
            background: '#fff3cd',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#856404'
          }}>
            {content.tip}
          </div>
          
          <button
            onClick={() => {
              if (onHelp) onHelp();
              setShowHelp(false);
            }}
            style={{
              marginTop: '12px',
              width: '100%',
              padding: '6px',
              background: '#4a90e2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Got it! Try it now →
          </button>
        </div>
      )}
    </>
  );
};

export default HelpButton;