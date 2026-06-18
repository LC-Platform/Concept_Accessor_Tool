// src/components/GraphLegend.js
import React, { useState } from 'react';

const GraphLegend = ({ compact = false }) => {
  const [expanded, setExpanded] = useState(!compact);

  const legendItems = [
    {
      icon: "🔵",
      style: { border: "2.5px solid #4a2c8a", background: "white" },
      label: "Root/Main Verb",
      description: "The main action of the sentence",
      example: "runs, eats, studies, sleeps"
    },
    {
      icon: "🔗",
      style: { border: "1.5px solid #c0aee0", background: "white" },
      label: "Regular Word Node",
      description: "Nouns, adjectives, adverbs, etc.",
      example: "cat, black, quickly"
    },
    {
      icon: "📦",
      style: { border: "2px dashed #7733bb", background: "#ede8ff" },
      label: "Construction Node",
      description: "Groups multiple words as a phrase",
      example: "[nc_1] = 'the exam', [ne_1] = 'Kingdom Plantae'"
    },
    {
      icon: "➕",
      style: { border: "2px solid #cc8800", background: "#fff8ee" },
      label: "Collapsible Node",
      description: "Click to expand/collapse children",
      example: "Shows/hides connected nodes"
    },
    {
      icon: "🎯",
      style: { border: "1px solid #4caf50", background: "#e8f5e9" },
      label: "k1 (Subject)",
      description: "Who/What performs the action",
      example: "The cat sleeps → 'cat' is k1"
    },
    {
      icon: "🎯",
      style: { border: "1px solid #ff9800", background: "#fff3e0" },
      label: "k2 (Object)",
      description: "Who/What receives the action",
      example: "Eats fish → 'fish' is k2"
    }
  ];

  if (compact) {
    return (
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          background: '#f5f3ff',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '11px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          border: '1px solid #d0c8f0'
        }}
      >
        <span style={{ fontWeight: 'bold', color: '#4a2c8a' }}>📖 Legend</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', border: '2.5px solid #4a2c8a', background: 'white', borderRadius: '3px' }} />
          <span style={{ fontSize: '10px', color: '#666' }}>Root</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '16px', height: '16px', border: '2px dashed #7733bb', background: '#ede8ff', borderRadius: '3px' }} />
          <span style={{ fontSize: '10px', color: '#666' }}>Const</span>
        </div>
        <span style={{ color: '#4a2c8a', fontSize: '10px' }}>{expanded ? '▲' : '▼'}</span>
      </div>
    );
  }

  if (!expanded) return null;

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #d0c8f0',
      overflow: 'hidden',
      marginTop: '10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        padding: '12px 15px',
        background: 'linear-gradient(135deg, #4a2c8a, #6a3fc0)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📚</span>
          <strong>How to Read Sentence Graphs</strong>
        </div>
        <button
          onClick={() => setExpanded(false)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '4px',
            padding: '2px 8px',
            cursor: 'pointer',
            color: 'white',
            fontSize: '12px'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '15px' }}>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
          Sentence graphs show how words connect. Here's what each element means:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
          {legendItems.map((item, idx) => (
            <div key={idx} style={{
              display: 'flex',
              gap: '10px',
              padding: '10px',
              background: '#f8f9fa',
              borderRadius: '8px',
              alignItems: 'flex-start'
            }}>
              <div style={{ fontSize: '20px' }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '24px', height: '18px', ...item.style, borderRadius: '3px' }} />
                  <strong style={{ fontSize: '13px' }}>{item.label}</strong>
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{item.description}</div>
                <code style={{ fontSize: '10px', color: '#999' }}>Example: {item.example}</code>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: '15px',
          padding: '12px',
          background: '#e8eaf6',
          borderRadius: '8px',
          fontSize: '12px'
        }}>
          <strong>💡 Reading Tip:</strong> Start from the main verb (largest node with thickest border) and follow connections outward.
          The arc labels (k1, k2, mod, rt, etc.) tell you what type of relationship it is!
        </div>

        <div style={{
          marginTop: '10px',
          padding: '8px 12px',
          background: '#fff3e0',
          borderRadius: '8px',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>🔬</span>
          <span><strong>Pro Tip:</strong> Click on nodes with +/− signs to expand/collapse. Use zoom buttons to see details!</span>
        </div>
      </div>
    </div>
  );
};

export default GraphLegend;