import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

interface Particle {
  id: number;
  color: string;
  angle: number;
  speed: number;
  size: number;
}

const CONFETTI_COLORS = ['#f43f5e', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#f97316'];

export function Checkbox({ checked, onChange, className }: CheckboxProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const nextId = useRef(0);
  const btnRef = useRef<HTMLButtonElement>(null);

  const spawnConfetti = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }
    const newParticles: Particle[] = [];
    const count = 10 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: nextId.current++,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5,
        speed: 28 + Math.random() * 18,
        size: 4 + Math.random() * 3,
      });
    }
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1200);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const willCheck = !checked;
    onChange(willCheck);
    if (willCheck) {
      // Tiny delay before confetti pops
      setTimeout(spawnConfetti, 80);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        role="checkbox"
        aria-checked={checked}
        onClick={handleClick}
        className={cn(
          'relative flex-shrink-0 w-5 h-5 transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
          !checked && 'text-[var(--color-text-muted)] hover:text-accent',
          className
        )}
      >
        <svg viewBox="0 0 16 16" className="w-full h-full" fill="none">
          {checked ? (
            <>
              <circle cx="8" cy="8" r="8" fill="#22c55e" />
              <path
                d="M4.5 8.5L6.5 10.5L11.5 5.5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            <circle
              cx="8" cy="8" r="6.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="2.5 2"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>

      {/* Confetti particles — portalled to body so nothing clips them */}
      {particles.length > 0 && createPortal(
        <div className="fixed inset-0 pointer-events-none z-[200]" aria-hidden>
          {particles.map((p) => {
            const burstX = Math.cos(p.angle) * p.speed;
            const burstY = Math.sin(p.angle) * p.speed;
            return (
              <span
                key={p.id}
                className="absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  left: origin.x,
                  top: origin.y,
                  animation: 'confetti-burst 1.1s ease-out forwards',
                  '--burst-x': `${burstX}px`,
                  '--burst-y': `${burstY}px`,
                  '--fall-y': `${burstY + 120 + Math.random() * 60}px`,
                } as React.CSSProperties}
              />
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
