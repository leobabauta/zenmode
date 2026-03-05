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

// Inline confetti colors
const confettiColors = [
  '#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE',
];

interface ConfettiParticle {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  shape: 'square' | 'circle';
}

function generateConfetti(count: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    size: 4 + Math.random() * 6,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2,
    shape: Math.random() > 0.5 ? 'square' : 'circle',
  }));
}

interface FocusTimerProps {
  onSessionComplete?: (duration: number) => void;
}

export function FocusTimer({ onSessionComplete }: FocusTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(1500);
  const [remainingSeconds, setRemainingSeconds] = useState(1500);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [editingTime, setEditingTime] = useState(false);
  const [editValue, setEditValue] = useState('25');
  const [showCelebration, setShowCelebration] = useState(false);
  const [confettiParticles] = useState(() => generateConfetti(40));
  const editInputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);

  const triggerCelebration = useCallback((elapsed: number) => {
    playBeep();
    onSessionComplete?.(elapsed);
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
      setRemainingSeconds(totalSeconds);
      setStatus('idle');
    }, 4000);
  }, [onSessionComplete, totalSeconds]);

  // Timer interval
  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setStatus('done');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  // When timer naturally reaches 0
  useEffect(() => {
    if (status === 'done' && !showCelebration) {
      triggerCelebration(totalSeconds);
    }
  }, [status, showCelebration, triggerCelebration, totalSeconds]);

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

  const handleComplete = () => {
    const elapsed = totalSeconds - remainingSeconds;
    setStatus('done');
    triggerCelebration(elapsed);
  };

  const handleReset = () => {
    setRemainingSeconds(totalSeconds);
    setStatus('idle');
  };

  // Draggable clock hand logic
  const angleToMinutes = (angle: number): number => {
    // angle is in degrees where 0 = right, -90 = top (12 o'clock)
    // Convert so that 12 o'clock = 0 minutes, clockwise
    let degrees = angle + 90;
    if (degrees < 0) degrees += 360;
    const mins = Math.round(degrees / 6);
    return Math.max(1, Math.min(60, mins === 0 ? 60 : mins));
  };

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (status !== 'idle') return;
    draggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, [status]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current || status !== 'idle' || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const mins = angleToMinutes(angle);
    const newTotal = mins * 60;
    setTotalSeconds(newTotal);
    setRemainingSeconds(newTotal);
  }, [status]);

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

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
  const remainingMinutes = remainingSeconds / 60;
  const handAngleDeg = -90 + remainingMinutes * 6;
  const handRad = (handAngleDeg * Math.PI) / 180;

  // Pie wedge helper: filled arc from 12 o'clock (top) clockwise to a given angle
  const pieWedge = (endAngleDeg: number, r: number) => {
    if (endAngleDeg <= -90) return '';
    const sweepDeg = endAngleDeg - (-90);
    if (sweepDeg <= 0) return '';
    const largeArc = sweepDeg > 180 ? 1 : 0;
    const endR = (endAngleDeg * Math.PI) / 180;
    return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${cx + r * Math.cos(endR)} ${cy + r * Math.sin(endR)} Z`;
  };

  // Dark red: from 12 o'clock to where the hand currently is (remaining portion)
  const darkPiePath = pieWedge(handAngleDeg, innerRadius);

  const svgCursor = status === 'idle' ? (draggingRef.current ? 'grabbing' : 'grab') : 'default';

  if (showCelebration) {
    return (
      <div className="flex flex-col items-center py-4 gap-4">
        <div
          className="relative overflow-hidden"
          style={{ width: size, height: size }}
        >
          <style>{`
            @keyframes confetti-fall {
              0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(${size + 20}px) rotate(720deg); opacity: 0; }
            }
          `}</style>
          {confettiParticles.map((p) => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                top: 0,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                borderRadius: p.shape === 'circle' ? '50%' : '2px',
                animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-semibold text-[var(--color-text-primary)]">
              Congratulations!
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-4 gap-4">
      {/* SVG Dial */}
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ cursor: svgCursor, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Light red: entire inner circle */}
        <circle cx={cx} cy={cy} r={innerRadius} fill={accentLight} opacity={0.4} />

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
          strokeWidth={7}
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
        {(status === 'running' || status === 'paused') && (
          <button
            onClick={handleComplete}
            className="px-5 py-2.5 rounded-full text-sm font-semibold uppercase tracking-wider text-white transition-colors bg-emerald-600 hover:bg-emerald-700"
          >
            Complete
          </button>
        )}
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
