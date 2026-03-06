interface MobileAddButtonProps {
  onClick: () => void;
}

export function MobileAddButton({ onClick }: MobileAddButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed right-5 z-20 w-14 h-14 rounded-full bg-[var(--color-accent)] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      style={{ bottom: `calc(56px + env(safe-area-inset-bottom) + 16px)` }}
    >
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>
  );
}
