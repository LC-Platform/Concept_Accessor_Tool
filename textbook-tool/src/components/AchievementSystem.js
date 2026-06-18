// src/components/AchievementSystem.js
import React, { useState, useEffect } from 'react';

const achievements = {
  firstClick: {
    id: 'firstClick',
    title: '🔍 First Explorer',
    description: 'Clicked on your first concept',
    icon: '🔍',
    points: 10
  },
  firstConceptMap: {
    id: 'firstConceptMap',
    title: '🗺️ Map Maker',
    description: 'Viewed your first concept map',
    icon: '🗺️',
    points: 20
  },
  firstTranslation: {
    id: 'firstTranslation',
    title: '🌐 Polyglot',
    description: 'Used translation feature',
    icon: '🌐',
    points: 15
  },
  firstAudio: {
    id: 'firstAudio',
    title: '🎧 Active Listener',
    description: 'Listened to audio pronunciation',
    icon: '🎧',
    points: 10
  },
  firstSentenceAnalysis: {
    id: 'firstSentenceAnalysis',
    title: '🔬 Sentence Master',
    description: 'Analyzed your first sentence',
    icon: '🔬',
    points: 25
  },
  exploreThreeConcepts: {
    id: 'exploreThreeConcepts',
    title: '🌟 Curious Mind',
    description: 'Explored 3 different concepts',
    icon: '🌟',
    points: 30
  },
  tenMinutesReading: {
    id: 'tenMinutesReading',
    title: '⏱️ Focused Learner',
    description: 'Read for 10 minutes straight',
    icon: '⏱️',
    points: 20
  }
};

export const AchievementNotification = ({ achievement, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const achievementData = achievements[achievement];

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #4caf50, #45a049)',
      color: 'white',
      padding: '15px 20px',
      borderRadius: '12px',
      animation: 'slideInRight 0.3s ease, fadeOut 0.3s ease 4.7s',
      zIndex: 10000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      maxWidth: '300px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '32px' }}>{achievementData.icon}</div>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>🏆 Achievement Unlocked!</div>
          <div style={{ fontSize: '13px', marginTop: '2px' }}>{achievementData.title}</div>
          <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.9 }}>{achievementData.description}</div>
          <div style={{ fontSize: '11px', marginTop: '4px', color: '#ffd700' }}>+{achievementData.points} XP</div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeOut {
          to {
            opacity: 0;
            transform: translateX(100px);
          }
        }
      `}</style>
    </div>
  );
};

export const useAchievements = (userId) => {
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [totalXP, setTotalXP] = useState(0);

  useEffect(() => {
    // Load unlocked achievements from localStorage
    const saved = localStorage.getItem(`achievements_${userId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setUnlockedAchievements(parsed);
    }
    
    const savedXP = localStorage.getItem(`xp_${userId}`);
    if (savedXP) {
      setTotalXP(parseInt(savedXP));
    }
  }, [userId]);

  const unlockAchievement = (achievementId) => {
    if (unlockedAchievements.includes(achievementId)) return null;
    
    const achievement = achievements[achievementId];
    if (!achievement) return null;
    
    const newAchievements = [...unlockedAchievements, achievementId];
    setUnlockedAchievements(newAchievements);
    localStorage.setItem(`achievements_${userId}`, JSON.stringify(newAchievements));
    
    const newXP = totalXP + achievement.points;
    setTotalXP(newXP);
    localStorage.setItem(`xp_${userId}`, newXP.toString());
    
    setCurrentAchievement(achievementId);
    
    // Clear notification after 5 seconds
    setTimeout(() => setCurrentAchievement(null), 5000);
    
    return achievement;
  };

  const checkAndUnlock = (action, context = {}) => {
    switch(action) {
      case 'term_click':
        unlockAchievement('firstClick');
        // Check for 3 concepts explored
        const clickedTerms = JSON.parse(localStorage.getItem(`clicked_terms_${userId}`) || '[]');
        clickedTerms.push(Date.now());
        localStorage.setItem(`clicked_terms_${userId}`, JSON.stringify(clickedTerms));
        if (clickedTerms.length >= 3) {
          unlockAchievement('exploreThreeConcepts');
        }
        break;
        
      case 'concept_map_view':
        unlockAchievement('firstConceptMap');
        break;
        
      case 'translation_use':
        unlockAchievement('firstTranslation');
        break;
        
      case 'audio_play':
        unlockAchievement('firstAudio');
        break;
        
      case 'sentence_analysis':
        unlockAchievement('firstSentenceAnalysis');
        break;
        
      default:
        break;
    }
  };

  return {
    unlockedAchievements,
    currentAchievement,
    totalXP,
    checkAndUnlock,
    achievements
  };
};

// Achievement Badge Component
export const AchievementBadge = ({ achievementId, size = 'small' }) => {
  const achievement = achievements[achievementId];
  if (!achievement) return null;
  
  const sizes = {
    small: { fontSize: '20px', padding: '4px' },
    medium: { fontSize: '32px', padding: '8px' },
    large: { fontSize: '48px', padding: '12px' }
  };
  
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      background: '#f0f0f0',
      padding: sizes[size].padding,
      borderRadius: '8px'
    }}>
      <span style={{ fontSize: sizes[size].fontSize }}>{achievement.icon}</span>
      {size !== 'small' && (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{achievement.title}</div>
          <div style={{ fontSize: '10px', color: '#666' }}>+{achievement.points} XP</div>
        </div>
      )}
    </div>
  );
};

// XP Progress Bar Component
export const XPProgressBar = ({ currentXP, nextLevelXP = 100 }) => {
  const progress = (currentXP / nextLevelXP) * 100;
  
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
        <span>Level Progress</span>
        <span>{currentXP} / {nextLevelXP} XP</span>
      </div>
      <div style={{
        background: '#e0e0e0',
        borderRadius: '10px',
        overflow: 'hidden',
        height: '8px'
      }}>
        <div style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #ffd700, #ff9800)',
          height: '100%',
          transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  );
};