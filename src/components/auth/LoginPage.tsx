import { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Provider } from '@supabase/supabase-js';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const signInRef = useRef<HTMLDivElement>(null);

  const scrollToSignIn = () => {
    signInRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !email.trim()) return;

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  };

  const handleOAuth = async (provider: Provider) => {
    if (!supabase) return;
    setError('');

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });

    if (authError) {
      setError(authError.message);
    }
  };

  const features = [
    {
      title: 'Daily Ritual',
      description: 'Start each morning with intention — set your priorities and choose a practice for the day.',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
      ),
    },
    {
      title: 'Timeline View',
      description: 'See your week at a glance. Drag tasks between days to plan ahead effortlessly.',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      ),
    },
    {
      title: 'Focus Timer',
      description: 'Built-in Pomodoro timer to help you stay in flow and work with calm focus.',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      title: 'Inbox & Later',
      description: 'Capture ideas quickly without breaking focus. Park tasks for the future when the time is right.',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-17.5 0V6.75a2.25 2.25 0 0 1 2.25-2.25h13.5a2.25 2.25 0 0 1 2.25 2.25v6.75m-17.5 0v4.5a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25v-4.5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* Hero */}
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-5xl">
          zenmode
        </h1>
        <p className="mt-4 max-w-md text-lg text-stone-500 dark:text-stone-400">
          A calm, intentional space to plan your day, focus on what matters, and let go of the rest.
        </p>
        <button
          onClick={scrollToSignIn}
          className="mt-8 rounded-lg bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
        >
          Get started
        </button>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <div className="grid gap-10 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                {feature.icon}
              </div>
              <div>
                <h3 className="font-medium text-stone-900 dark:text-stone-100">
                  {feature.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sign in */}
      <section ref={signInRef} className="mx-auto max-w-sm px-4 py-16">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            Sign in
          </h2>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            Sync your tasks across devices
          </p>
        </div>

        <div className="mt-6">
          {sent ? (
            <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-6 text-center">
              <p className="text-stone-700 dark:text-stone-300">
                Check your email for a magic link to sign in.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-4 text-sm text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleOAuth('google')}
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-medium text-stone-900 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-700"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
                <span className="text-xs text-stone-400 dark:text-stone-500">or</span>
                <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-4 py-2.5 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                />
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-stone-900 dark:bg-stone-100 px-4 py-2.5 text-sm font-medium text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send magic link'}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 dark:border-stone-800 py-6 text-center">
        <a
          href="/privacy.html"
          className="text-xs text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300"
        >
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}
