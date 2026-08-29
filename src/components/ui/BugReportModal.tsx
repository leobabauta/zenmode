import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/useAuthStore';

interface BugReportModalProps {
  onClose: () => void;
}

export function BugReportModal({ onClose }: BugReportModalProps) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-bug-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${(await supabase?.auth.getSession())?.data?.session?.access_token ?? ''}`,
          },
          body: JSON.stringify({
            message: description.trim(),
            user_email: user?.email ?? 'unknown',
            url: window.location.href,
            userAgent: navigator.userAgent,
          }),
        },
      );
      if (!res.ok) throw new Error('Failed to submit');
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Thanks for reporting!</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Your bug report has been filed and sent to Leo. Thanks for taking the time.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">Report a bug</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Describe what went wrong. Your report goes straight to Leo.
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? What did you expect to happen?"
              className="w-full h-32 px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              autoFocus
            />
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !description.trim()}
                className="px-4 py-1.5 text-sm rounded-lg bg-[var(--color-accent)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
