import React, { useState, useEffect } from 'react';
import { getGameQuestions } from '../../games/api';

const LOGIC_PUZZLES = [
  {
    id: 1,
    title: "Plant Adaptations",
    rowsLabel: "Plant",
    rows: ["Cactus", "Lotus", "Pine"],
    colGroups: [
      { label: "Habitat", cols: ["Desert", "Aquatic", "Cold mountains"] },
      { label: "Adaptation", cols: ["Spines", "Waxy leaves", "Needle leaves"] }
    ],
    clues: [
      "1. The desert plant has reduced leaves.",
      "2. The aquatic plant has broad floating leaves.",
      "3. Needle-like leaves help reduce snow damage.",
      "4. Pine is not aquatic."
    ],
    solution: {
      Habitat: { "Cactus": "Desert", "Lotus": "Aquatic", "Pine": "Cold mountains" },
      Adaptation: { "Cactus": "Spines", "Lotus": "Waxy leaves", "Pine": "Needle leaves" }
    }
  },
  {
    id: 2,
    title: "Unknown Biomolecules",
    rowsLabel: "Biomolecule",
    rows: ["Protein", "Carbohydrate", "Lipid"],
    colGroups: [
      { label: "Component", cols: ["Amino acids", "Monosaccharides", "Fatty acids"] },
      { label: "Function", cols: ["Enzymatic activity", "Energy source", "Membrane structure"] }
    ],
    clues: [
      "1. The molecule involved in membrane formation is not made of amino acids.",
      "2. Enzymes are biological catalysts.",
      "3. Carbohydrates provide quick energy.",
      "4. Lipids are hydrophobic."
    ],
    solution: {
      Component: { "Protein": "Amino acids", "Carbohydrate": "Monosaccharides", "Lipid": "Fatty acids" },
      Function: { "Protein": "Enzymatic activity", "Carbohydrate": "Energy source", "Lipid": "Membrane structure" }
    }
  },
  {
    id: 3,
    title: "Experimental Plants",
    rowsLabel: "Missing Factor",
    rows: ["CO₂ absent", "Light absent", "Chlorophyll absent"],
    colGroups: [
      { label: "Result", cols: ["No glucose formation", "Photosynthesis stops", "No light absorption"] },
      { label: "Reason", cols: ["Raw material absent", "Energy unavailable", "Pigment missing"] }
    ],
    clues: [
      "1. The plant lacking pigment could not trap light energy.",
      "2. Glucose synthesis failed in the absence of carbon dioxide.",
      "3. One setup had energy available but no raw material.",
      "4. Light absence does not remove chlorophyll."
    ],
    solution: {
      Result: { "CO₂ absent": "No glucose formation", "Light absent": "Photosynthesis stops", "Chlorophyll absent": "No light absorption" },
      Reason: { "CO₂ absent": "Raw material absent", "Light absent": "Energy unavailable", "Chlorophyll absent": "Pigment missing" }
    }
  }
];

export default function LogicGridPuzzle({ onBack, onRestart }) {
  const [puzzles, setPuzzles] = useState(LOGIC_PUZZLES);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [gridState, setGridState] = useState({}); // { "row-colGroup-col": "empty" | "yes" | "no" }
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  useEffect(() => {
    const loadPuzzles = async () => {
      try {
        const data = await getGameQuestions('logicGrid');
        setPuzzles(data);
      } catch (err) {
        console.warn("Failed to fetch logicGrid from backend, using fallback:", err);
      }
    };
    loadPuzzles();
  }, []);

  useEffect(() => {
    if (gameOver) {
      const reportData = {
        played: true,
        completed: true,
        score: score,
        maxScore: puzzles.length * 100,
        timestamp: Date.now()
      };
      localStorage.setItem('game_logicGrid', JSON.stringify(reportData));
      window.dispatchEvent(new Event('biology_game_score_updated'));
    }
  }, [gameOver, score, puzzles.length]);

  useEffect(() => {
    setGridState({});
    setMessage('');
    setGameOver(false);
    setGameWon(false);
  }, [puzzleIndex]);

  if (puzzles.length === 0) return null;

  const currentPuzzle = puzzles[puzzleIndex] || puzzles[0];

  const handleCellClick = (row, groupLabel, col) => {
    if (gameOver) return;
    const key = `${row}-${groupLabel}-${col}`;
    const currentState = gridState[key] || "empty";
    let nextState = "empty";
    if (currentState === "empty") nextState = "no";
    else if (currentState === "no") nextState = "yes";
    
    setGridState(prev => {
      const newState = { ...prev, [key]: nextState };
      
      // Auto-cross out other options in row/col if set to 'yes'
      if (nextState === 'yes') {
        // Cross out other cols in same row and group
        currentPuzzle.colGroups.find(g => g.label === groupLabel).cols.forEach(c => {
          if (c !== col) newState[`${row}-${groupLabel}-${c}`] = "no";
        });
        // Cross out other rows in same col and group
        currentPuzzle.rows.forEach(r => {
          if (r !== row) newState[`${r}-${groupLabel}-${col}`] = "no";
        });
      }
      
      return newState;
    });
  };

  const handleCheck = () => {
    let allCorrect = true;
    let anyWrong = false;

    currentPuzzle.rows.forEach(row => {
      currentPuzzle.colGroups.forEach(group => {
        const correctCol = currentPuzzle.solution[group.label][row];
        group.cols.forEach(col => {
          const key = `${row}-${group.label}-${col}`;
          const state = gridState[key] || "empty";
          if (col === correctCol) {
            if (state !== "yes") allCorrect = false;
          } else {
            if (state === "yes") anyWrong = true;
          }
        });
      });
    });

    if (allCorrect && !anyWrong) {
      setScore(prev => prev + 100);
      if (puzzleIndex + 1 < puzzles.length) {
        setMessage('Correct! Moving to next puzzle...');
        setTimeout(() => setPuzzleIndex(prev => prev + 1), 2000);
      } else {
        setMessage('You solved all puzzles!');
        setGameWon(true);
        setGameOver(true);
      }
    } else {
      setMessage('Something is not quite right or incomplete.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleSkip = () => {
    if (puzzleIndex + 1 < puzzles.length) {
      setPuzzleIndex(prev => prev + 1);
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
    <div className="game-area fade-in logic-grid-game">
      <header className="game-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <h1>Logic Grid Puzzle</h1>
        <div className="header-stats">
          <div className="score-box">
            <span className="label">Puzzle</span>
            <span className="value">{puzzleIndex + 1} / {puzzles.length}</span>
          </div>
          <div className="score-box">
            <span className="label">Score</span>
            <span className="value">{score}</span>
          </div>
        </div>
      </header>

      {gameOver ? (
        <div className="game-over-screen slide-in">
          <h2>{gameWon ? '🏆 Master Logician!' : 'Game Over'}</h2>
          <div className="stats-container">
            <p>Final Score: <span className="text-success">{score}</span></p>
          </div>
          <button onClick={onRestart} className="btn primary-btn" style={{marginTop: '20px'}}>Play Again</button>
          <button onClick={onBack} className="btn secondary-btn" style={{marginTop: '10px'}}>Main Menu</button>
        </div>
      ) : (
        <div className="logic-grid-content">
          <div className="logic-clues-panel">
            <h3>{currentPuzzle.title}</h3>
            <p className="logic-instructions">Use the clues to fill the grid. Click cells to mark ❌ or ✔️.</p>
            <ul className="clues-list">
              {currentPuzzle.clues.map((clue, idx) => (
                <li key={idx}>{clue}</li>
              ))}
            </ul>
          </div>

          <div className="logic-grid-panel">
            <table className="logic-grid-table">
              <thead>
                <tr>
                  <th colSpan="2" rowSpan="2" className="empty-corner"></th>
                  {currentPuzzle.colGroups.map((group, idx) => (
                    <th key={idx} colSpan={group.cols.length} className="col-group-header">
                      {group.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {currentPuzzle.colGroups.map((group, gIdx) => 
                    group.cols.map((col, idx) => {
                      const isLastInGroup = idx === group.cols.length - 1;
                      return (
                        <th key={`${group.label}-${idx}`} className={`col-header ${isLastInGroup && gIdx !== currentPuzzle.colGroups.length - 1 ? 'group-end' : ''}`}>
                          <div className="vertical-text">{col}</div>
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>
              <tbody>
                {currentPuzzle.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {rIdx === 0 && (
                      <th rowSpan={currentPuzzle.rows.length} className="row-group-header">
                        <div className="vertical-text-group">{currentPuzzle.rowsLabel}</div>
                      </th>
                    )}
                    <th className="row-header">{row}</th>
                    {currentPuzzle.colGroups.map((group, gIdx) => 
                      group.cols.map((col, cIdx) => {
                        const key = `${row}-${group.label}-${col}`;
                        const state = gridState[key] || "empty";
                        const isLastInGroup = cIdx === group.cols.length - 1;

                        return (
                          <td 
                            key={`${group.label}-${cIdx}`} 
                            className={`grid-cell logic-cell state-${state} ${isLastInGroup && gIdx !== currentPuzzle.colGroups.length - 1 ? 'group-end' : ''}`}
                            onClick={() => handleCellClick(row, group.label, col)}
                          >
                            {state === 'yes' && <span className="text-success" style={{color: '#10b981', fontWeight: 'bold'}}>✔</span>}
                            {state === 'no' && <span className="text-danger" style={{color: '#ef4444', fontWeight: 'bold'}}>✘</span>}
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="logic-message-area">
              {message && <div className="logic-message slide-in">{message}</div>}
            </div>

            <div className="controls logic-controls" style={{ gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => setGridState({})} className="btn secondary-btn">Clear Grid</button>
              <button onClick={handleCheck} className="btn primary-btn" style={{ margin: 0 }}>Check Answer</button>
            </div>
            
            <div className="controls logic-controls" style={{ marginTop: '15px', gap: '10px' }}>
              <button onClick={handleSkip} className="btn secondary-btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Skip Puzzle</button>
              <button onClick={handleEndGame} className="btn danger-btn" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>End Game</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
