import { useState } from 'react';
import { usePlannerStore } from '../../store/usePlannerStore';

const TOTAL_STEPS = 5;

export function OnboardingView() {
  const [step, setStep] = useState(1);
  const setView = usePlannerStore((s) => s.setView);

  const finish = () => {
    usePlannerStore.setState({ hasCompletedOnboarding: true });
    setView('today');
  };

  const skip = finish;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-lg mx-auto">
        <div className="relative mt-16 mb-8">
          <button
            onClick={skip}
            className="absolute -left-40 top-2 w-8 h-8 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
            title="Skip intro"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-5xl font-bold dark:font-extrabold text-[var(--color-text-primary)]">
            Welcome to Zenmode
          </h1>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                s === step
                  ? 'bg-blue-500'
                  : s < step
                    ? 'bg-blue-300'
                    : 'bg-[var(--color-border)]'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-center mb-2 text-[var(--color-text-primary)]">
              Your Timeline
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6 leading-relaxed">
              The Timeline is your bird's-eye view of the week ahead. It shows tasks organized by day, so you can see what's coming and plan accordingly.
            </p>

            <div className="rounded-xl border border-[var(--color-border)] p-5 space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-sm font-bold">H</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Press H for Timeline</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Jump to the Timeline view anytime</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-sm font-bold">M</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Press M to move tasks</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Select a task and press M to move it to another day</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-sm">↕</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Drag to reorder</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Drag tasks to rearrange them within a day, or to a different day</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-center mb-2 text-[var(--color-text-primary)]">
              Today is Your Focus
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6 leading-relaxed">
              The Today view is where you spend most of your day. It shows only what matters right now — today's tasks, nothing else.
            </p>

            <div className="rounded-xl border border-[var(--color-border)] p-5 space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-sm font-bold">T</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Press T for Today</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Jump to the Today view from anywhere</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-sm">★</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Star your priorities</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Click the star to mark your top 3 priorities for the day</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-sm">✓</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Check off as you go</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Press X to complete a task, or click its checkbox</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-center mb-2 text-[var(--color-text-primary)]">
              Quick Add & Command Palette
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6 leading-relaxed">
              Adding tasks is fast and flexible. Type naturally and let Zenmode organize things for you.
            </p>

            <div className="rounded-xl border border-[var(--color-border)] p-5 space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-sm font-bold">N</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Press N to add a task</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Opens the quick-add bar — type and hit Enter</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <kbd className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] font-bold">⌘K</kbd>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Command palette</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Search tasks, jump to views, and take actions — all from one place</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-sm">#</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Use #hashtags to organize</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Add #tags to tasks and they'll appear in the sidebar as filterable labels</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-xl font-bold text-center mb-2 text-[var(--color-text-primary)]">
              Keyboard-First Design
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6 leading-relaxed">
              Zenmode is built for speed. Nearly everything can be done from the keyboard — no reaching for the mouse.
            </p>

            <div className="rounded-xl border border-[var(--color-border)] p-5 mb-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  ['T', 'Today view'],
                  ['H', 'Timeline view'],
                  ['I', 'Inbox'],
                  ['L', 'Later'],
                  ['N', 'New task'],
                  ['X', 'Complete task'],
                  ['M', 'Move task'],
                  ['E', 'Edit task'],
                  ['⌘K', 'Command palette'],
                  ['S', 'Toggle sidebar'],
                  ['↑↓', 'Navigate tasks'],
                  ['?', 'All shortcuts'],
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <kbd className="min-w-[28px] text-center px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-secondary)]">
                      {key}
                    </kbd>
                    <span className="text-sm text-[var(--color-text-primary)]">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] text-center mb-6">
              Press <kbd className="px-1 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-mono">?</kbd> anytime to see all keyboard shortcuts.
            </p>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(5)}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-xl font-bold text-center mb-2 text-[var(--color-text-primary)]">
              Daily Rituals
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] text-center mb-6 leading-relaxed">
              Zenmode includes gentle daily rituals to help you start and end each day with intention.
            </p>

            <div className="rounded-xl border border-[var(--color-border)] p-5 space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-lg">☀</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Morning planning ritual</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Start your day by choosing priorities, organizing tasks, and setting an intention</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-lg">🌙</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Evening review ritual</p>
                  <p className="text-xs text-[var(--color-text-muted)]">End your day by reflecting on what you accomplished and noting what to carry forward</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-lg">📋</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Weekly planning & review</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Optional weekly rituals to zoom out and plan at a higher level</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] text-center mb-6">
              Rituals are enabled by default. You can customize or disable them in Settings.
            </p>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(4)}
                className="px-4 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={finish}
                className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Get started
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
