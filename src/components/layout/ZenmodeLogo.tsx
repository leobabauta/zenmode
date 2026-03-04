import { useEffect, useRef, useState } from 'react';

const WORD = 'zenmode';
const DELAY_MS = 30000;
const LETTER_DURATION_MS = 330;

export function ZenmodeLogo({ onClick }: { onClick: () => void }) {
  const [removedCount, setRemovedCount] = useState(0);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const widths = useRef<number[]>([]);

  useEffect(() => {
    widths.current = letterRefs.current.map(el => el?.offsetWidth ?? 0);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let removed = 0;
      const interval = setInterval(() => {
        removed++;
        setRemovedCount(removed);
        if (removed >= WORD.length) clearInterval(interval);
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
        className="w-10 h-10"
      />
      <span className="flex">
        {WORD.split('').map((letter, i) => (
          <span
            key={i}
            ref={el => { letterRefs.current[i] = el; }}
            className="inline-block overflow-hidden"
            style={{
              width: i < removedCount ? 0 : widths.current[i] || undefined,
              opacity: i < removedCount ? 0 : 1,
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
