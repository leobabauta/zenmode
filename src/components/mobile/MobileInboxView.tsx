import { usePlannerStore, selectInboxItems } from '../../store/usePlannerStore';
import { MobileTaskRow } from './MobileTaskRow';

export function MobileInboxView() {
  const items = usePlannerStore((s) => s.items);
  const inboxItems = selectInboxItems(items);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Inbox</h1>
      </div>

      <div className="space-y-0.5">
        {inboxItems.map((item) => (
          <MobileTaskRow key={item.id} item={item} />
        ))}
      </div>

      {inboxItems.length === 0 && (
        <p className="px-5 text-sm text-[var(--color-text-muted)]">No items in inbox</p>
      )}

      <div className="h-24" />
    </div>
  );
}
