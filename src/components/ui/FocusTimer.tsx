import { useState, useEffect, useRef, useCallback } from 'react';

type TimerStatus = 'idle' | 'running' | 'paused' | 'done';

function playBeep() {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 660;
  gain.gain.value = 0.3;
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc.stop(ctx.currentTime + 0.8);
  // Second beep after short pause
  setTimeout(() => {
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 880;
    gain2.gain.value = 0.3;
    osc2.start();
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc2.stop(ctx.currentTime + 0.8);
  }, 300);
}

export function FocusTimer() {
  const [totalSeconds, setTotalSeconds] = useState(1500);
  const [remainingSeconds, setRemainingSeconds] = useState(1500);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [editingTime, setEditingTime] = useState(false);
  const [editValue, setEditValue] = useState('25');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Timer interval
  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setStatus('done');
          playBeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  // Focus edit input
  useEffect(() => {
    if (editingTime && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTime]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const commitEdit = useCallback(() => {
    const mins = parseInt(editValue, 10);
    if (!isNaN(mins) && mins > 0 && mins <= 120) {
      const newTotal = mins * 60;
      setTotalSeconds(newTotal);
      setRemainingSeconds(newTotal);
      setStatus('idle');
    }
    setEditingTime(false);
  }, [editValue]);

  const handleStartPauseResume = () => {
    if (status === 'idle' || status === 'done') {
      if (status === 'done') setRemainingSeconds(totalSeconds);
      setStatus('running');
    } else if (status === 'running') {
      setStatus('paused');
    } else if (status === 'paused') {
      setStatus('running');
    }
  };

  const handleReset = () => {
    setRemainingSeconds(totalSeconds);
    setStatus('idle');
  };

  const buttonLabel = status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : status === 'done' ? 'Restart' : 'Start Session';

  // SVG dial constants
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const innerRadius = 62;
  const tickRadius = 82;
  const tickOuter = tickRadius + 10;
  const tickInnerMajor = tickRadius - 5;
  const tickInnerMinor = tickRadius;
  const needleLength = innerRadius + 14;

  const accentDark = '#D46A6A';
  const accentLight = '#F2B8B8';

  // Generate tick marks (60 ticks, major every 5)
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 5 === 0;
    const inner = isMajor ? tickInnerMajor : tickInnerMinor;
    ticks.push(
      <line
        key={i}
        x1={cx + inner * Math.cos(rad)}
        y1={cy + inner * Math.sin(rad)}
        x2={cx + tickOuter * Math.cos(rad)}
        y2={cy + tickOuter * Math.sin(rad)}
        stroke="var(--color-text-muted)"
        strokeWidth={isMajor ? 2 : 1}
        opacity={isMajor ? 0.5 : 0.25}
      />
    );
  }

  // Hand angle: remaining minutes mapped on 60-min dial, counterclockwise from start
  // remainingSeconds/60 gives minutes remaining, each minute = 6 degrees clockwise from 12
  const remainingMinutes = remainingSeconds / 60;
  const handAngleDeg = -90 + remainingMinutes * 6;
  const handRad = (handAngleDeg * Math.PI) / 180;

  // Total minutes angle (where the hand starts)
  const totalMinutes = totalSeconds / 60;
  const totalAngleDeg = -90 + totalMinutes * 6;

  // Pie wedge helper: filled arc from 12 o'clock (top) clockwise to a given angle
  const pieWedge = (endAngleDeg: number, r: number) => {
    if (endAngleDeg <= -90) return '';
    const sweepDeg = endAngleDeg - (-90);
    if (sweepDeg <= 0) return '';
    const largeArc = sweepDeg > 180 ? 1 : 0;
    const endR = (endAngleDeg * Math.PI) / 180;
    return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${cx + r * Math.cos(endR)} ${cy + r * Math.sin(endR)} Z`;
  };

  // Light red: from 12 o'clock to the total duration mark (full session area)
  const lightPiePath = pieWedge(totalAngleDeg, innerRadius);
  // Dark red: from 12 o'clock to where the hand currently is (elapsed portion)
  const darkPiePath = pieWedge(handAngleDeg, innerRadius);

  return (
    <div className="flex flex-col items-center py-4 gap-4">
      {/* SVG Dial */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Light red pie: full session area */}
        {lightPiePath && (
          <path d={lightPiePath} fill={accentLight} opacity={0.5} />
        )}

        {/* Dark red pie: from 12 o'clock to hand (remaining portion) */}
        {darkPiePath && (
          <path d={darkPiePath} fill={accentDark} opacity={0.55} />
        )}

        {/* Tick marks */}
        {ticks}

        {/* Needle — red, thicker */}
        <line
          x1={cx}
          y1={cy}
          x2={cx + needleLength * Math.cos(handRad)}
          y2={cy + needleLength * Math.sin(handRad)}
          stroke={accentDark}
          strokeWidth={3.5}
          strokeLinecap="round"
        />

        {/* Center dot — white with subtle shadow */}
        <circle cx={cx} cy={cy} r={8} fill="white" stroke={accentLight} strokeWidth={1} />
      </svg>

      {/* Countdown / edit — smaller, lighter */}
      {editingTime ? (
        <div className="flex items-center gap-1">
          <input
            ref={editInputRef}
            type="number"
            min={1}
            max={120}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') setEditingTime(false);
            }}
            className="w-14 text-center text-lg font-mono bg-transparent border-b-2 border-[var(--color-border)] text-[var(--color-text-muted)] outline-none"
          />
          <span className="text-xs text-[var(--color-text-muted)]">min</span>
        </div>
      ) : (
        <button
          onClick={() => {
            if (status === 'idle') {
              setEditValue(String(Math.floor(totalSeconds / 60)));
              setEditingTime(true);
            }
          }}
          className={`text-xl font-light tracking-widest text-[var(--color-text-muted)] ${
            status === 'idle' ? 'cursor-pointer hover:opacity-70' : 'cursor-default'
          }`}
          title={status === 'idle' ? 'Click to edit duration' : undefined}
        >
          {formatTime(remainingSeconds)}
        </button>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={handleStartPauseResume}
          className="px-8 py-2.5 rounded-full text-sm font-semibold uppercase tracking-wider text-white transition-colors"
          style={{ backgroundColor: accentDark }}
        >
          {buttonLabel}
        </button>
        {(status === 'paused' || status === 'done') && (
          <button
            onClick={handleReset}
            className="px-5 py-2.5 rounded-full text-sm font-medium text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
