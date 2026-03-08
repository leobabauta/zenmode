import { usePlannerStore, selectArchivedItems } from '../../store/usePlannerStore';
import { Checkbox } from '../ui/Checkbox';

export function ArchiveView() {
  const items = usePlannerStore((s) => s.items);
  const unarchiveItem = usePlannerStore((s) => s.unarchiveItem);
  const deleteItem = usePlannerStore((s) => s.deleteItem);
  const archivedItems = selectArchivedItems(items);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 mt-16">
          <h1 className="text-5xl font-bold dark:font-extrabold text-[var(--color-text-primary)]">
            Archive
          </h1>
          <span className="text-xs text-[var(--color-text-muted)]">
            {archivedItems.length} {archivedItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="min-h-[80px]">
          {archivedItems.length === 0 ? (
            <p className="text-center text-sm text-[var(--color-text-muted)] py-8">
              No archived items
            </p>
          ) : (
            <div className="space-y-1">
              {archivedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-surface)] transition-colors group"
                >
                  <div className="opacity-40 pointer-events-none">
                    <Checkbox checked={item.completed} onChange={() => {}} />
                  </div>
                  <span className="flex-1 text-sm text-[var(--color-text-secondary)] line-through">
                    {item.text}
                  </span>
                  <button
                    onClick={() => unarchiveItem(item.id)}
                    title="Move to Inbox"
                    className="text-xs text-[var(--color-text-muted)] hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    Unarchive
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    title="Delete"
                    className="p-0.5 text-[var(--color-text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
