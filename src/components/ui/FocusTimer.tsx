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

  const elapsed = totalSeconds - remainingSeconds;
  const progress = totalSeconds > 0 ? elapsed / totalSeconds : 0;

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
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 72;
  const tickOuter = radius + 8;
  const tickInnerMajor = radius - 4;
  const tickInnerMinor = radius;
  const needleLength = radius - 10;

  // Generate tick marks (60 ticks, major every 5)
  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * 360 - 90; // start at top
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
        opacity={isMajor ? 0.6 : 0.3}
      />
    );
  }

  // Arc sweep for elapsed time
  const sweepAngle = progress * 360;
  const startAngle = -90;
  const endAngle = startAngle + sweepAngle;
  const endRad = (endAngle * Math.PI) / 180;
  const largeArc = sweepAngle > 180 ? 1 : 0;
  const arcPath = sweepAngle > 0
    ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 ${largeArc} 1 ${cx + radius * Math.cos(endRad)} ${cy + radius * Math.sin(endRad)}`
    : '';

  // Needle angle
  const needleAngle = startAngle + sweepAngle;
  const needleRad = (needleAngle * Math.PI) / 180;

  const accentColor = '#D46A6A';

  return (
    <div className="flex flex-col items-center py-4 gap-3">
      {/* SVG Dial */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer circle */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={2}
        />

        {/* Tick marks */}
        {ticks}

        {/* Elapsed arc */}
        {arcPath && (
          <path
            d={arcPath}
            fill="none"
            stroke={accentColor}
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.8}
          />
        )}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={cx + needleLength * Math.cos(needleRad)}
          y2={cy + needleLength * Math.sin(needleRad)}
          stroke={status === 'done' ? accentColor : 'var(--color-text-primary)'}
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={4} fill={accentColor} />
      </svg>

      {/* Countdown / edit */}
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
            className="w-16 text-center text-2xl font-mono bg-transparent border-b-2 border-[var(--color-border)] text-[var(--color-text-primary)] outline-none"
          />
          <span className="text-sm text-[var(--color-text-muted)]">min</span>
        </div>
      ) : (
        <button
          onClick={() => {
            if (status === 'idle') {
              setEditValue(String(Math.floor(totalSeconds / 60)));
              setEditingTime(true);
            }
          }}
          className={`text-2xl font-mono tracking-wider ${
            status === 'done'
              ? 'text-[#D46A6A]'
              : 'text-[var(--color-text-primary)]'
          } ${status === 'idle' ? 'cursor-pointer hover:opacity-70' : 'cursor-default'}`}
          title={status === 'idle' ? 'Click to edit duration' : undefined}
        >
          {formatTime(remainingSeconds)}
        </button>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleStartPauseResume}
          className="px-5 py-1.5 rounded-full text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: accentColor }}
        >
          {buttonLabel}
        </button>
        {(status === 'paused' || status === 'done') && (
          <button
            onClick={handleReset}
            className="px-4 py-1.5 rounded-full text-sm font-medium text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
