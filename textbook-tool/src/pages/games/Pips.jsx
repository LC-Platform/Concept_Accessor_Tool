import React, { useState, useEffect } from 'react';
import { getGameQuestions } from '../../games/api';

const LEVEL = {
  grid: { rows: 4, cols: 3 },
  slots: [
    { id: 0, r: 0, c: 0, dir: 'v' }, // covers (0,0) and (1,0)
    { id: 1, r: 0, c: 1, dir: 'h' }, // covers (0,1) and (0,2)
    { id: 2, r: 1, c: 1, dir: 'h' }, // covers (1,1) and (1,2)
    { id: 3, r: 2, c: 0, dir: 'h' }, // covers (2,0) and (2,1)
    { id: 4, r: 2, c: 2, dir: 'v' }, // covers (2,2) and (3,2)
    { id: 5, r: 3, c: 0, dir: 'h' }, // covers (3,0) and (3,1)
  ],
  dominoes: [
    [1, 5],
    [2, 4],
    [3, 3],
    [6, 2],
    [1, 1],
    [4, 5]
  ],
  constraints: [
    { c1: {r:0, c:0}, c2: {r:0, c:1}, type: 'diff', val: 3 },
    { c1: {r:1, c:1}, c2: {r:2, c:1}, type: 'eq' },
    { c1: {r:2, c:1}, c2: {r:2, c:2}, type: 'diff', val: 2 },
    { c1: {r:3, c:1}, c2: {r:3, c:2}, type: 'sum', val: 6 },
  ]
};

const DotPattern = ({ value }) => {
  const dots = [];
  const positions = {
    1: ['center'],
    2: ['top-left', 'bottom-right'],
    3: ['top-left', 'center', 'bottom-right'],
    4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
    6: ['top-left', 'top-right', 'mid-left', 'mid-right', 'bottom-left', 'bottom-right']
  };

  if (positions[value]) {
    positions[value].forEach((pos, i) => {
      dots.push(<div key={i} className={`pip-dot ${pos}`}></div>);
    });
  }
  return <div className="pip-face">{dots}</div>;
};

export default function Pips({ onBack, onRestart }) {
  const [level, setLevel] = useState(LEVEL);
  const [placed, setPlaced] = useState({}); // slotId -> { dominoIdx, reversed: boolean }
  const [selectedDomino, setSelectedDomino] = useState(null); // idx of domino in bank
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');
  const [startTime] = useState(Date.now());
  const [timeTaken, setTimeTaken] = useState(0);

  useEffect(() => {
    const loadLevel = async () => {
      try {
        const data = await getGameQuestions('pips');
        setLevel(data);
      } catch (err) {
        console.warn("Failed to fetch pips config from backend, using fallback:", err);
      }
    };
    loadLevel();
  }, []);

  useEffect(() => {
    if (gameOver) {
      const reportData = {
        played: true,
        completed: true,
        score: score,
        maxScore: 100,
        timestamp: Date.now()
      };
      localStorage.setItem('game_pips', JSON.stringify(reportData));
      window.dispatchEvent(new Event('biology_game_score_updated'));
    }
  }, [gameOver, score]);

  if (!level || !level.slots) return null;

  const getCellVal = (r, c) => {
    for (const slot of level.slots) {
      const p = placed[slot.id];
      if (!p) continue;
      const dom = level.dominoes[p.dominoIdx];
      const val1 = p.reversed ? dom[1] : dom[0];
      const val2 = p.reversed ? dom[0] : dom[1];

      if (slot.r === r && slot.c === c) return val1;
      if (slot.dir === 'h' && slot.r === r && slot.c + 1 === c) return val2;
      if (slot.dir === 'v' && slot.r + 1 === r && slot.c === c) return val2;
    }
    return null;
  };

  const handleSlotClick = (slotId) => {
    if (gameOver) return;
    
    // If a domino is already placed here, and we haven't selected a new one, clicking it removes it
    if (placed[slotId] && selectedDomino === null) {
      const newPlaced = { ...placed };
      delete newPlaced[slotId];
      setPlaced(newPlaced);
      return;
    }

    // If a domino is placed here and we click it again with the SAME domino selected, reverse it
    if (placed[slotId] && selectedDomino === placed[slotId].dominoIdx) {
      setPlaced({
        ...placed,
        [slotId]: { ...placed[slotId], reversed: !placed[slotId].reversed }
      });
      setSelectedDomino(null);
      return;
    }

    // If we have a domino selected, place it
    if (selectedDomino !== null) {
      // Find if this domino is already placed elsewhere, remove it from there
      const newPlaced = { ...placed };
      Object.keys(newPlaced).forEach(k => {
        if (newPlaced[k].dominoIdx === selectedDomino) delete newPlaced[k];
      });

      newPlaced[slotId] = { dominoIdx: selectedDomino, reversed: false };
      setPlaced(newPlaced);
      setSelectedDomino(null);
    }
  };

  const checkSolution = () => {
    if (Object.keys(placed).length < level.slots.length) {
      setMessage('Place all dominoes first!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    let allValid = true;
    for (const c of level.constraints) {
      const v1 = getCellVal(c.c1.r, c.c1.c);
      const v2 = getCellVal(c.c2.r, c.c2.c);
      
      if (v1 === null || v2 === null) {
        allValid = false;
        break;
      }

      if (c.type === 'diff' && Math.abs(v1 - v2) !== c.val) allValid = false;
      if (c.type === 'eq' && v1 !== v2) allValid = false;
      if (c.type === 'sum' && v1 + v2 !== c.val) allValid = false;
    }

    if (allValid) {
      setScore(100);
      setGameOver(true);
      setTimeTaken(Date.now() - startTime);
    } else {
      setMessage('Constraints not met. Try again!');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const formatTime = (ms) => {
    if (!ms) return '0s';
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Build grid cells for rendering
  const gridCells = [];
  for (let r = 0; r < level.grid.rows; r++) {
    for (let c = 0; c < level.grid.cols; c++) {
      // Find if this cell is part of a slot
      const slot = level.slots.find(s => 
        (s.r === r && s.c === c) || 
        (s.dir === 'h' && s.r === r && s.c + 1 === c) ||
        (s.dir === 'v' && s.r + 1 === r && s.c === c)
      );

      let val = getCellVal(r, c);
      
      // Find constraints for this cell to render badges
      const rightConstraint = level.constraints.find(con => 
        (con.c1.r === r && con.c1.c === c && con.c2.r === r && con.c2.c === c + 1) ||
        (con.c2.r === r && con.c2.c === c && con.c1.r === r && con.c1.c === c + 1)
      );
      const bottomConstraint = level.constraints.find(con => 
        (con.c1.r === r && con.c1.c === c && con.c2.r === r + 1 && con.c2.c === c) ||
        (con.c2.r === r && con.c2.c === c && con.c1.r === r + 1 && con.c1.c === c)
      );

      gridCells.push(
        <div key={`cell-${r}-${c}`} className={`pips-cell ${slot ? 'in-slot' : 'empty'}`} onClick={() => slot && handleSlotClick(slot.id)}>
          {val !== null && <DotPattern value={val} />}
          
          {rightConstraint && (
            <div className="pip-constraint right">
              <div className={`pip-badge badge-${rightConstraint.type}`}>
                <span>{rightConstraint.type === 'diff' ? rightConstraint.val : rightConstraint.type === 'eq' ? '=' : `+${rightConstraint.val}`}</span>
              </div>
            </div>
          )}
          {bottomConstraint && (
            <div className="pip-constraint bottom">
               <div className={`pip-badge badge-${bottomConstraint.type}`}>
                <span>{bottomConstraint.type === 'diff' ? bottomConstraint.val : bottomConstraint.type === 'eq' ? '=' : `+${bottomConstraint.val}`}</span>
              </div>
            </div>
          )}
        </div>
      );
    }
  }

  const isDominoUsed = (idx) => {
    return Object.values(placed).some(p => p.dominoIdx === idx);
  };

  return (
    <div className="game-area fade-in pips-game">
      <header className="game-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <h1>Pips (Logic Dominoes)</h1>
        <div className="header-stats">
          <div className="score-box">
            <span className="label">Score</span>
            <span className="value">{score}</span>
          </div>
        </div>
      </header>

      {gameOver ? (
        <div className="game-over-screen slide-in">
          <h2>🏆 Perfect Placement!</h2>
          <div className="stats-container">
            <p>Final Score: <span className="text-success">{score}</span></p>
            <p>Time Taken: <span>{formatTime(timeTaken)}</span></p>
          </div>
          <button onClick={onRestart} className="btn primary-btn" style={{marginTop: '20px'}}>Play Again</button>
          <button onClick={onBack} className="btn secondary-btn" style={{marginTop: '10px'}}>Main Menu</button>
        </div>
      ) : (
        <div className="pips-content">
          <p className="pips-instructions">Select a domino from the bank, then click a slot on the board to place it. Click a placed domino to remove it, or click it again with the same domino selected to reverse it. Satisfy all constraints (diamonds)!</p>
          
          <div className="pips-layout">
            <div className="pips-board" style={{ gridTemplateColumns: `repeat(${level.grid.cols}, 70px)`, gridTemplateRows: `repeat(${level.grid.rows}, 70px)` }}>
              {gridCells}
              
              {/* Overlay slot outlines */}
              {level.slots.map((slot, idx) => {
                const colors = ['#f472b6', '#a78bfa', '#38bdf8', '#fbbf24', '#34d399', '#f87171']; // colorful outlines
                return (
                  <div 
                    key={`slot-${slot.id}`} 
                    className={`pip-slot-outline ${slot.dir} ${placed[slot.id] ? 'filled' : ''}`}
                    style={{
                      gridColumn: `${slot.c + 1} / span ${slot.dir === 'h' ? 2 : 1}`,
                      gridRow: `${slot.r + 1} / span ${slot.dir === 'v' ? 2 : 1}`,
                      borderColor: colors[idx % colors.length],
                      backgroundColor: placed[slot.id] ? `${colors[idx % colors.length]}40` : 'transparent',
                    }}
                  />
                );
              })}
            </div>

            <div className="pips-bank">
              <h3>Domino Bank</h3>
              <div className="bank-grid">
                {level.dominoes.map((dom, idx) => {
                  const used = isDominoUsed(idx);

                  return (
                    <div 
                      key={idx} 
                      className={`bank-domino ${selectedDomino === idx ? 'selected' : ''} ${used ? 'used' : ''}`}
                      onClick={() => !used && setSelectedDomino(idx === selectedDomino ? null : idx)}
                    >
                      <DotPattern value={dom[0]} />
                      <div className="domino-divider"></div>
                      <DotPattern value={dom[1]} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="story-message-area">
            {message && <div className="story-message slide-in">{message}</div>}
          </div>

          <div className="controls" style={{marginTop: '20px', gap: '10px', flexWrap: 'wrap'}}>
            <button onClick={() => {setPlaced({}); setSelectedDomino(null);}} className="btn secondary-btn">Clear Board</button>
            <button onClick={checkSolution} className="btn primary-btn" style={{ margin: 0 }}>Check Solution</button>
          </div>
          
          <div className="controls" style={{ marginTop: '15px', gap: '10px' }}>
            <button onClick={() => { setGameOver(true); setTimeTaken(Date.now() - startTime); }} className="btn danger-btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Give Up</button>
          </div>
        </div>
      )}
    </div>
  );
}
