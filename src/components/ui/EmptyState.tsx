/**
 * Peaceful empty-state illustrations and messages for Inbox and Today views.
 */

// Sunset beach scene — soft pastel SVG illustration
function BeachScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 260" fill="none" className={className}>
      {/* Sky gradient */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#fdba74" />
          <stop offset="100%" stopColor="#f9a8d4" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="400" height="260" fill="url(#sky)" rx="16" />

      {/* Sun */}
      <circle cx="200" cy="100" r="40" fill="#fbbf24" opacity="0.8" />
      <circle cx="200" cy="100" r="55" fill="#fbbf24" opacity="0.15" />

      {/* Clouds */}
      <ellipse cx="80" cy="60" rx="35" ry="12" fill="white" opacity="0.5" />
      <ellipse cx="100" cy="55" rx="25" ry="10" fill="white" opacity="0.4" />
      <ellipse cx="310" cy="45" rx="30" ry="10" fill="white" opacity="0.45" />
      <ellipse cx="330" cy="40" rx="20" ry="8" fill="white" opacity="0.35" />

      {/* Water */}
      <ellipse cx="200" cy="185" rx="220" ry="45" fill="url(#water)" />

      {/* Beach / sand */}
      <ellipse cx="200" cy="230" rx="250" ry="50" fill="url(#sand)" />

      {/* Gentle wave lines */}
      <path d="M30 175 Q100 168 200 175 Q300 182 370 175" stroke="#60a5fa" strokeWidth="1.5" opacity="0.3" fill="none" />
      <path d="M40 185 Q120 178 200 185 Q280 192 360 185" stroke="#60a5fa" strokeWidth="1" opacity="0.2" fill="none" />

      {/* Palm tree */}
      <rect x="310" y="140" width="6" height="80" rx="3" fill="#92400e" opacity="0.6" />
      <path d="M313 140 Q295 120 270 125" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M313 140 Q330 115 355 120" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M313 142 Q300 130 280 140" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M313 142 Q325 128 345 138" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />

      {/* Birds */}
      <path d="M120 35 Q125 30 130 35" stroke="#78716c" strokeWidth="1.5" fill="none" opacity="0.4" />
      <path d="M140 28 Q144 24 148 28" stroke="#78716c" strokeWidth="1.2" fill="none" opacity="0.35" />
      <path d="M250 50 Q254 46 258 50" stroke="#78716c" strokeWidth="1.2" fill="none" opacity="0.35" />
    </svg>
  );
}

// Mountain sunset scene
function MountainScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 260" fill="none" className={className}>
      <defs>
        <linearGradient id="msky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="50%" stopColor="#fda4af" />
          <stop offset="100%" stopColor="#fed7aa" />
        </linearGradient>
        <linearGradient id="mtn1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="mtn2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="meadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="400" height="260" fill="url(#msky)" rx="16" />

      {/* Sun low on horizon */}
      <circle cx="200" cy="150" r="35" fill="#fbbf24" opacity="0.7" />
      <circle cx="200" cy="150" r="50" fill="#fbbf24" opacity="0.12" />

      {/* Far mountains */}
      <path d="M0 180 L80 100 L160 160 L240 80 L320 140 L400 110 L400 260 L0 260Z" fill="url(#mtn2)" />

      {/* Near mountains */}
      <path d="M0 200 L60 140 L130 180 L200 120 L280 170 L350 130 L400 160 L400 260 L0 260Z" fill="url(#mtn1)" />

      {/* Meadow */}
      <ellipse cx="200" cy="240" rx="250" ry="40" fill="url(#meadow)" />

      {/* Birds */}
      <path d="M100 55 Q105 50 110 55" stroke="#78716c" strokeWidth="1.5" fill="none" opacity="0.4" />
      <path d="M130 45 Q134 41 138 45" stroke="#78716c" strokeWidth="1.2" fill="none" opacity="0.35" />
      <path d="M280 60 Q284 56 288 60" stroke="#78716c" strokeWidth="1.2" fill="none" opacity="0.35" />
    </svg>
  );
}

interface EmptyInboxProps {
  className?: string;
}

export function EmptyInbox({ className }: EmptyInboxProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className ?? ''}`}>
      <BeachScene className="w-72 h-auto mb-6 rounded-2xl" />
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
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className ?? ''}`}>
      <MountainScene className="w-72 h-auto mb-6 rounded-2xl" />
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
