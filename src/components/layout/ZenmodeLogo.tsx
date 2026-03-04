import { useEffect, useRef, useState } from 'react';

const WORD = 'zenmode';
const DELAY_MS = 30000;
const LETTER_DURATION_MS = 330;

export function ZenmodeLogo({ onClick }: { onClick: () => void }) {
  const [visibleCount, setVisibleCount] = useState(WORD.length);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const widths = useRef<number[]>([]);

  useEffect(() => {
    // Measure natural widths on mount
    widths.current = letterRefs.current.map(el => el?.offsetWidth ?? 0);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let count = WORD.length;
      const interval = setInterval(() => {
        count--;
        setVisibleCount(count);
        if (count <= 0) clearInterval(interval);
      }, LETTER_DURATION_MS);
      return () => clearInterval(interval);
    }, DELAY_MS);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-2xl font-semibold tracking-[0.2em] text-blue-700 dark:text-blue-400 hover:opacity-80 transition-opacity"
    >
      <img
        src={import.meta.env.BASE_URL + 'zenmode-logo.svg'}
        alt=""
        className="w-14 h-14"
      />
      <span className="flex">
        {WORD.split('').map((letter, i) => (
          <span
            key={i}
            ref={el => { letterRefs.current[i] = el; }}
            className="inline-block overflow-hidden"
            style={{
              width: i < visibleCount ? widths.current[i] || undefined : 0,
              opacity: i < visibleCount ? 1 : 0,
              transition: `width ${LETTER_DURATION_MS}ms ease-in-out, opacity ${LETTER_DURATION_MS}ms ease-in-out`,
            }}
          >
            {letter}
          </span>
        ))}
      </span>
    </button>
  );
}
