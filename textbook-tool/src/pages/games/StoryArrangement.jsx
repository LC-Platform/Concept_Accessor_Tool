import React, { useState, useEffect } from 'react';
import { getGameQuestions } from '../../games/api';

const STORIES = [
  {
    id: 1,
    type: 'non-pictorial',
    title: 'The Prodigal Son',
    correctOrder: [
      "Once there lived a rich farmer.",
      "He had two sons.",
      "They were living together happily.",
      "Years went by. The younger son began to get restless because he was unhappy with his lot.",
      "He went to his father and asked for his share of the property.",
      "The father tried to dissuade his son, but he wouldn’t listen to his father whom he regarded as old and ignorant.",
      "So the father gave him a third of his property.",
      "The young man sold his share of the property and left for another country.",
      "He led a luxurious life and spent a lot of money on gambling.",
      "Soon all his money was gone and he became a pauper."
    ]
  },
  {
    id: 2,
    type: 'pictorial',
    title: 'Plant Life Cycle',
    correctOrder: [
      { id: '1', content: '🌰 Seed in soil' },
      { id: '2', content: '🌱 Small sprout' },
      { id: '3', content: '🪴 Plant with leaves' },
      { id: '4', content: '🌻 Plant with flower' },
      { id: '5', content: '🍎 Plant with fruit' }
    ]
  }
];

export default function StoryArrangement({ onBack, onRestart }) {
  const [stories, setStories] = useState(STORIES);
  const [storyIndex, setStoryIndex] = useState(0);
  const [items, setItems] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadStories = async () => {
      try {
        const data = await getGameQuestions('storyArrangement');
        setStories(data);
      } catch (err) {
        console.warn("Failed to fetch stories from backend, using fallback:", err);
      }
    };
    loadStories();
  }, []);

  const currentStory = stories[storyIndex] || stories[0] || null;

  useEffect(() => {
    if (!currentStory) return;
    // Shuffle the items for the current story
    const toShuffle = currentStory.type === 'pictorial' 
      ? [...currentStory.correctOrder] 
      : currentStory.correctOrder.map((text, i) => ({ id: i.toString(), content: text }));
    
    // Simple shuffle
    for (let i = toShuffle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [toShuffle[i], toShuffle[j]] = [toShuffle[j], toShuffle[i]];
    }
    setItems(toShuffle);
    setMessage('');
    setGameOver(false);
    setGameWon(false);
  }, [storyIndex, currentStory]);

  React.useEffect(() => {
    if (gameOver) {
      const reportData = {
        played: true,
        completed: true,
        score: score,
        maxScore: stories.length * 100,
        timestamp: Date.now()
      };
      localStorage.setItem('game_storyArrangement', JSON.stringify(reportData));
      window.dispatchEvent(new Event('biology_game_score_updated'));
    }
  }, [gameOver, score, stories.length]);

  if (stories.length === 0) return null;

  const moveItem = (index, direction) => {
    if (gameOver) return;
    const newItems = [...items];
    if (direction === 'up' && index > 0) {
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    } else if (direction === 'down' && index < newItems.length - 1) {
      [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
    }
    setItems(newItems);
  };

  const handleCheck = () => {
    let isCorrect = true;
    const correctArr = currentStory.type === 'pictorial' 
      ? currentStory.correctOrder 
      : currentStory.correctOrder.map((text, i) => ({ id: i.toString(), content: text }));

    for (let i = 0; i < items.length; i++) {
      if (items[i].content !== correctArr[i].content) {
        isCorrect = false;
        break;
      }
    }

    if (isCorrect) {
      setScore(prev => prev + 100);
      if (storyIndex + 1 < stories.length) {
        setMessage('Correct! Moving to next story...');
        setTimeout(() => setStoryIndex(prev => prev + 1), 2000);
      } else {
        setMessage('You arranged all stories perfectly!');
        setGameWon(true);
        setGameOver(true);
      }
    } else {
      setMessage('Not quite right. Keep arranging!');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleSkip = () => {
    if (storyIndex + 1 < stories.length) {
      setStoryIndex(prev => prev + 1);
    } else {
      setGameWon(false);
      setGameOver(true);
    }
  };

  const handleEndGame = () => {
    setGameWon(false);
    setGameOver(true);
  };

  
  

  return (
    <div className="game-area fade-in story-game">
      <header className="game-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <h1>Story Arrangement</h1>
        <div className="header-stats">
          <div className="score-box">
            <span className="label">Story</span>
            <span className="value">{storyIndex + 1} / {stories.length}</span>
          </div>
          <div className="score-box">
            <span className="label">Score</span>
            <span className="value">{score}</span>
          </div>
        </div>
      </header>

      {gameOver ? (
        <div className="game-over-screen slide-in">
          <h2>{gameWon ? '🏆 Master Storyteller!' : 'Game Over'}</h2>
          <div className="stats-container">
            <p>Final Score: <span className="text-success">{score}</span></p>
          </div>
          <button onClick={onRestart} className="btn primary-btn" style={{marginTop: '20px'}}>Play Again</button>
          <button onClick={onBack} className="btn secondary-btn" style={{marginTop: '10px'}}>Main Menu</button>
        </div>
      ) : (
        <div className="story-content">
          <div className="story-instructions">
            <h3>{currentStory.title}</h3>
            <p>Use the up and down arrows to arrange the {currentStory.type === 'pictorial' ? 'images' : 'sentences'} into a logical sequence.</p>
          </div>

          <div className={`story-list ${currentStory.type === 'pictorial' ? 'pictorial-mode' : ''}`}>
            {items.map((item, idx) => (
              <div key={item.id} className="story-item slide-in">
                <div className="story-order-controls">
                  <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0}>▲</button>
                  <button onClick={() => moveItem(idx, 'down')} disabled={idx === items.length - 1}>▼</button>
                </div>
                <div className="story-item-content">
                  {item.content}
                </div>
              </div>
            ))}
          </div>

          <div className="story-message-area">
            {message && <div className="story-message slide-in">{message}</div>}
          </div>

          <div className="controls" style={{marginTop: '20px', gap: '10px', flexWrap: 'wrap'}}>
            <button onClick={handleCheck} className="btn primary-btn" style={{ margin: 0 }}>Check Sequence</button>
          </div>
          
          <div className="controls" style={{ marginTop: '15px', gap: '10px' }}>
            <button onClick={handleSkip} className="btn secondary-btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Skip Story</button>
            <button onClick={handleEndGame} className="btn danger-btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>End Game</button>
          </div>
        </div>
      )}
    </div>
  );
}
