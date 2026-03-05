import { usePlannerStore } from '../../store/usePlannerStore';

export function WeeklyPlanningPrompt() {
  const setShowWeeklyPlanningPrompt = usePlannerStore((s) => s.setShowWeeklyPlanningPrompt);
  const snoozeWeeklyPlanning = usePlannerStore((s) => s.snoozeWeeklyPlanning);
  const setView = usePlannerStore((s) => s.setView);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl shadow-2xl px-8 py-10 max-w-sm w-full mx-4 text-center">
        <h2 className="text-xl font-bold mb-2 text-[var(--color-text-primary)]">
          Happy Monday!
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-8">
          Ready to plan your week?
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setShowWeeklyPlanningPrompt(false);
              setView('weeklyPlanning');
            }}
            className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            Let's go
          </button>
          <button
            onClick={snoozeWeeklyPlanning}
            className="px-5 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
          >
            Snooze 1hr
          </button>
          <button
            onClick={() => setShowWeeklyPlanningPrompt(false)}
            className="px-5 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
