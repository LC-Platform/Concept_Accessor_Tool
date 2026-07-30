import React, { useState, useEffect } from 'react';
import { getGameQuestions } from '../../games/api';

const ENTITIES = [
  { id: 'man', label: '👨 Man', symbol: '👨' },
  { id: 'wolf', label: '🐺 Wolf', symbol: '🐺' },
  { id: 'goat', label: '🐐 Goat', symbol: '🐐' },
  { id: 'carrots', label: '🥕 Carrots', symbol: '🥕' }
];

export default function RiverCrossing({ onBack, onRestart }) {
  const [entities, setEntities] = useState(ENTITIES);
  const [leftBank, setLeftBank] = useState(['man', 'wolf', 'goat', 'carrots']);
  const [rightBank, setRightBank] = useState([]);
  const [boat, setBoat] = useState([]);
  const [boatPos, setBoatPos] = useState('left'); // 'left' or 'right'
  const [trips, setTrips] = useState(0);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  useEffect(() => {
    const loadEntities = async () => {
      try {
        const data = await getGameQuestions('riverCrossing');
        setEntities(data);
      } catch (err) {
        console.warn("Failed to fetch entities for riverCrossing from backend, using fallback:", err);
      }
    };
    loadEntities();
  }, []);

  const checkFailState = (bank) => {
    if (bank.includes('goat') && bank.includes('carrots') && !bank.includes('man') && !boat.includes('man') || (bank.includes('goat') && bank.includes('carrots') && !bank.includes('man') && boat.includes('man') && boatPos !== (bank === leftBank ? 'left' : 'right'))) {
      return "The goat ate the carrots! 🐐🍽️🥕";
    }
    if (bank.includes('wolf') && bank.includes('goat') && !bank.includes('man') && !boat.includes('man') || (bank.includes('wolf') && bank.includes('goat') && !bank.includes('man') && boat.includes('man') && boatPos !== (bank === leftBank ? 'left' : 'right'))) {
      return "The wolf ate the goat! 🐺🍽️🐐";
    }
    // Simplification: just check the bank without the man
    const hasMan = bank.includes('man') || (boat.includes('man') && boatPos === (bank === leftBank ? 'left' : 'right'));
    if (!hasMan) {
      if (bank.includes('goat') && bank.includes('carrots')) return "The goat ate the carrots! 🐐🍽️🥕";
      if (bank.includes('wolf') && bank.includes('goat')) return "The wolf ate the goat! 🐺🍽️🐐";
    }
    return null;
  };

  const handleFailCheck = (newLeft, newRight, newBoatPos) => {
    // Check left bank
    let leftMan = newLeft.includes('man') || (boat.includes('man') && newBoatPos === 'left');
    if (!leftMan) {
      if (newLeft.includes('goat') && newLeft.includes('carrots')) return "The goat ate the carrots on the left bank! 🐐🍽️🥕";
      if (newLeft.includes('wolf') && newLeft.includes('goat')) return "The wolf ate the goat on the left bank! 🐺🍽️🐐";
    }
    // Check right bank
    let rightMan = newRight.includes('man') || (boat.includes('man') && newBoatPos === 'right');
    if (!rightMan) {
      if (newRight.includes('goat') && newRight.includes('carrots')) return "The goat ate the carrots on the right bank! 🐐🍽️🥕";
      if (newRight.includes('wolf') && newRight.includes('goat')) return "The wolf ate the goat on the right bank! 🐺🍽️🐐";
    }
    return null;
  };

  const handleEntityClick = (id, location) => {
    if (gameOver) return;

    let newLeft = [...leftBank];
    let newRight = [...rightBank];
    let newBoat = [...boat];

    if (location === 'left' && boatPos === 'left') {
      if (boat.length >= 2) {
        setMessage('Boat is full!');
        return;
      }
      newLeft = newLeft.filter(e => e !== id);
      newBoat.push(id);
    } else if (location === 'right' && boatPos === 'right') {
      if (boat.length >= 2) {
        setMessage('Boat is full!');
        return;
      }
      newRight = newRight.filter(e => e !== id);
      newBoat.push(id);
    } else if (location === 'boat') {
      newBoat = newBoat.filter(e => e !== id);
      if (boatPos === 'left') newLeft.push(id);
      else newRight.push(id);
    } else {
      setMessage('The boat is on the other side!');
      return;
    }

    setLeftBank(newLeft);
    setRightBank(newRight);
    setBoat(newBoat);
    setMessage('');

    // Don't trigger game over until the boat moves, leaving them alone.
  };

  const handleMoveBoat = () => {
    if (gameOver) return;
    if (!boat.includes('man')) {
      setMessage('The boat cannot move without the man!');
      return;
    }

    const newBoatPos = boatPos === 'left' ? 'right' : 'left';
    setBoatPos(newBoatPos);
    setTrips(prev => prev + 1);
    setMessage('');

    const failMsg = handleFailCheck(leftBank, rightBank, newBoatPos);
    if (failMsg) {
      setMessage(failMsg);
      setGameOver(true);
      setGameWon(false);
      return;
    }

    // Check Win
    if (rightBank.length + boat.length === 4 && newBoatPos === 'right') {
      // everyone is on the right side
      setMessage('Success! Everyone crossed the river safely.');
      setGameOver(true);
      setGameWon(true);
    }
  };

  const handleEndGame = () => {
    setGameOver(true);
    setGameWon(false);
  };

  const renderEntity = (id, location) => {
    const ent = entities.find(e => e.id === id) || { symbol: '' };
    return (
      <div key={id} className="river-entity" onClick={() => handleEntityClick(id, location)}>
        {ent.symbol}
      </div>
    );
  };

  const getScore = () => {
    if (!gameWon) return 0;
    // Ideal trips: 7. Score = max(10, 100 - (trips - 7) * 10)
    return Math.max(10, 100 - (trips - 7) * 10);
  };

  
  React.useEffect(() => {
    if (gameOver) {
      const reportData = {
        played: true,
        completed: true,
        score: getScore(),
        maxScore: 100,
        timestamp: Date.now()
      };
      localStorage.setItem('game_riverCrossing', JSON.stringify(reportData));
      window.dispatchEvent(new Event('biology_game_score_updated'));
    }
  }, [gameOver]);

  return (
    <div className="game-area fade-in river-game">
      <header className="game-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <h1>River Crossing Puzzle</h1>
        <div className="header-stats">
          <div className="score-box">
            <span className="label">Trips</span>
            <span className="value">{trips}</span>
          </div>
        </div>
      </header>

      {gameOver && gameWon ? (
        <div className="game-over-screen slide-in">
          <h2>🏆 Puzzle Solved!</h2>
          <div className="stats-container">
            <p>Total Trips: <span>{trips}</span></p>
            <p>Final Score: <span className="text-success">{getScore()}</span></p>
          </div>
          <button onClick={onRestart} className="btn primary-btn" style={{marginTop: '20px'}}>Play Again</button>
          <button onClick={onBack} className="btn secondary-btn" style={{marginTop: '10px'}}>Main Menu</button>
        </div>
      ) : (
        <div className="river-content">
          <div className="river-instructions">
            <p><strong>Rules:</strong></p>
            <ul>
              <li>Only the man and at most one other item are allowed in the boat.</li>
              <li>Only the man can operate the boat.</li>
              <li>Do not leave the goat alone with the carrots.</li>
              <li>Do not leave the wolf unsupervised with the goat.</li>
            </ul>
          </div>

          <div className="river-scene">
            <div className="bank left-bank">
              <h3>Left Bank</h3>
              <div className="bank-entities">
                {leftBank.map(id => renderEntity(id, 'left'))}
              </div>
            </div>

            <div className="water">
              <div className={`boat-container ${boatPos}`}>
                <div className="boat">
                  {boat.map(id => renderEntity(id, 'boat'))}
                </div>
                <button className="btn primary-btn move-boat-btn" onClick={handleMoveBoat}>
                  {boatPos === 'left' ? 'Row Right ➔' : 'Row Left ⬅'}
                </button>
              </div>
            </div>

            <div className="bank right-bank">
              <h3>Right Bank</h3>
              <div className="bank-entities">
                {rightBank.map(id => renderEntity(id, 'right'))}
              </div>
            </div>
          </div>

          <div className="river-message-area">
            {message && (
              <div className={`river-message slide-in ${gameOver && !gameWon ? 'error' : ''}`}>
                {message}
              </div>
            )}
          </div>

          {!gameOver && (
            <div className="controls" style={{marginTop: '20px'}}>
              <button onClick={handleEndGame} className="btn danger-btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>End Game / Give Up</button>
            </div>
          )}

          {gameOver && !gameWon && (
             <div className="controls" style={{marginTop: '20px'}}>
               <button onClick={onRestart} className="btn primary-btn" style={{ margin: 0 }}>Try Again</button>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
