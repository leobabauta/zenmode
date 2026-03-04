import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';

const WORD = 'zenmode';
const DELAY_MS = 10000;
const LETTER_DURATION_MS = 330;

export function ZenmodeLogo({ onClick }: { onClick: () => void }) {
  const [removedCount, setRemovedCount] = useState(0);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const widths = useRef<number[]>([]);
  const startedRef = useRef(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    widths.current = letterRefs.current.map(el => el?.offsetWidth ?? 0);
  }, []);

  const startHideAnimation = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    hideTimeoutRef.current = setTimeout(() => {
      setRemovedCount(WORD.length);
    }, DELAY_MS);
  }, []);

  useEffect(() => {
    function startAnimation() {
      if (startedRef.current) return;
      startedRef.current = true;
      startHideAnimation();
    }

    if (document.visibilityState === 'visible') {
      startAnimation();
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        startAnimation();
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [startHideAnimation]);

  const handleClick = () => {
    const currentView = usePlannerStore.getState().view;
    if (currentView === 'timeline') {
      // Already in timeline — re-reveal the name
      setRemovedCount(0);
      startHideAnimation();
    }
    onClick();
  };

  return (
    <button
      onClick={handleClick}
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
