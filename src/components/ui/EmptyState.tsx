/**
 * Peaceful empty-state illustrations and messages for Inbox and Today views.
 */
import { useState } from 'react';

// Calm images for empty inbox
const inboxImages = ['/celebrate2.png', '/celebrate3.png'];

// Celebration images for all tasks done
const celebrationImages = ['/celebrate1.png', '/celebrate4.png', '/celebrate5.png'];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface EmptyInboxProps {
  className?: string;
}

export function EmptyInbox({ className }: EmptyInboxProps) {
  const [img] = useState(() => pickRandom(inboxImages));

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className ?? ''}`}>
      <img
        src={img}
        alt="Peaceful scene"
        className="w-52 h-auto mb-6 rounded-2xl"
      />
      <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
        Hooray, your Inbox is empty!
      </h2>
      <p className="text-sm text-[var(--color-text-muted)] text-center max-w-xs leading-relaxed">
        Nothing waiting for your attention. Enjoy the calm.
      </p>
    </div>
  );
}

interface AllDoneProps {
  className?: string;
  onShowCompleted: () => void;
}

export function AllDoneToday({ className, onShowCompleted }: AllDoneProps) {
  const [img] = useState(() => pickRandom(celebrationImages));

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className ?? ''}`}>
      <img
        src={img}
        alt="Celebration"
        className="w-52 h-auto mb-6 rounded-2xl"
      />
      <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
        You did it! Everything's done.
      </h2>
      <p className="text-sm text-[var(--color-text-muted)] text-center max-w-xs leading-relaxed mb-4">
        Take a moment to feel satisfied with a good day's work. You showed up and followed through — that's what matters.
      </p>
      <button
        onClick={onShowCompleted}
        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors underline underline-offset-2"
      >
        Show completed tasks
      </button>
    </div>
  );
}
