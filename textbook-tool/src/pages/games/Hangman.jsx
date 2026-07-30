import React, { useState, useEffect } from 'react';
import { getGameQuestions } from '../../games/api';

const Hangman = ({ onBack, onRestart }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [guessedLetters, setGuessedLetters] = useState([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [questionOver, setQuestionOver] = useState(false);
  const [gameStartTime] = useState(Date.now());
  const [gameEndTime, setGameEndTime] = useState(null);
  const [skippedCount, setSkippedCount] = useState(0);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const data = await getGameQuestions('hangman');
        setQuestions(data);
      } catch (err) {
        console.warn("Failed to fetch questions for hangman from backend:", err);
      }
    };
    loadQuestions();
  }, []);



  const maxWrong = 6;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const currentTerm = questions[currentIdx]?.term?.toUpperCase().trim() || "";
  const currentHint = questions[currentIdx] ? questions[currentIdx].hint : "";

  useEffect(() => {
    if (!currentTerm) return;

    if (gameOver || questionOver) return;

    const letters = currentTerm
      .toUpperCase()
      .split("")
      .filter(ch => /^[A-Z]$/.test(ch));

    const isWon = letters.every(letter =>
      guessedLetters.includes(letter)
    );

    if (isWon) {
      setGameWon(true);
      setQuestionOver(true);

      const points = (maxWrong - wrongGuesses) * 20;
      setScore(prev => prev + points);

    } else if (wrongGuesses >= maxWrong) {
      setGameWon(false);
      setQuestionOver(true);
    }

  }, [
    currentTerm,
    guessedLetters,
    wrongGuesses,
    gameOver,
    questionOver
  ]);

  const handleGuess = (letter) => {
    if (gameOver || questionOver || guessedLetters.includes(letter)) return;

    setGuessedLetters(prev => [...prev, letter]);

    if (!currentTerm.includes(letter)) {
      setWrongGuesses(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIdx + 1 >= questions.length) {
      setGameOver(true);
      setGameEndTime(Date.now());
    } else {
      setGuessedLetters([]);
      setWrongGuesses(0);
      setGameWon(false);
      setQuestionOver(false);
      setCurrentIdx(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    if (questionOver) return;
    setSkippedCount(prev => prev + 1);
    setGuessedLetters(currentTerm.split("")); // Reveal word
    setGameWon(false);
    setQuestionOver(true);
  };

  const handleEndGame = () => {
    setGameOver(true);
    setGameEndTime(Date.now());
  };

  const resetGame = () => {
    setCurrentIdx(0);
    setGuessedLetters([]);
    setWrongGuesses(0);
    setScore(0);
    setSkippedCount(0);
    setGameOver(false);
    setGameWon(false);
    setQuestionOver(false);
    setGameEndTime(null);
  };

  const formatTime = (timeInMs) => {
    if (!timeInMs) return '0s';
    const totalSeconds = Math.floor(timeInMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const timeTaken = gameEndTime ? gameEndTime - gameStartTime : 0;

  
  React.useEffect(() => {
    if (gameOver) {
      const reportData = {
        played: true,
        completed: true,
        score: score,
        maxScore: questions.length * 120,
        timestamp: Date.now()
      };
      localStorage.setItem('game_hangman', JSON.stringify(reportData));
      window.dispatchEvent(new Event('biology_game_score_updated'));
    }
  }, [gameOver, score, questions.length]);

  if (questions.length === 0) {
    return (
      <div className="game-area fade-in">
        <header className="game-header">
          <button onClick={onBack} className="back-btn">← Back</button>
          <h1>🤔 Biology Hangman</h1>
        </header>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', fontSize: '1.2rem', opacity: 0.7 }}>
          Loading questions...
        </div>
      </div>
    );
  }

  return (
    <div className="game-area fade-in">
      <header className="game-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <h1>Biology Hangman</h1>
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
          <h2>Game Over!</h2>
          <div className="stats-container">
            <p>Total Terms: <span>{questions.length}</span></p>
            <p>Terms Completed: <span>{currentIdx}</span></p>
            <p>Skipped: <span className="text-muted">{skippedCount}</span></p>
            <p>Final Score: <span className="text-success">{score}</span></p>
            <p>Time Taken: <span>{formatTime(timeTaken)}</span></p>
          </div>
          <button onClick={onRestart} className="btn primary-btn">Play Again</button>
          <button onClick={onBack} className="btn secondary-btn" style={{marginTop: '10px'}}>Main Menu</button>
        </div>
      ) : (
        <>
          <div className="hangman-visual">
             <div className="lives-counter">
               Lives: {[...Array(maxWrong - wrongGuesses)].map((_, i) => <span key={i}>❤️</span>)}
               {[...Array(wrongGuesses)].map((_, i) => <span key={i} style={{opacity: 0.3}}>🖤</span>)}
             </div>
          </div>

          <div className="hint-box">
            <h3>Hint:</h3>
            <p>{currentHint}</p>
          </div>

          <div className="word-display">
            {currentTerm.split("").map((letter, i) => (
              <span key={i} className="letter-slot">
                {guessedLetters.includes(letter) ? letter : "_"}
              </span>
            ))}
          </div>

          {!questionOver ? (
            <>
              <div className="keyboard">
                {alphabet.map(letter => (
                  <button
                    key={letter}
                    onClick={() => handleGuess(letter)}
                    className={`key ${guessedLetters.includes(letter) ? (currentTerm.includes(letter) ? 'correct-key' : 'wrong-key') : ''}`}
                    disabled={guessedLetters.includes(letter)}
                  >
                    {letter}
                  </button>
                ))}
              </div>
              <div className="controls" style={{marginTop: '20px'}}>
                <button onClick={handleSkip} className="btn secondary-btn">Skip Question</button>
                <button onClick={handleEndGame} className="btn danger-btn">End Game</button>
              </div>
            </>
          ) : (
            <div className="win-controls">
              <p className={gameWon ? "text-success" : "text-danger"}>
                {gameWon ? "Correct!" : "Out of lives / Skipped."} The word was {currentTerm}
              </p>
              <button onClick={nextQuestion} className="btn primary-btn">
                {currentIdx + 1 >= questions.length ? "Finish Game" : "Next Word"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Hangman;
