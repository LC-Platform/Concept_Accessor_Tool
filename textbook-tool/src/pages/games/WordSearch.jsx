import React, { useState, useEffect } from 'react';
import { getGameQuestions } from '../../games/api';

const BIOLOGY_TERMS = [
  {
    word: 'NUCLEUS',
    definition: 'The control center of the cell containing genetic material.',
    question: 'Which of the following does the nucleus contain?',
    options: ['DNA', 'Mitochondria', 'Chloroplasts', 'Ribosomes'],
    correctAnswer: 'DNA'
  },
  {
    word: 'MITOSIS',
    definition: 'A type of cell division that results in two identical daughter cells.',
    question: 'What is the primary purpose of mitosis in multicellular organisms?',
    options: ['Growth and repair', 'Producing gametes', 'Digesting food', 'Cellular respiration'],
    correctAnswer: 'Growth and repair'
  },
  {
    word: 'OSMOSIS',
    definition: 'The diffusion of water through a semipermeable membrane.',
    question: 'If a cell is placed in a hypertonic solution, what happens?',
    options: ['Water moves out of the cell', 'Water moves into the cell', 'The cell bursts', 'No net movement of water'],
    correctAnswer: 'Water moves out of the cell'
  },
  {
    word: 'ENZYME',
    definition: 'A biological catalyst that speeds up chemical reactions.',
    question: 'How do enzymes speed up reactions?',
    options: ['By lowering activation energy', 'By increasing temperature', 'By changing the pH', 'By acting as a reactant'],
    correctAnswer: 'By lowering activation energy'
  },
  {
    word: 'ALLELE',
    definition: 'One of two or more alternative forms of a gene.',
    question: 'An individual with two identical alleles for a trait is called:',
    options: ['Homozygous', 'Heterozygous', 'Dominant', 'Recessive'],
    correctAnswer: 'Homozygous'
  },
  {
    word: 'ORGAN',
    definition: 'A structure formed by different tissues working together.',
    question: 'What can be an example of a plant organ?',
    options: ['Leaf', 'Mitochondria', 'Guard Cell', 'Chlorophyll'],
    correctAnswer: 'Leaf'
  },
  {
    word: 'RIBOSOME',
    definition: 'Non-membranous structures responsible for protein synthesis.',
    question: 'Ribosomes are found:',
    options: ['Only in plants', 'Only in animals', 'In all cells', 'Only in bacteria'],
    correctAnswer: 'In all cells'
  }
];

const GRID_SIZE = 12;

const generateGrid = (wordsToPlace) => {
  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
  const directions = [
    [0, 1], [1, 0], [1, 1], [-1, 1] // right, down, diagonal down-right, diagonal up-right
  ];
  
  const placeWord = (word) => {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      attempts++;
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);
      
      let canPlace = true;
      for (let i = 0; i < word.length; i++) {
        const r = row + i * dir[0];
        const c = col + i * dir[1];
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE || (grid[r][c] !== '' && grid[r][c] !== word[i])) {
          canPlace = false;
          break;
        }
      }
      
      if (canPlace) {
        for (let i = 0; i < word.length; i++) {
          const r = row + i * dir[0];
          const c = col + i * dir[1];
          grid[r][c] = word[i];
        }
        placed = true;
      }
    }
  };

  wordsToPlace.forEach(term => placeWord(term.word));

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }
  
  return grid;
};

export default function WordSearch({ onBack, onRestart }) {
  const [terms, setTerms] = useState(BIOLOGY_TERMS);
  const [grid, setGrid] = useState([]);
  const [foundWords, setFoundWords] = useState([]); // List of correctly answered words
  const [selectedCells, setSelectedCells] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const [activeQuestion, setActiveQuestion] = useState(null); // The term object currently being quizzed
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStartTime] = useState(Date.now());
  const [gameEndTime, setGameEndTime] = useState(null);

  useEffect(() => {
    const loadTerms = async () => {
      try {
        const data = await getGameQuestions('wordSearch');
        setTerms(data);
        setGrid(generateGrid(data));
      } catch (err) {
        console.warn("Failed to fetch wordSearch from backend, using fallback:", err);
        setGrid(generateGrid(BIOLOGY_TERMS));
      }
    };
    loadTerms();
  }, []);

  useEffect(() => {
    if (gameOver) {
      const reportData = {
        played: true,
        completed: true,
        score: score,
        maxScore: terms.length * 100,
        timestamp: Date.now()
      };
      localStorage.setItem('game_wordSearch', JSON.stringify(reportData));
      window.dispatchEvent(new Event('biology_game_score_updated'));
    }
  }, [gameOver, score, terms.length]);

  if (grid.length === 0) return null;

  const handleMouseDown = (r, c) => {
    if (activeQuestion || gameOver) return;
    setIsDragging(true);
    setSelectedCells([{ r, c }]);
  };

  const handleMouseEnter = (r, c) => {
    if (!isDragging || activeQuestion || gameOver) return;
    const startCell = selectedCells[0];
    
    // Calculate if it's a valid straight line (horizontal, vertical, diagonal)
    const dr = r - startCell.r;
    const dc = c - startCell.c;
    
    if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) {
      const newSelection = [];
      const steps = Math.max(Math.abs(dr), Math.abs(dc));
      const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
      const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
      
      for (let i = 0; i <= steps; i++) {
        newSelection.push({ r: startCell.r + i * stepR, c: startCell.c + i * stepC });
      }
      setSelectedCells(newSelection);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging || activeQuestion || gameOver) return;
    setIsDragging(false);
    
    // Check if selected cells match any word
    let selectedWord = selectedCells.map(cell => grid[cell.r][cell.c]).join('');
    let reversedWord = selectedWord.split('').reverse().join('');
    
    const matchedTerm = terms.find(t => 
      (t.word === selectedWord || t.word === reversedWord) && !foundWords.some(fw => fw.word === t.word)
    );

    if (matchedTerm) {
      setActiveQuestion(matchedTerm);
    } else {
      setSelectedCells([]);
    }
  };

  const handleTouchStart = (e, r, c) => {
    if (activeQuestion || gameOver) return;
    e.preventDefault(); // stop scroll/text-select from hijacking the drag
    setIsDragging(true);
    setSelectedCells([{ r, c }]);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || activeQuestion || gameOver) return;
    e.preventDefault();

    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el || !el.dataset || el.dataset.r === undefined) return;

    const r = parseInt(el.dataset.r, 10);
    const c = parseInt(el.dataset.c, 10);
    handleMouseEnter(r, c); // reuse existing line-selection logic
  };

  const handleTouchEnd = (e) => {
    if (!isDragging || activeQuestion || gameOver) return;
    e.preventDefault();
    handleMouseUp(); // reuse existing match-checking logic
  };

  const handleAnswerSubmit = (option) => {
    if (option === activeQuestion.correctAnswer) {
      setScore(prev => prev + 100);
      const newFound = [...foundWords, { word: activeQuestion.word, cells: [...selectedCells] }];
      setFoundWords(newFound);
      setActiveQuestion(null);
      setSelectedCells([]);
      
      if (newFound.length === terms.length) {
        setGameOver(true);
        setGameEndTime(Date.now());
      }
    } else {
      // Incorrect, close modal and let them try finding it again later or deduct points
      setScore(prev => Math.max(0, prev - 20)); // Deduct points for wrong answer
      setActiveQuestion(null);
      setSelectedCells([]);
    }
  };

  const formatTime = (ms) => {
    if (!ms) return '0s';
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const getCellColor = (r, c) => {
    // Check if cell is currently being selected
    if (selectedCells.some(cell => cell.r === r && cell.c === c)) {
      return 'selected-drag';
    }
    
    // Check if cell is part of a found word
    const foundWordIndex = foundWords.findIndex(fw => 
      fw.cells.some(cell => cell.r === r && cell.c === c)
    );
    
    if (foundWordIndex !== -1) {
      return `found-color-${foundWordIndex % 6}`; // Cycle through 6 colors
    }
    
    return '';
  };

  return (
    <div className="game-area fade-in" onMouseUp={handleMouseUp} onMouseLeave={() => setIsDragging(false)}  onTouchEnd={handleTouchEnd}>
      <header className="game-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <h1>🔍 Word Search Challenge</h1>
        <div className="header-stats">
          <div className="score-box">
            <span className="label">Score</span>
            <span className="value">{score}</span>
          </div>
          <div className="score-box">
            <span className="label">Found</span>
            <span className="value">{foundWords.length}/{terms.length}</span>
          </div>
        </div>
      </header>

      {gameOver ? (
        <div className="game-over-screen slide-in">
          <h2>🏆 Congratulations!</h2>
          <p>You found all the words and answered the comprehension questions!</p>
          <div className="stats-container">
            <p>Final Score: <span className="text-success">{score}</span></p>
            <p>Time Taken: <span>{formatTime(gameEndTime - gameStartTime)}</span></p>
          </div>
          <button onClick={onRestart} className="btn primary-btn">Play Again</button>
          <button onClick={onBack} className="btn secondary-btn" style={{marginTop: '10px'}}>Main Menu</button>
        </div>
      ) : (
        <div className="word-search-wrapper">
          <div className="word-search-layout">
            
            {/* Clues Panel */}
            <div className="clues-panel">
              <h3>Definitions</h3>
              <p className="clues-instructions">Find the terms matching these definitions in the grid. Click and drag to select.</p>
              <ul className="clues-list">
                {terms.map((term, idx) => {
                  const isFound = foundWords.some(fw => fw.word === term.word);
                  return (
                    <li key={idx} className={isFound ? 'found' : ''}>
                      {isFound ? (
                        <strong>{idx + 1}) {term.word}</strong>
                      ) : (
                        <span><strong>{idx + 1})</strong> {term.definition}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Grid Panel */}
            <div className="grid-panel">
              <div 
                className="word-search-grid" 
                style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
              >
                {grid.map((row, r) => (
                  row.map((letter, c) => {
                    const colorClass = getCellColor(r, c);

                    return (
                      <div 
                        key={`${r}-${c}`} 
                        data-r={r}
                        data-c={c}
                        className={`grid-cell ${colorClass}`}
                        onMouseDown={() => handleMouseDown(r, c)}
                        onMouseEnter={() => handleMouseEnter(r, c)}
                        onTouchStart={(e) => handleTouchStart(e, r, c)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        style={{ touchAction: 'none' }}
                      >
                        {letter}
                      </div>
                    );
                  })
                ))}
              </div>
              <div className="controls" style={{ marginTop: '20px' }}>
                <button onClick={() => { setGameOver(true); setGameEndTime(Date.now()); }} className="btn danger-btn">End Game</button>
              </div>
            </div>

          </div>

          {/* Follow-up Question Modal */}
          {activeQuestion && (
            <div className="question-modal-overlay">
              <div className="question-modal slide-in">
                <h2>Word Found: {activeQuestion.word}!</h2>
                <p className="question-text">{activeQuestion.question}</p>
                <div className="options-list">
                  {activeQuestion.options.map((option, idx) => (
                    <button 
                      key={idx} 
                      className="btn secondary-btn"
                      onClick={() => handleAnswerSubmit(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p className="question-hint text-muted">Answer correctly to secure this word. An incorrect answer will cost you points!</p>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
