import { useEffect, useState, useRef } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;       // start x (vw)
  delay: number;    // animation-delay (s)
  duration: number; // fall duration (s)
  size: number;
  color: string;
  drift: number;    // horizontal drift (px)
  rotation: number; // spin amount (deg)
}

const COLORS = ['#f43f5e', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ec4899', '#14b8a6'];

function generatePieces(count: number): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < count; i++) {
    pieces.push({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 2 + Math.random() * 2,
      size: 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      drift: (Math.random() - 0.5) * 120,
      rotation: Math.random() * 720 - 360,
    });
  }
  return pieces;
}

export function FullScreenConfetti({ onDone }: { onDone: () => void }) {
  const [pieces] = useState(() => generatePieces(80));
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(onDone, 4000);
    return () => clearTimeout(timerRef.current);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}vw`,
            top: -20,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: p.size > 9 ? 2 : '50%',
            animation: `confetti-rain ${p.duration}s ${p.delay}s ease-in forwards`,
            '--confetti-drift': `${p.drift}px`,
            '--confetti-rot': `${p.rotation}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
