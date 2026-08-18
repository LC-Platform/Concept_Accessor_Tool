import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://10.1.88.14:8500';

/* ────────────────────────────────────────────────────────────────────────
   Design tokens
   Palette:
     --ink        #1E1B3A  deep plum (headings, trunk shadow)
     --indigo     #4F46E5  brand indigo (kept from original, primary actions)
     --indigo-lt  #818CF8  brand indigo, light
     --moss       #16A34A  growth accent — completed-progress color
     --moss-lt    #86EFAC  new-growth / leaf highlight
     --bark       #8A5A34  trunk & branch color
     --amber      #F59E0B  level-up / achievement highlight
     --mist       #F3F6FF  page background wash
   Typography: Outfit for display/headings (structural, a little architectural —
   echoes branch geometry), Inter for body/data.
   Signature element: the Journey Path — chapters are stops on a winding road,
   in reading order; a marker glides forward to the current stop as chapters
   are completed.
   ──────────────────────────────────────────────────────────────────────── */

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

:root {
  --ink: #1E1B3A;
  --indigo: #4F46E5;
  --indigo-lt: #818CF8;
  --moss: #16A34A;
  --moss-lt: #86EFAC;
  --moss-dark: #0F5C2E;
  --bark: #8A5A34;
  --bark-lt: #B08862;
  --amber: #F59E0B;
  --mist: #F3F6FF;
  --slate: #64748B;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}

.profile-page-bg {
  min-height: 100vh;
  background:
    radial-gradient(1200px 500px at 15% -10%, rgba(129,140,248,0.14), transparent 60%),
    radial-gradient(900px 500px at 100% 0%, rgba(134,239,172,0.14), transparent 55%),
    linear-gradient(180deg, #f7f8ff 0%, #f3f6ff 40%, #f1fbf5 100%);
  padding: 32px 24px 64px;
}

.profile-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Inter', -apple-system, sans-serif;
  color: #1e293b;
}

.pw-heading, .profile-header h1, .profile-card-header h3, .xp-level, .continue-title {
  font-family: 'Outfit', 'Inter', sans-serif;
}

/* ── Entrance choreography ─────────────────────────────────────────── */
@keyframes riseIn {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
.stagger {
  opacity: 0;
  animation: riseIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* ── Header ─────────────────────────────────────────────────────────── */
.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  padding: 0 4px;
}

.profile-header-left { display: flex; align-items: center; gap: 16px; }

.profile-header h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, var(--ink), var(--indigo));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.back-btn {
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(229, 231, 235, 0.8);
  color: #475569;
  padding: 10px 18px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}
.back-btn:hover {
  background: #fff;
  border-color: var(--indigo);
  transform: translateX(-3px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
}
.back-btn:active { transform: translateX(-1px) scale(0.98); }

.username-chip {
  font-size: 14px;
  color: var(--slate);
  font-weight: 500;
  background: rgba(255,255,255,0.7);
  padding: 8px 16px;
  border-radius: 20px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.6);
  transition: box-shadow 0.25s ease;
}
.username-chip:hover { box-shadow: 0 4px 14px rgba(79,70,229,0.12); }

/* ── Stats bar ──────────────────────────────────────────────────────── */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-item {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(229, 231, 235, 0.6);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s ease, border-color 0.3s ease;
}
.stat-item:hover {
  transform: translateY(-5px) scale(1.015);
  box-shadow: 0 10px 26px rgba(30, 27, 58, 0.10);
  border-color: rgba(99,102,241,0.25);
}

.stat-item .number {
  font-family: 'Outfit', sans-serif;
  font-size: 30px;
  font-weight: 700;
  color: var(--indigo);
  line-height: 1.2;
  display: block;
  font-variant-numeric: tabular-nums;
}

.stat-item .label {
  font-size: 12.5px;
  color: var(--slate);
  font-weight: 500;
  margin-top: 6px;
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.stat-item .icon { font-size: 22px; display: block; margin-bottom: 6px; }

/* ── Cards ──────────────────────────────────────────────────────────── */
.profile-card {
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(229, 231, 235, 0.6);
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 24px;
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
  box-shadow: 0 4px 24px rgba(0,0,0,0.04);
}
.profile-card:hover { box-shadow: 0 10px 34px rgba(30,27,58,0.07); }

.profile-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(229, 231, 235, 0.4);
}

.profile-card-header h3 {
  margin: 0;
  font-size: 19px;
  color: var(--ink);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ── Profile form grid ──────────────────────────────────────────────── */
.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 11.5px;
  color: var(--slate);
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.value-swap { position: relative; min-height: 44px; }

.form-group .value {
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 10px;
  font-size: 15px;
  color: #1e293b;
  border: 2px solid transparent;
  animation: crossfadeIn 0.3s ease;
}

@keyframes crossfadeIn {
  from { opacity: 0; transform: translateY(-3px); }
  to   { opacity: 1; transform: translateY(0); }
}

.form-group input,
.form-group select {
  padding: 12px 16px;
  border-radius: 10px;
  border: 2px solid #e5e7eb;
  background-color: #fff;
  color: #1e293b;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  width: 100%;
  box-sizing: border-box;
  animation: crossfadeIn 0.3s ease;
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--indigo);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.form-group input:disabled,
.form-group select:disabled {
  background-color: #f8fafc;
  color: var(--slate);
  border-color: #e5e7eb;
  cursor: not-allowed;
}

/* ── Buttons ────────────────────────────────────────────────────────── */
.btn {
  padding: 10px 24px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s cubic-bezier(0.16,1,0.3,1), box-shadow 0.18s ease, background 0.18s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn:active:not(:disabled) { transform: scale(0.97); }

.primary-btn {
  background: linear-gradient(135deg, var(--indigo-lt), var(--indigo));
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}
.primary-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
}

.secondary-btn { background: #f1f5f9; color: #475569; border: 2px solid #e2e8f0; }
.secondary-btn:hover:not(:disabled) { background: #e2e8f0; }

.outline-btn { background: transparent; color: var(--indigo); border: 2px solid var(--indigo-lt); }
.outline-btn:hover:not(:disabled) { background: var(--indigo); border-color: var(--indigo); color: white; }

.profile-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 2px solid rgba(229, 231, 235, 0.4);
}

/* ── Alerts ─────────────────────────────────────────────────────────── */
.alert {
  padding: 14px 18px;
  border-radius: 12px;
  margin-bottom: 20px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: slideDown 0.3s cubic-bezier(0.16,1,0.3,1);
}
.alert-success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.alert-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── XP bar (compact readout beside the tree) ──────────────────────── */
.xp-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 6px;
}
.xp-level {
  font-weight: 700;
  color: var(--ink);
  font-size: 17px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.xp-details { font-size: 13px; color: var(--slate); font-weight: 500; }

.xp-bar {
  background: rgba(226, 232, 240, 0.8);
  border-radius: 999px;
  height: 9px;
  overflow: hidden;
  position: relative;
}
.xp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--moss), var(--moss-lt));
  border-radius: 999px;
  width: 0%;
  transition: width 1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s;
}

/* ── Journey Path ───────────────────────────────────────────────────── */
.journey-section { margin-bottom: 20px; }

.journey-frame { width: 100%; overflow-x: auto; }

.jp-seg { fill: none; stroke: #e2e8f0; stroke-width: 6; stroke-linecap: round; }
.jp-seg-fill {
  fill: none;
  stroke: var(--moss);
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s;
}

.jp-node {
  transform-box: fill-box;
  transform-origin: center;
  transform: scale(0);
  animation: jpPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes jpPop { to { transform: scale(1); } }

.jp-ring { animation: jpPulse 1.8s ease-in-out infinite; }
@keyframes jpPulse {
  0%, 100% { opacity: 0.55; r: 16; }
  50% { opacity: 0.15; r: 20; }
}

.jp-marker {
  transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.3s;
  opacity: 0;
  animation: jpMarkerIn 0.4s ease 0.9s forwards;
}
@keyframes jpMarkerIn { to { opacity: 1; } }

.journey-caption {
  text-align: center;
  margin-top: 2px;
  font-size: 12.5px;
  color: var(--slate);
  font-weight: 500;
}
.journey-caption strong { color: var(--moss-dark); font-weight: 700; }

/* ── Continue reading ───────────────────────────────────────────────── */
.continue-card {
  background: linear-gradient(135deg, rgba(22,163,74,0.07), rgba(134,239,172,0.06));
  border: 1px solid rgba(22,163,74,0.18);
  border-radius: 14px;
  padding: 18px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}
.continue-card:hover {
  border-color: var(--moss);
  box-shadow: 0 4px 16px rgba(22,163,74,0.12);
  transform: translateY(-2px);
}
.continue-info { flex: 1; }
.continue-label {
  font-size: 11.5px; color: #94a3b8; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.6px;
}
.continue-title { font-weight: 600; color: var(--ink); font-size: 16px; margin-top: 2px; }

.continue-btn {
  padding: 9px 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, var(--moss), var(--moss-dark));
  color: white;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  box-shadow: 0 2px 8px rgba(22,163,74,0.3);
  flex-shrink: 0;
}
.continue-btn:hover { transform: scale(1.05); box-shadow: 0 4px 16px rgba(22,163,74,0.4); }
.continue-btn:active { transform: scale(0.98); }

/* ── Password ───────────────────────────────────────────────────────── */
.password-hint { color: #94a3b8; font-size: 12px; margin-top: 4px; display: flex; align-items: center; gap: 4px; }

/* ── Loading skeleton ───────────────────────────────────────────────── */
.skeleton {
  background: linear-gradient(90deg, #eef1f8 25%, #f7f8fc 37%, #eef1f8 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
  border-radius: 12px;
}
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

/* ── Responsive ─────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .profile-page-bg { padding: 16px; }
  .stats-bar { grid-template-columns: repeat(2, 1fr); }
  .profile-grid { grid-template-columns: 1fr; gap: 16px; }
  .profile-header { flex-direction: column; align-items: stretch; gap: 12px; }
  .profile-header-left { justify-content: space-between; }
  .profile-card { padding: 20px; }
  .continue-card { flex-direction: column; gap: 12px; text-align: center; }
  .continue-info { text-align: center; }
}
`;

/* ────────────────────────────────────────────────────────────────────────
   JourneyPath — the page's signature element.
   Chapters are stops along a winding road, in reading order (structure that
   actually carries meaning here, unlike a generic numbered list). Completed
   stops are filled and joined by a solid road; the current chapter pulses;
   everything after it is locked. A marker sits at the current stop and
   glides forward whenever progress changes.
   ──────────────────────────────────────────────────────────────────────── */
function JourneyPath({ total = 0, started = 0, continueChapterName = '' }) {
  const capped = Math.min(Math.max(total, 1), 10);
  const current = Math.min(Math.max(started, 0) + 1, capped); // 1-indexed "next up" stop
  const W = 640, H = 130, marginX = 36, topY = 40, botY = 92;

  const svgRef = useRef(null);
  const fillRef = useRef(null);
  const [fullLen, setFullLen] = useState(0);

  const { xs, ys, pathD } = useMemo(() => {
    const xs = [], ys = [];
    for (let i = 0; i < capped; i++) {
      xs.push(marginX + (i * (W - 2 * marginX)) / Math.max(capped - 1, 1));
      ys.push(i % 2 === 0 ? topY : botY);
    }
    let d = `M ${xs[0]} ${ys[0]}`;
    for (let i = 0; i < capped - 1; i++) {
      const midX = (xs[i] + xs[i + 1]) / 2;
      d += ` C ${midX} ${ys[i]} ${midX} ${ys[i + 1]} ${xs[i + 1]} ${ys[i + 1]}`;
    }
    return { xs, ys, pathD: d };
  }, [capped]);

  useEffect(() => {
    if (fillRef.current) setFullLen(fillRef.current.getTotalLength());
  }, [pathD]);

  const partialLen = fullLen * (current - 1) / Math.max(capped - 1, 1);
  const markerPt = fillRef.current && fullLen ? fillRef.current.getPointAtLength(partialLen) : null;

  return (
    <div className="journey-frame">
      <svg ref={svgRef} width="100%" height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ minWidth: 480 }}>
        <path className="jp-seg" d={pathD} />
        <path
          ref={fillRef}
          className="jp-seg-fill"
          d={pathD}
          style={{
            strokeDasharray: fullLen,
            strokeDashoffset: fullLen ? fullLen - partialLen : fullLen,
          }}
        />
        {xs.map((x, i) => {
          const state = i < current - 1 ? 'done' : i === current - 1 ? 'current' : 'locked';
          const fill = state === 'done' ? 'var(--moss)' : state === 'current' ? '#FAEEDA' : '#fff';
          const stroke = state === 'done' ? 'var(--moss)' : state === 'current' ? 'var(--amber)' : '#cbd5e1';
          const textFill = state === 'done' ? '#fff' : state === 'current' ? '#854F0B' : '#94a3b8';
          return (
            <g key={i} className="jp-node" style={{ animationDelay: `${i * 0.07}s` }}>
              {state === 'current' && (
                <circle className="jp-ring" cx={x} cy={ys[i]} r="16" fill="none" stroke="var(--amber)" strokeWidth="2" />
              )}
              <circle cx={x} cy={ys[i]} r="13" fill={fill} stroke={stroke} strokeWidth="2" />
              <text x={x} y={ys[i] + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill={textFill}>
                {i + 1}
              </text>
            </g>
          );
        })}
        {markerPt && (
          <g className="jp-marker" style={{ transform: `translate(${markerPt.x}px, ${markerPt.y - 22}px)` }}>
            <circle r="7" fill="var(--indigo)" />
            <circle r="3" fill="#fff" />
          </g>
        )}
      </svg>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = storedUser.user_id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({ name: '', username: '', email: '', standard: '' });
  const [editMode, setEditMode] = useState(false);

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwMode, setPwMode] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [xpFillPct, setXpFillPct] = useState(0);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setError('Not logged in');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/profile/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to load profile');
      setProfile(data);
      setForm({
        name: data.name || '',
        username: data.username || '',
        email: data.email || '',
        standard: data.standard || '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!userId) return;

    const fetchStats = async () => {
      setStatsLoading(true);
      setStatsError('');
      try {
        const res = await fetch(`${API_BASE}/profile/${userId}/stats`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to load stats');
        setStats(data);
      } catch (err) {
        setStatsError(err.message);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  // Animate the XP bar fill in on data arrival (rather than snapping instantly).
  useEffect(() => {
    if (!stats) return;
    setXpFillPct(0);
    const t = setTimeout(() => setXpFillPct(stats.level.percent_to_next_level), 60);
    return () => clearTimeout(t);
  }, [stats]);

  const handleFieldChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSaveProfile = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    const payload = {};
    Object.keys(form).forEach((key) => {
      if (form[key] !== profile[key]) payload[key] = form[key];
    });

    if (Object.keys(payload).length === 0) {
      setEditMode(false);
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update profile');

      setProfile(data.profile);
      setSuccessMsg('Profile updated successfully');
      setEditMode(false);

      const updatedUser = { ...storedUser, ...data.profile };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setForm({
      name: profile.name || '',
      username: profile.username || '',
      email: profile.email || '',
      standard: profile.standard || '',
    });
    setEditMode(false);
    setError('');
  };

  const handlePwFieldChange = (field) => (e) => {
    setPwForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwError('New passwords do not match');
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch(`${API_BASE}/profile/${userId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pwForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to change password');

      setPwSuccess('Password updated successfully');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setPwMode(false), 1200);
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-page-bg">
        <style>{styles}</style>
        <div className="profile-wrapper">
          <div className="skeleton" style={{ height: 40, width: 220, marginBottom: 28 }} />
          <div className="skeleton" style={{ height: 110, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 220, marginBottom: 24 }} />
          <div className="skeleton" style={{ height: 220 }} />
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="profile-page-bg">
        <style>{styles}</style>
        <div className="profile-wrapper">
          <div className="alert alert-error">⚠️ {error}</div>
          {!userId ? (
            <button onClick={() => navigate('/login')} className="btn primary-btn">
              Go to Login
            </button>
          ) : (
            <button onClick={fetchProfile} className="btn secondary-btn">Retry</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-bg">
      <style>{styles}</style>
      <div className="profile-wrapper">
        <header className="profile-header stagger" style={{ animationDelay: '0s' }}>
          <div className="profile-header-left">
            <button onClick={() => navigate(-1)} className="back-btn">← Back</button>
            <h1>Profile</h1>
          </div>
          <div className="username-chip">@{profile?.username}</div>
        </header>

        {successMsg && <div className="alert alert-success">✅ {successMsg}</div>}
        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {/* Stats Bar */}
        {!statsLoading && stats && (
          <div className="stats-bar">
            {[
              { icon: '📚', num: `${stats.chapters.started}/${stats.chapters.total}`, label: 'Chapters Started' },
              { icon: '🎮', num: stats.games.played, label: 'Games Played' },
              { icon: '⭐', num: `${stats.games.average_score_percent}%`, label: 'Average Score' },
              { icon: '🏅', num: stats.level.level_name, label: 'Current Level' },
            ].map((s, idx) => (
              <div className="stat-item stagger" key={s.label} style={{ animationDelay: `${0.05 + idx * 0.06}s` }}>
                <span className="icon">{s.icon}</span>
                <span className="number">{s.num}</span>
                <span className="label">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Profile Card */}
        <div className="profile-card stagger" style={{ animationDelay: '0.12s' }}>
          <div className="profile-card-header">
            <h3>👤 Personal Information</h3>
            {!editMode ? (
              <button className="btn outline-btn" onClick={() => setEditMode(true)}>
                ✏️ Edit Profile
              </button>
            ) : (
              <button className="btn secondary-btn" onClick={handleCancelEdit}>
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className="profile-grid">
              <div className="form-group">
                <label>Full Name</label>
                <div className="value-swap">
                  {editMode ? (
                    <input type="text" value={form.name} onChange={handleFieldChange('name')} required />
                  ) : (
                    <div className="value">{profile?.name || '—'}</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Username</label>
                <div className="value-swap">
                  {editMode ? (
                    <input type="text" value={form.username} onChange={handleFieldChange('username')} required />
                  ) : (
                    <div className="value">@{profile?.username}</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <div className="value-swap">
                  {editMode ? (
                    <input type="email" value={form.email} onChange={handleFieldChange('email')} required />
                  ) : (
                    <div className="value">{profile?.email}</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Standard</label>
                <div className="value-swap">
                  {editMode ? (
                    <select value={form.standard} onChange={handleFieldChange('standard')} required>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                    </select>
                  ) : (
                    <div className="value">Class {profile?.standard}</div>
                  )}
                </div>
              </div>
            </div>

            {editMode && (
              <div className="profile-actions">
                <button type="button" className="btn primary-btn" disabled={saving} onClick={handleSaveProfile}>
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
                <button type="button" className="btn secondary-btn" onClick={handleCancelEdit} disabled={saving}>
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Progress Card — Growth Tree */}
        <div className="profile-card stagger" style={{ animationDelay: '0.2s' }}>
          <div className="profile-card-header">
            <h3>🌳 Your Progress</h3>
          </div>

          {statsLoading && <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading progress...</p>}
          {statsError && <div className="alert alert-error">{statsError}</div>}

          {stats && (
            <>
              <div className="journey-section">
                <JourneyPath
                  total={stats.chapters.total}
                  started={stats.chapters.started}
                  continueChapterName={stats.chapters.continue_reading?.chapter_name}
                />
                <div className="journey-caption">
                  <strong>{stats.chapters.started}</strong> of <strong>{stats.chapters.total}</strong> chapters complete
                </div>
              </div>

              <div className="xp-header">
                <span className="xp-level">🏅 {stats.level.level_name}</span>
                <span className="xp-details">
                  {stats.level.xp} XP
                  {stats.level.next_level_name &&
                    ` · ${stats.level.next_level_min_xp - stats.level.xp} XP to ${stats.level.next_level_name}`}
                </span>
              </div>
              <div className="xp-bar" style={{ marginBottom: 20 }}>
                <div className="xp-bar-fill" style={{ width: `${xpFillPct}%` }} />
              </div>

              {stats.chapters.continue_reading && (
                <div className="continue-card">
                  <div className="continue-info">
                    <div className="continue-label">📖 Continue Reading</div>
                    <div className="continue-title">{stats.chapters.continue_reading.chapter_name}</div>
                  </div>
                  <button
                    className="continue-btn"
                    onClick={() => navigate(`/analyze/${stats.chapters.continue_reading.chapter_id}`)}
                  >
                    Resume →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Password Card */}
        <div className="profile-card stagger" style={{ animationDelay: '0.28s' }}>
          <div className="profile-card-header">
            <h3>🔒 Security</h3>
            {!pwMode && (
              <button className="btn outline-btn" onClick={() => setPwMode(true)}>
                Change Password
              </button>
            )}
          </div>

          {pwMode && (
            <form onSubmit={handleChangePassword}>
              {pwError && <div className="alert alert-error">⚠️ {pwError}</div>}
              {pwSuccess && <div className="alert alert-success">✅ {pwSuccess}</div>}

              <div className="profile-grid">
                <div className="form-group">
                  <label>Current Password</label>
                  <input type="password" value={pwForm.current_password} onChange={handlePwFieldChange('current_password')} required />
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" value={pwForm.new_password} onChange={handlePwFieldChange('new_password')} required />
                  <span className="password-hint">🔑 Min 8 chars, 1 uppercase, 1 number, 1 special</span>
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input type="password" value={pwForm.confirm_password} onChange={handlePwFieldChange('confirm_password')} required />
                </div>
              </div>

              <div className="profile-actions">
                <button type="submit" className="btn primary-btn" disabled={pwSaving}>
                  {pwSaving ? 'Updating...' : '🔄 Update Password'}
                </button>
                <button
                  type="button"
                  className="btn secondary-btn"
                  onClick={() => {
                    setPwMode(false);
                    setPwError('');
                    setPwForm({ current_password: '', new_password: '', confirm_password: '' });
                  }}
                  disabled={pwSaving}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}