import React, { useState, useEffect } from 'react';
import { getGameQuestions } from '../../games/api';

// Each question has 4 visual clues (emoji + label) and one common biology word
const FourPicsOneWord = ({ onBack, onRestart }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'correct' or 'wrong'
  const [showHint, setShowHint] = useState(false);
  const [skippedCount, setSkippedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameStartTime] = useState(Date.now());
  const [gameEndTime, setGameEndTime] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const data = await getGameQuestions('fourPics');
        setQuestions(data);
      } catch (err) {
        console.warn("Failed to fetch questions for fourPics from backend, using fallback:", err);
      }
    };
    loadQuestions();
  }, []);

  // Must be defined before early return to avoid React hooks ordering violation
  useEffect(() => {
    if (gameOver) {
      const reportData = {
        played: true,
        completed: true,
        score: score,
        maxScore: questions.length * 100,
        timestamp: Date.now()
      };
      localStorage.setItem('game_fourPics', JSON.stringify(reportData));
      window.dispatchEvent(new Event('biology_game_score_updated'));
    }
  }, [gameOver, score, questions.length]);

  if (questions.length === 0) {
    return (
      <div className="game-area fade-in">
        <header className="game-header">
          <button onClick={onBack} className="back-btn">← Back</button>
          <h1>🖼️ 4 Pics 1 Word</h1>
        </header>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', fontSize: '1.2rem', opacity: 0.7 }}>
          Loading questions...
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx] || questions[0];

  const goToNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1);
      setUserInput('');
      setShowHint(false);
      setMessage('');
      setIsLocked(false);
    } else {
      setGameOver(true);
      setGameEndTime(Date.now());
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLocked || !userInput.trim()) return;

    if (userInput.trim().toUpperCase() === currentQuestion.word) {
      setCorrectCount(prev => prev + 1);
      setScore(prev => prev + (showHint ? 50 : 100));
      setMessage('✅ Correct!');
      setMessageType('correct');
      setIsLocked(true);
      setTimeout(goToNext, 1500);
    } else {
      setMessage('❌ Try again!');
      setMessageType('wrong');
      setTimeout(() => setMessage(''), 1500);
    }
  };

  const handleSkip = () => {
    if (isLocked) return;
    setSkippedCount(prev => prev + 1);
    setMessage(`The word was "${currentQuestion.word}"`);
    setMessageType('wrong');
    setIsLocked(true);
    setTimeout(goToNext, 2000);
  };

  const formatTime = (timeInMs) => {
    if (!timeInMs) return '0s';
    const totalSeconds = Math.floor(timeInMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const timeTaken = gameEndTime ? gameEndTime - gameStartTime : 0;

  return (
    <div className="game-area fade-in">
      <header className="game-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <h1>🖼️ 4 Pics 1 Word</h1>
        <div className="header-stats">
          <div className="question-counter">{currentIdx + 1} / {questions.length}</div>
          <div className="score-box">
            <span className="label">Score</span>
            <span className="value">{score}</span>
          </div>
        </div>
      </header>

      {gameOver ? (
        <div className="game-over-screen slide-in">
          <h2>🎉 Game Complete!</h2>
          <div className="stats-container">
            <p>Total Questions: <span>{questions.length}</span></p>
            <p>Correct: <span className="text-success">{correctCount}</span></p>
            <p>Skipped: <span className="text-muted">{skippedCount}</span></p>
            <p>Final Score: <span className="text-success">{score}</span></p>
            <p>Time Taken: <span>{formatTime(timeTaken)}</span></p>
          </div>
          <button onClick={onRestart} className="btn primary-btn">Play Again</button>
          <button onClick={onBack} className="btn secondary-btn" style={{ marginTop: '10px' }}>Main Menu</button>
        </div>
      ) : (
        <div className="four-pics-wrapper">
          <div className="pics-grid">
            {currentQuestion.clues.map((clue, i) => (
              <div key={i} className="pic-card">
                <span className="pic-emoji">{clue.emoji}</span>
                <span className="pic-label">{clue.label}</span>
              </div>
            ))}
          </div>

          <div className="guess-section">
            <p className="guess-instruction">What is the common word?</p>

            {showHint && (
              <div className="hint-box" style={{ marginBottom: '15px' }}>
                <h3>Hint</h3>
                <p>{currentQuestion.hint}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="guess-form">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type the word..."
                className="word-input"
                autoFocus
                disabled={isLocked}
              />
              <div className="guess-actions">
                <button type="submit" className="btn primary-btn" disabled={!userInput.trim() || isLocked} style={{ marginTop: 0 }}>
                  Submit
                </button>
                {!showHint && (
                  <button type="button" className="btn secondary-btn" onClick={() => setShowHint(true)} disabled={isLocked}>
                    Show Hint
                  </button>
                )}
                <button type="button" className="btn danger-btn" onClick={handleSkip} disabled={isLocked}>
                  Skip
                </button>
              </div>
            </form>

            {message && (
              <div className={`guess-message fade-in ${messageType === 'correct' ? 'text-success' : 'text-danger'}`}>
                {message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FourPicsOneWord;
