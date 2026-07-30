import React, { useState, useEffect } from 'react';
import { getGameQuestions } from '../../games/api';

export default function Connections({ onBack, onRestart }) {
  const [connectionsSets, setConnectionsSets] = useState([]);
  const [setIndex] = useState(0);
  const [words, setWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState([]);
  const [foundGroups, setFoundGroups] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [message, setMessage] = useState('');
  
  const [startTime] = useState(Date.now());
  const [endTime, setEndTime] = useState(null);

  const currentSet = connectionsSets[setIndex] || connectionsSets[0] || null;
  const maxMistakes = 4;

  useEffect(() => {
    const loadSets = async () => {
      try {
        const data = await getGameQuestions('connections');
        setConnectionsSets(data);
      } catch (err) {
        console.warn("Failed to fetch connections sets from backend, using fallback:", err);
      }
    };
    loadSets();
  }, []);

  useEffect(() => {
    if (gameOver) {
      const reportData = {
        played: true,
        completed: true,
        score: score,
        maxScore: 400,
        timestamp: Date.now()
      };
      localStorage.setItem('game_connections', JSON.stringify(reportData));
      window.dispatchEvent(new Event('biology_game_score_updated'));
    }
  }, [gameOver, score]);

  useEffect(() => {
    if (!currentSet || !currentSet.groups) return;
    const allWords = currentSet.groups.flatMap(g => g.members);
    const shuffled = [...allWords].sort(() => Math.random() - 0.5);
    setWords(shuffled);
  }, [currentSet]);

  const handleWordClick = (word) => {
    if (gameOver || foundGroups.some(g => g.members.includes(word))) return;
    
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter(w => w !== word));
    } else {
      if (selectedWords.length < 4) {
        setSelectedWords([...selectedWords, word]);
      }
    }
  };

  const handleCheck = () => {
    if (selectedWords.length !== 4) return;

    const matchedGroup = currentSet.groups.find(
      g => g.members.every(member => selectedWords.includes(member))
    );

    if (matchedGroup) {
      const newFound = [...foundGroups, matchedGroup];
      setFoundGroups(newFound);
      setSelectedWords([]);
      setScore(prev => prev + 100);
      setMessage('Correct!');
      setTimeout(() => setMessage(''), 2000);

      if (newFound.length === 4) {
        setGameOver(true);
        setGameWon(true);
        setEndTime(Date.now());
      }
    } else {
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setMessage('Not a valid group...');
      setTimeout(() => setMessage(''), 2000);
      
      if (newMistakes >= maxMistakes) {
        setGameOver(true);
        setGameWon(false);
        setEndTime(Date.now());
      }
    }
  };

  const handleDeselectAll = () => {
    setSelectedWords([]);
  };

  const formatTime = (ms) => {
    if (!ms) return '0s';
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const timeTaken = endTime ? endTime - startTime : 0;
  
  const remainingWords = words.filter(w => !foundGroups.some(g => g.members.includes(w)));
  
  const groupColors = ['#fde68a', '#bbf7d0', '#bfdbfe', '#ddd6fe']; // Amber, Green, Blue, Violet (Light theme compatible)

  return (
    <div className="game-area fade-in">
      <header className="game-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <h1>🧩 Connections</h1>
        <div className="header-stats">
          <div className="score-box">
            <span className="label">Score</span>
            <span className="value">{score}</span>
          </div>
          <div className="score-box">
            <span className="label">Mistakes</span>
            <span className="value">{['⚫', '⚫', '⚫', '⚫'].slice(0, maxMistakes - mistakes).join('')}</span>
          </div>
        </div>
      </header>

      {gameOver ? (
        <div className="game-over-screen slide-in">
          <h2>{gameWon ? '🏆 Perfect! All groups identified.' : '❌ Game Over!'}</h2>
          <div className="stats-container">
            <p>Final Score: <span className="text-success">{score}</span></p>
            <p>Time Taken: <span>{formatTime(timeTaken)}</span></p>
          </div>
          
          <div className="found-groups-summary">
            <h3>The Groups Were:</h3>
            {currentSet.groups.map((g, i) => (
              <div key={i} className="found-group" style={{ backgroundColor: groupColors[i], color: '#1e293b' }}>
                <strong>{g.name}</strong>
                <p>{g.members.join(', ')}</p>
              </div>
            ))}
          </div>

          <button onClick={onRestart} className="btn primary-btn" style={{marginTop: '20px'}}>Play Again</button>
          <button onClick={onBack} className="btn secondary-btn" style={{ marginTop: '10px' }}>Main Menu</button>
        </div>
      ) : (
        <div className="connections-wrapper">
          <p className="connections-instructions">
            Find groups of four words that share a specific conceptual link.
          </p>
          
          <div className="connections-board">
            {foundGroups.map((group, i) => {
              const originalIndex = currentSet.groups.findIndex(g => g.name === group.name);
              return (
                <div key={`found-${i}`} className="found-group slide-in" style={{ backgroundColor: groupColors[originalIndex], color: '#1e293b' }}>
                  <strong>{group.name}</strong>
                  <p>{group.members.join(', ')}</p>
                </div>
              );
            })}
            
            <div className="connections-grid">
              {remainingWords.map((word, i) => (
                <button
                  key={i}
                  className={`connection-word ${selectedWords.includes(word) ? 'selected' : ''}`}
                  onClick={() => handleWordClick(word)}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
          
          <div className="connections-message">
             {message && <span className="fade-in">{message}</span>}
          </div>

          <div className="connections-actions">
            <button 
              className="btn secondary-btn" 
              onClick={handleDeselectAll}
              disabled={selectedWords.length === 0}
            >
              Deselect All
            </button>
            <button 
              className="btn primary-btn" 
              onClick={handleCheck}
              disabled={selectedWords.length !== 4}
              style={{ marginTop: 0 }}
            >
              Submit ({selectedWords.length}/4)
            </button>
          </div>
          
          <div className="controls" style={{ marginTop: '40px' }}>
            <button onClick={() => { setGameOver(true); setEndTime(Date.now()); }} className="btn danger-btn">End Game</button>
          </div>
        </div>
      )}
    </div>
  );
}
