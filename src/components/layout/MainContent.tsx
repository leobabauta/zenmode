import { Timeline } from '../timeline/Timeline';
import { QuickCaptureBar } from '../forms/QuickCaptureBar';

export function MainContent() {
  return (
    <main className="flex-1 flex flex-col overflow-hidden relative">
      <Timeline />
      <QuickCaptureBar />
    </main>
  );
}
