import React, { useState, useEffect } from 'react';
import { questions as defaultQuestions } from './questions';
import { getGameQuestions } from '../../games/api';

const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const OddOneOut = ({ onBack, onRestart }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentOptions, setCurrentOptions] = useState([]);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [skipCount, setSkipCount] = useState(0);
  const [fastSkipCount, setFastSkipCount] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [gameStartTime] = useState(Date.now());
  const [gameEndTime, setGameEndTime] = useState(null);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const data = await getGameQuestions('oddOneOut');
        setQuestions(shuffleArray(data));
      } catch (err) {
        console.warn("Failed to fetch questions for oddOneOut from backend, using fallback:", err);
        setQuestions(shuffleArray(defaultQuestions));
      }
    };
    loadQuestions();
  }, []);

  useEffect(() => {
    if (questions.length > 0 && !gameOver) {
      const q = questions[currentQuestionIndex];
      setCurrentOptions(shuffleArray(q.words));
    }
  }, [currentQuestionIndex, questions, gameOver]);

  useEffect(() => {
    if (!gameOver && questions.length > 0) {
      setQuestionStartTime(Date.now());
      setShowHint(false);
    }
  }, [currentQuestionIndex, questions, gameOver]);

  useEffect(() => {
    if (gameOver || isAnimating || questions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeOut();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameOver, isAnimating, questions, currentQuestionIndex]);

  const getResponseTime = () => Math.max(0, Date.now() - questionStartTime);

  const handleShowHint = () => {
    if (!showHint) {
      setShowHint(true);
      setHintCount((prev) => prev + 1);
    }
  };

  const handleTimeOut = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSkipCount((prev) => prev + 1);
    setTimeout(() => moveToNextQuestion(), 1000);
  };

  const handleAnswer = (word) => {
    if (isAnimating) return;
    const responseTime = getResponseTime();
    setIsAnimating(true);
    setSelectedWord(word);

    const currentQuestion = questions[currentQuestionIndex];
    if (word === currentQuestion.answer) {
      setScore((prev) => prev + 10);
      setCorrectCount((prev) => prev + 1);
    } else {
      setWrongCount((prev) => prev + 1);
      if (responseTime < 3000) {
        setFastSkipCount((prev) => prev + 1);
      }
    }

    setTimeout(() => moveToNextQuestion(), 1000);
  };

  const handleSkip = () => {
    if (isAnimating) return;
    const responseTime = getResponseTime();
    setIsAnimating(true);
    setSkipCount((prev) => prev + 1);
    if (responseTime < 4000) {
      setFastSkipCount((prev) => prev + 1);
    }
    setTimeout(() => moveToNextQuestion(), 500);
  };

  const moveToNextQuestion = () => {
    if (currentQuestionIndex + 1 >= questions.length) {
      setGameEndTime(Date.now());
      setGameOver(true);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeLeft(15);
    }
    setIsAnimating(false);
    setSelectedWord(null);
  };

  const formatTime = (timeInMs) => {
    if (!timeInMs) return '0s';
    const totalSeconds = Math.floor(timeInMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const timeTaken = gameEndTime ? gameEndTime - gameStartTime : 0;
  const avgResponseTime = questions.length > 0 ? (timeTaken / 1000) / questions.length : 0;
  const behaviorScore = Math.max(
    0,
    Math.min(
      100,
      100 - fastSkipCount * 15 - hintCount * 12 + (avgResponseTime > 7 ? 5 : 0)
    )
  );

  useEffect(() => {
    if (gameOver) {
      const reportData = {
        played: true,
        completed: true,
        score: score,
        maxScore: questions.length * 10,
        hintCount,
        skipCount,
        fastSkipCount,
        behaviorScore,
        timestamp: Date.now(),
      };
      localStorage.setItem('game_oddOneOut', JSON.stringify(reportData));
      window.dispatchEvent(new Event('biology_game_score_updated'));
    }
  }, [gameOver, score, questions.length, hintCount, skipCount, fastSkipCount, behaviorScore]);

  if (questions.length === 0) return null;

  return (
    <div className="game-area fade-in">
      <header className="game-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <h1>Odd One Out</h1>
        <div className="header-stats">
          {!gameOver && <div className="question-counter">{currentQuestionIndex + 1} / {questions.length}</div>}
          <div className="score-box">
            <span className="label">Score</span>
            <span className="value">{score}</span>
          </div>
        </div>
      </header>

      {gameOver ? (
        <section className="game-over-screen slide-in">
          <h2>Game Over!</h2>
          <div className="stats-container">
            <p>Standard Score: <span className="text-success">{score}</span></p>
            <p>Total Questions: <span>{questions.length}</span></p>
            <p>Correct: <span className="text-success">{correctCount}</span></p>
            <p>Wrong: <span className="text-danger">{wrongCount}</span></p>
            <p>Skipped: <span className="text-muted">{skipCount}</span></p>
            <p>Hints Used: <span>{hintCount}</span></p>
            <p>Time Taken: <span>{formatTime(timeTaken)}</span></p>

            <hr style={{ margin: '15px 0', borderColor: '#e2e8f0' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Analytical Profile</h3>
            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', textAlign: 'left', fontSize: '0.95rem' }}>
              <p><strong>Accuracy:</strong> {(questions.length > 0 ? (correctCount / questions.length) * 100 : 0).toFixed(1)}%</p>
              <p><strong>Average Response Time:</strong> {avgResponseTime.toFixed(1)}s</p>
              <p><strong>Behavior Score:</strong> {behaviorScore.toFixed(0)} / 100</p>
              <p><strong>Interest Insight:</strong> {behaviorScore >= 70 ? 'High engagement' : behaviorScore >= 45 ? 'Moderate engagement' : 'Low engagement'}</p>
            </div>
          </div>
          <button onClick={onRestart} className="btn primary-btn" style={{ marginTop: '20px' }}>Play Again</button>
          <button onClick={onBack} className="btn secondary-btn" style={{ marginTop: '10px' }}>Main Menu</button>
        </section>
      ) : (
        <>
          <div className="timer-bar">
            <div className={`timer-progress ${timeLeft <= 5 ? 'danger' : ''}`} style={{ width: `${(timeLeft / 15) * 100}%` }}></div>
          </div>
          <div className="timer-text">{timeLeft}s remaining</div>
          <h2 className="question-title">Find the word that doesn't belong to Biology</h2>
          {showHint && (
            <div className="hint-box" style={{ marginBottom: '16px' }}>
              <h3>Hint</h3>
              <p>{questions[currentQuestionIndex].hint}</p>
            </div>
          )}
          <div className="options-grid">
            {currentOptions.map((word, idx) => {
              const isCorrectAnswer = word === questions[currentQuestionIndex].answer;
              let btnClass = 'option-btn';
              if (isAnimating) {
                if (selectedWord === word) btnClass += isCorrectAnswer ? ' correct' : ' wrong';
                else if (isCorrectAnswer && selectedWord !== null) btnClass += ' correct-reveal';
              }
              return (
                <button key={idx} onClick={() => handleAnswer(word)} className={btnClass} disabled={isAnimating}>{word}</button>
              );
            })}
          </div>
          <div className="controls" style={{ gap: '10px' }}>
            {!showHint && (
              <button onClick={handleShowHint} disabled={isAnimating} className="btn secondary-btn">Show Hint</button>
            )}
            <button onClick={handleSkip} disabled={isAnimating} className="btn secondary-btn">Skip Question</button>
            <button onClick={() => { setGameEndTime(Date.now()); setGameOver(true); }} className="btn danger-btn">End Game</button>
          </div>
        </>
      )}
    </div>
  );
};

export default OddOneOut;
