import React, { useState, useEffect } from 'react';
import OddOneOut from './OddOneOut';
import Hangman from './Hangman';
import Galactica from './Galactica';
import Connections from './Connections';
import FourPicsOneWord from './FourPicsOneWord';
import WordSearch from './WordSearch';
import LogicGridPuzzle from './LogicGridPuzzle';
import RiverCrossing from './RiverCrossing';
import StoryArrangement from './StoryArrangement';
import Pips from './Pips';
import { submitReport, clearReports, getReports, getGameMetadata } from '../../games/api';
import './index.css';

const ReportModal = ({ analysis, onClose, onReset }) => {
  const [isMethodB, setIsMethodB] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await getReports();
        setHistory(data);
      } catch (err) {
        console.warn("Failed to load submission history from backend:", err);
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, []);

  if (!analysis) {
    return (
      <div className="report-modal-overlay" onClick={onClose}>
        <div className="report-modal" onClick={e => e.stopPropagation()}>
          <header className="report-header">
            <div className="report-title-area">
              <h2>No Report Available</h2>
            </div>
            <button className="close-report-btn" onClick={onClose}>✕</button>
          </header>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>
              Please play at least 2 games and click 'Submit Games Report' to generate an analysis.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const {
    composite_score_a,
    composite_score_b,
    proficiency_level_a,
    proficiency_level_b,
    category_percentages,
    game_details,
    weights_a,
    weights_b,
    categories_config
  } = analysis;

  const compositeScore = isMethodB ? composite_score_b : composite_score_a;
  const proficiencyLevel = isMethodB ? proficiency_level_b : proficiency_level_a;
  const weights = isMethodB ? weights_b : weights_a;
  const playedCount = game_details.filter(g => g.played).length;

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={e => e.stopPropagation()}>
        <header className="report-header">
          <div className="report-title-area">
            <h2>Student Progress Report</h2>
            <p>A comprehensive analytical summary of cognitive performance</p>
          </div>
          <button className="close-report-btn" onClick={onClose}>✕</button>
        </header>

        <div className="method-toggle-container">
          <span className={`toggle-label ${!isMethodB ? 'active' : ''}`} onClick={() => setIsMethodB(false)}>
            Method A (Fixed Weights)
          </span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={isMethodB} 
              onChange={e => setIsMethodB(e.target.checked)} 
            />
            <span className="slider"></span>
          </label>
          <span className={`toggle-label ${isMethodB ? 'active' : ''}`} onClick={() => setIsMethodB(true)}>
            Method B (Proportional Weights)
          </span>
        </div>

        <section className="report-summary-section">
          <div className="summary-card fade-in">
            <h4>Total Games Played</h4>
            <p className="value">{playedCount} / 10</p>
          </div>
          <div className="summary-card fade-in" style={{ animationDelay: '0.1s' }}>
            <h4>Composite Score</h4>
            <p className="value score">{compositeScore.toFixed(1)}%</p>
          </div>
          <div className="summary-card fade-in" style={{ animationDelay: '0.2s' }}>
            <h4>Proficiency Level</h4>
            <p className={`value level ${proficiencyLevel.toLowerCase()}`}>{proficiencyLevel}</p>
          </div>
        </section>

        <h3 className="category-analysis-title">Cognitive Construct Analysis</h3>
        <section className="category-grid">
          {categories_config.map((cat, index) => {
            const pct = category_percentages[cat.key] || 0;
            const weightPct = ((weights[cat.key] || 0) * 100).toFixed(1);
            return (
              <div 
                key={cat.key} 
                className={`category-card ${cat.key.toLowerCase()} fade-in`}
                style={{ animationDelay: `${0.1 * (index + 1)}s` }}
              >
                <div className="category-header">
                  <div className="category-title">
                    <span className="icon">{cat.icon}</span>
                    <h3>{cat.name}</h3>
                  </div>
                  <span className="category-pct">{pct.toFixed(1)}%</span>
                </div>
                <div className="category-progress-container">
                  <div className="category-progress-bar" style={{ width: `${pct}%` }}></div>
                </div>
                <div className="category-info">
                  <span>Weightage: {weightPct}%</span>
                  <span>Contribution: {((pct * (weights[cat.key] || 0))).toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </section>

        <div className="detailed-table-section">
          <h3>Detailed Game Summary</h3>
          <div className="games-report-table-wrapper">
            <table className="games-report-table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Construct Categories</th>
                  <th>Status</th>
                  <th>Score achieved</th>
                  <th>Behavior Score</th>
                  <th>Normalized contribution ($S_i$)</th>
                </tr>
              </thead>
              <tbody>
                {game_details.map(g => {
                  const rawScore = g.score;
                  const maxScore = g.maxScore;
                  const normalized = g.normalized_contribution;
                  const behaviorScore = g.behaviorScore;
                  return (
                    <tr key={g.id}>
                      <td><span style={{ marginRight: '10px', fontSize: '1.3rem' }}>{g.icon}</span>{g.name}</td>
                      <td>
                        <div className="tag-list">
                          {g.categories.map(c => (
                            <span key={c} className={`category-tag ${c.toLowerCase()}`}>{c}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${g.played ? 'played' : 'unplayed'}`}>
                          {g.played ? '✓ Played' : 'Not Played'}
                        </span>
                      </td>
                      <td>{g.played ? `${rawScore} / ${maxScore}` : '—'}</td>
                      <td>{behaviorScore !== null && behaviorScore !== undefined ? `${(behaviorScore).toFixed(0)} / 100` : '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{normalized.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="history-section">
          <h3>📁 Submission History (MongoDB)</h3>
          {historyLoading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading history...</p>
          ) : history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No previous submissions found in the database.</p>
          ) : (
            <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                {history.map((rep, idx) => {
                  const dateStr = new Date(rep.created_at).toLocaleString();
                  const gamesPlayed = Object.keys(rep.played_games || {}).length;
                  return (
                    <li 
                      key={rep.id || idx} 
                      style={{ 
                        padding: '12px 16px', 
                        borderBottom: '1px solid var(--border-light)', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '0.9rem',
                        borderRadius: '8px',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,70,229,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ color: 'var(--text-main)' }}>Submitted: <strong>{dateStr}</strong></span>
                      <span style={{ color: 'var(--text-muted)' }}>Games: <strong>{gamesPlayed}/10</strong></span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="report-actions">
          <button className="reset-scores-btn" onClick={onReset}>🔄 Clear Progress & Reset</button>
          <button className="btn primary-btn" style={{ margin: 0, padding: '10px 28px' }} onClick={onClose}>Close Report</button>
        </div>
      </div>
    </div>
  );
};

const FALLBACK_GAMES = [
  { id: 'galactica', name: 'Galactica', icon: '🚀', description: 'Blast asteroids with correct biology answers!' },
  { id: 'logicGrid', name: 'Logical Deduction Grid', icon: '🧩', description: 'Use clues to deduce relationships.' },
  { id: 'wordSearch', name: 'Word Search', icon: '🔍', description: 'Find biology terms hidden in the grid!' },
  { id: 'riverCrossing', name: 'River Crossing', icon: '🛶', description: 'Transport organisms across the river safely.' },
  { id: 'storyArrangement', name: 'Story Arrangement', icon: '📝', description: 'Arrange images and sentences into sequence!' },
  { id: 'hangman', name: 'Biology Hangman', icon: '🤔', description: 'Guess the biological term before time runs out!' },
  { id: 'pips', name: 'Pips', icon: '🎲', description: 'Place dominoes satisfying grid logic.' },
  { id: 'fourPics', name: '4 Pics 1 Word', icon: '🖼️', description: 'Find the common biological term linking 4 images!' },
  { id: 'connections', name: 'Connections', icon: '🔗', description: 'Group 16 words into 4 related categories!' },
  { id: 'oddOneOut', name: 'Odd One Out', icon: '❓', description: 'Identify the word that doesn\'t belong to Biology!' }
];

const GamesAssessment = ({ onComplete }) => {
  const [selectedGame, setSelectedGame] = useState(null);
  const [showNavbar, setShowNavbar] = useState(false);
  const [oddKey, setOddKey] = useState(0);
  const [hangKey, setHangKey] = useState(0);
  const [galacticaKey, setGalacticaKey] = useState(0);
  const [connectionsKey, setConnectionsKey] = useState(0);
  const [fourPicsKey, setFourPicsKey] = useState(0);
  const [wordSearchKey, setWordSearchKey] = useState(0);
  const [logicKey, setLogicKey] = useState(0);
  const [riverKey, setRiverKey] = useState(0);
  const [storyKey, setStoryKey] = useState(0);
  const [pipsKey, setPipsKey] = useState(0);

  const [playedGames, setPlayedGames] = useState({});
  const [showReport, setShowReport] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [backendGames, setBackendGames] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReportData = () => {
    const games = [
      { id: 'galactica', storageKey: 'game_galactica' },
      { id: 'pips', storageKey: 'game_pips' },
      { id: 'logicGrid', storageKey: 'game_logicGrid' },
      { id: 'wordSearch', storageKey: 'game_wordSearch' },
      { id: 'riverCrossing', storageKey: 'game_riverCrossing' },
      { id: 'storyArrangement', storageKey: 'game_storyArrangement' },
      { id: 'hangman', storageKey: 'game_hangman' },
      { id: 'fourPics', storageKey: 'game_fourPics' },
      { id: 'connections', storageKey: 'game_connections' },
      { id: 'oddOneOut', storageKey: 'game_oddOneOut' }
    ];

    const data = {};
    games.forEach(g => {
      const saved = localStorage.getItem(g.storageKey);
      if (saved) {
        data[g.id] = JSON.parse(saved);
      }
    });
    setPlayedGames(data);
  };

  useEffect(() => {
    loadReportData();

    const loadMetadata = async () => {
      try {
        const meta = await getGameMetadata();
        if (meta && meta.games) {
          setBackendGames(meta.games);
        }
      } catch (err) {
        console.warn("Failed to load backend games metadata, using fallback:", err);
      }
    };
    loadMetadata();

    const fetchLatestHistory = async () => {
      try {
        const historyData = await getReports();
        if (historyData && historyData.length > 0 && historyData[0].analysis) {
          setLatestAnalysis(historyData[0].analysis);
        }
      } catch (err) {
        console.warn("Failed to fetch latest history on mount:", err);
      }
    };
    fetchLatestHistory();

    window.addEventListener('biology_game_score_updated', loadReportData);
    return () => {
      window.removeEventListener('biology_game_score_updated', loadReportData);
    };
  }, []);

  useEffect(() => {
    setShowNavbar(!!selectedGame);
  }, [selectedGame]);

  const handleBack = () => {
    setSelectedGame(null);
    loadReportData();
  };

  const handleSubmitReport = async () => {
    setIsSubmitting(true);

    try {
      const res = await submitReport(playedGames);

      if (res && res.success && res.analysis) {
        setLatestAnalysis(res.analysis);
        localStorage.setItem(
          "proficiency_level",
          res.analysis.proficiency_level_a
        );

        // ✅ Success message
        alert(
          `🎉 Your games report has been generated successfully!\n\n` +
          `You completed ${Object.keys(playedGames).length} games.\n` +
          `Your report is now ready.`
        );

        if (typeof onComplete === "function") {
          onComplete(res.analysis);
          return;
        }

        setShowReport(true);
      } else {
        throw new Error("Failed to get scoring analysis");
      }
    } catch (err) {
      console.warn("Failed to submit report:", err);
      alert("❌ Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetScores = async () => {
    if (window.confirm("Are you sure you want to clear your games progress report and start over? This action cannot be undone.")) {
      try {
        await clearReports();
      } catch (err) {
        console.warn("Failed to clear reports on backend:", err);
      }
      const keys = [
        'game_galactica', 'game_pips', 'game_logicGrid', 'game_wordSearch', 
        'game_riverCrossing', 'game_storyArrangement', 'game_hangman', 
        'game_fourPics', 'game_connections', 'game_oddOneOut'
      ];
      keys.forEach(k => localStorage.removeItem(k));
      setPlayedGames({});
      setLatestAnalysis(null);
      setSelectedGame(null);
      setShowReport(false);
      window.dispatchEvent(new Event('biology_game_score_updated'));
    }
  };

  const playedCount = Object.keys(playedGames).length;

  const renderGame = () => {
    switch (selectedGame) {
      case 'oddOneOut':
        return <OddOneOut key={oddKey} onBack={handleBack} onRestart={() => setOddKey(k => k + 1)} />;
      case 'hangman':
        return <Hangman key={hangKey} onBack={handleBack} onRestart={() => setHangKey(k => k + 1)} />;
      case 'galactica':
        return <Galactica key={galacticaKey} onBack={handleBack} onRestart={() => setGalacticaKey(k => k + 1)} />;
      case 'connections':
        return <Connections key={connectionsKey} onBack={handleBack} onRestart={() => setConnectionsKey(k => k + 1)} />;
      case 'fourPics':
        return <FourPicsOneWord key={fourPicsKey} onBack={handleBack} onRestart={() => setFourPicsKey(k => k + 1)} />;
      case 'wordSearch':
        return <WordSearch key={wordSearchKey} onBack={handleBack} onRestart={() => setWordSearchKey(k => k + 1)} />;
      case 'logicGrid':
        return <LogicGridPuzzle key={logicKey} onBack={handleBack} onRestart={() => setLogicKey(k => k + 1)} />;
      case 'riverCrossing':
        return <RiverCrossing key={riverKey} onBack={handleBack} onRestart={() => setRiverKey(k => k + 1)} />;
      case 'storyArrangement':
        return <StoryArrangement key={storyKey} onBack={handleBack} onRestart={() => setStoryKey(k => k + 1)} />;
      case 'pips':
        return <Pips key={pipsKey} onBack={handleBack} onRestart={() => setPipsKey(k => k + 1)} />;
      default:
        const gamesList = backendGames.length > 0 ? backendGames : FALLBACK_GAMES;
        return (
          <div className="landing-page slide-in">
            <header className="landing-header">
              <h1>Biology Games Central</h1>
              <p>Master Biology terms through fun interactive challenges!</p>
            </header>
            
            <div className="game-selection">
              {gamesList.map((g, index) => {
                const isPlayed = playedGames[g.id] !== undefined;
                return (
                  <div 
                    key={g.id} 
                    className="game-card-select fade-in"
                    style={{ animationDelay: `${0.05 * (index + 1)}s` }}
                    onClick={() => setSelectedGame(g.id)}
                  >
                    {isPlayed && <div className="played-badge">✓</div>}
                    <div className="card-icon">{g.icon}</div>
                    <h2>{g.name}</h2>
                    <p>{g.description || g.name}</p>
                    <button className="btn primary-btn">
                      {isPlayed ? 'Play Again' : 'Play Now'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      {showNavbar && (
        <nav className="navbar slide-down">
          <div className="logo">BioGames</div>
          <button className="back-btn" onClick={handleBack}>
            ← Back to Games
          </button>
        </nav>
      )}

      <div className="global-report-container">
        <button 
          className="global-report-btn"
          disabled={playedCount < 2 || isSubmitting}
          onClick={handleSubmitReport}
        >
          {isSubmitting ? '⏳ Submitting...' : `📊 Submit Games Report (${playedCount}/10)`}
        </button>
        <button
          className="reset-progress-btn"
          onClick={handleResetScores}
          disabled={playedCount === 0}
        >
          🔄 Reset Progress
        </button>
        {playedCount < 2 && (
          <span className="tooltip-text">
            Play at least 2 games to submit a report!
          </span>
        )}
      </div>

      <main className="game-container-main">
        {renderGame()}
      </main>

      {showReport && (
        <ReportModal 
          analysis={latestAnalysis} 
          onClose={() => {
            setShowReport(false);
            loadReportData();
          }} 
          onReset={handleResetScores} 
        />
      )}
    </div>
  );
};

export default GamesAssessment;