import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getGameQuestions } from '../../games/api';

const CANVAS_W = 600;
const CANVAS_H = 500;
const SHIP_W = 50;
const SHIP_H = 50;
const BULLET_SPEED = 8;
const OPTION_SPEED_BASE = 0.5;

export default function Galactica({ onBack, onRestart }) {
  const [questions, setQuestions] = useState([]);
  const canvasRef = useRef(null);
  const stateRef = useRef({
    shipX: CANVAS_W / 2 - SHIP_W / 2,
    bullets: [],
    options: [],
    score: 0,
    lives: 3,
    questionIdx: 0,
    gameOver: false,
    gameWon: false,
    gameStartTime: Date.now(),
    gameEndTime: null,
    keys: {},
    frameCount: 0,
  });
  const animFrameRef = useRef(null);
  const [displayState, setDisplayState] = useState({
    score: 0,
    lives: 3,
    questionIdx: 0,
    gameOver: false,
    gameWon: false,
    gameEndTime: null,
  });

  // Single source of truth: React `questions` state.
  const getCurrentQuestion = useCallback(
    (idx) => questions[idx % questions.length],
    [questions]
  );

  const spawnOptions = useCallback(
    (questionIdx) => {
      const q = questions[questionIdx];
      if (!q) return [];

      const shuffled = [...q.options].sort(() => Math.random() - 0.5);
      const spacing = CANVAS_W / 4;

      return shuffled.map((opt, i) => ({
        text: opt,
        x: spacing * i + spacing / 2 - 55,
        y: -60 - Math.random() * 80,
        w: 110,
        h: 44,
        speed: OPTION_SPEED_BASE + questionIdx * 0.06,
        isAnswer: opt === q.answer,
      }));
    },
    [questions]
  );

  // Draw everything on canvas
  const draw = useCallback((ctx, s) => {
    // Background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 60; i++) {
      const sx = (i * 97 + s.frameCount * 0.3) % CANVAS_W;
      const sy = (i * 137 + s.frameCount * 0.5) % CANVAS_H;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Ship
    ctx.save();
    ctx.translate(s.shipX + SHIP_W / 2, CANVAS_H - 60);
    // Body
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(0, -SHIP_H / 2);
    ctx.lineTo(SHIP_W / 2, SHIP_H / 2);
    ctx.lineTo(-SHIP_W / 2, SHIP_H / 2);
    ctx.closePath();
    ctx.fill();
    // Cockpit
    ctx.fillStyle = '#93c5fd';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    // Engine glow
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(-12, SHIP_H / 2);
    ctx.lineTo(12, SHIP_H / 2);
    ctx.lineTo(0, SHIP_H / 2 + 15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Bullets
    s.bullets.forEach((b) => {
      const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y - 15);
      grad.addColorStop(0, '#60a5fa');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(b.x - 3, b.y - 15, 6, 15);
    });

    // Option boxes
    s.options.forEach((opt) => {
      ctx.shadowColor = '#6366f1';
      ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgba(99,102,241,0.2)';
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(opt.x, opt.y, opt.w, opt.h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(opt.text, opt.x + opt.w / 2, opt.y + opt.h / 2, opt.w - 10);
    });
  }, []);

  // Fetch questions once on mount
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const data = await getGameQuestions('galactica');

        if (!Array.isArray(data) || data.length === 0) {
          console.error('No questions received from API.');
          return;
        }

        setQuestions(data);
      } catch (err) {
        console.error('Failed to fetch Galactica questions:', err);
      }
    };

    loadQuestions();
  }, []);

  // Main game loop — now correctly re-runs once `questions` populates
  useEffect(() => {
    if (questions.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    // Reset relevant state for a fresh run whenever questions load
    s.questionIdx = 0;
    s.options = spawnOptions(0);
    s.bullets = [];

    const handleKey = (e) => {
      s.keys[e.key] = e.type === 'keydown';
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);

    const loop = () => {
      if (s.gameOver) return;
      s.frameCount++;

      // Move ship
      if ((s.keys['ArrowLeft'] || s.keys['a']) && s.shipX > 0) s.shipX -= 5;
      if ((s.keys['ArrowRight'] || s.keys['d']) && s.shipX < CANVAS_W - SHIP_W) s.shipX += 5;

      // Move bullets
      s.bullets = s.bullets.map((b) => ({ ...b, y: b.y - BULLET_SPEED })).filter((b) => b.y > 0);

      // Move options down
      s.options = s.options.map((o) => ({ ...o, y: o.y + o.speed }));

      // Bullet-option collision
      let hit = false;
      s.bullets.forEach((b) => {
        s.options.forEach((opt) => {
          if (!hit && b.x > opt.x && b.x < opt.x + opt.w && b.y > opt.y && b.y < opt.y + opt.h) {
            hit = true;
            if (opt.isAnswer) {
              s.score += 100;
              s.questionIdx++;
              if (s.questionIdx >= questions.length) {
                s.gameOver = true;
                s.gameWon = true;
                s.gameEndTime = Date.now();
              } else {
                s.options = spawnOptions(s.questionIdx);
                s.bullets = [];
              }
            } else {
              s.lives--;
              s.options = s.options.filter((o) => o !== opt);
              if (s.lives <= 0) {
                s.gameOver = true;
                s.gameEndTime = Date.now();
              }
            }
          }
        });
      });

      // Option hits bottom - lose a life
      const escaped = s.options.filter((o) => o.y > CANVAS_H);
      if (escaped.length > 0) {
        s.lives = Math.max(0, s.lives - escaped.length);
        s.options = s.options.filter((o) => o.y <= CANVAS_H);
        if (s.options.length === 0) {
          if (s.lives <= 0) {
            s.gameOver = true;
            s.gameEndTime = Date.now();
          } else {
            s.options = spawnOptions(s.questionIdx);
          }
        }
        if (s.lives <= 0) {
          s.gameOver = true;
          s.gameEndTime = Date.now();
        }
      }

      draw(ctx, s);
      setDisplayState({
        score: s.score,
        lives: s.lives,
        questionIdx: s.questionIdx,
        gameOver: s.gameOver,
        gameWon: s.gameWon,
        gameEndTime: s.gameEndTime,
      });
      if (!s.gameOver) animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
  }, [questions, draw, spawnOptions]);

  // Shoot on Space
  useEffect(() => {
    const shoot = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        const s = stateRef.current;
        if (!s.gameOver) {
          s.bullets.push({ x: s.shipX + SHIP_W / 2, y: CANVAS_H - 70 });
        }
      }
    };
    window.addEventListener('keydown', shoot);
    return () => window.removeEventListener('keydown', shoot);
  }, []);

  // Touch/click controls
  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const s = stateRef.current;
    const scaleX = CANVAS_W / rect.width;
    s.shipX = x * scaleX - SHIP_W / 2;
    s.shipX = Math.max(0, Math.min(CANVAS_W - SHIP_W, s.shipX));
    s.bullets.push({ x: s.shipX + SHIP_W / 2, y: CANVAS_H - 70 });
  };

  const formatTime = (ms) => {
    if (!ms) return '0s';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  };

  useEffect(() => {
    if (displayState.gameOver) {
      const reportData = {
        played: true,
        completed: true,
        score: displayState.score,
        maxScore: questions.length * 100,
        timestamp: Date.now(),
      };

      localStorage.setItem('game_galactica', JSON.stringify(reportData));
      window.dispatchEvent(new Event('biology_game_score_updated'));
    }
  }, [displayState.gameOver, displayState.score, questions.length]);

  if (!questions || questions.length === 0) {
    return (
      <div className="galactica-wrapper">
        <h2>Loading questions...</h2>
      </div>
    );
  }

  const currentQ = getCurrentQuestion(displayState.questionIdx);

  return (
    <div className="galactica-wrapper fade-in">
      <header className="game-header">
        <button onClick={onBack} className="back-btn">← Back</button>
        <h1>🚀 Galactica</h1>
        <div className="header-stats">
          <div className="question-counter">
            {Math.min(displayState.questionIdx + 1, questions.length)} / {questions.length}
          </div>
          <div className="score-box">
            <span className="label">Score</span>
            <span className="value">{displayState.score}</span>
          </div>
          <div className="score-box">
            <span className="label">Lives</span>
            <span className="value">
              {['❤️', '❤️', '❤️'].slice(0, displayState.lives).join('')}
              {['🖤', '🖤', '🖤'].slice(0, 3 - displayState.lives).join('')}
            </span>
          </div>
        </div>
      </header>

      {!displayState.gameOver ? (
        <>
          <div className="galactica-question">
            <p>{currentQ.question}</p>
          </div>
          <div className="galactica-canvas-wrap">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onClick={handleCanvasClick}
              className="galactica-canvas"
            />
          </div>
          <p className="galactica-hint">
            ⬅️ ➡️ Arrow keys to move &nbsp;|&nbsp; SPACE to shoot &nbsp;|&nbsp; Click canvas to aim & fire
          </p>
        </>
      ) : (
        <div className="game-over-screen slide-in">
          <h2>{displayState.gameWon ? '🏆 You Win!' : '💀 Game Over!'}</h2>
          <div className="stats-container">
            <p>Total Questions: <span>{questions.length}</span></p>
            <p>Questions Answered: <span>{displayState.questionIdx}</span></p>
            <p>Final Score: <span className="text-success">{displayState.score}</span></p>
            <p>
              Time Taken:{' '}
              <span>{formatTime(displayState.gameEndTime ? displayState.gameEndTime - stateRef.current.gameStartTime : 0)}</span>
            </p>
          </div>
          <button onClick={onRestart} className="btn primary-btn">Play Again</button>
          <button onClick={onBack} className="btn secondary-btn" style={{ marginTop: '10px' }}>Main Menu</button>
        </div>
      )}
    </div>
  );
}