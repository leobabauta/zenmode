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

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <img
            src={import.meta.env.BASE_URL + 'zenmode-logo.svg'}
            alt=""
            className="w-9 h-9"
          />
          <span className="text-lg font-bold text-stone-900 tracking-tight">zenmode</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="/manifesto.html" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">Manifesto</a>
          <button
            onClick={scrollToSignIn}
            className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            Sign in
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-24 pb-32 text-center">
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight text-stone-900 leading-[1.05] max-w-4xl">
          Focus is everything.
        </h1>
        <p className="mt-8 max-w-xl text-lg sm:text-xl text-stone-500 leading-relaxed">
          Work can be chaotic, and your task list can be overwhelming &mdash; so reclaim your attention and create pristine focus.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <button
            onClick={scrollToSignIn}
            className="rounded-full bg-stone-900 px-7 py-3 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            Get started
          </button>
          <a
            href="/changelog.html"
            className="rounded-full border border-stone-300 px-7 py-3 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Learn more
          </a>
        </div>
      </section>

      {/* Screenshot */}
      <section className="mx-auto max-w-4xl px-4 pb-16">
        <img
          src={import.meta.env.BASE_URL + 'screenshot-hero.png'}
          alt="zenmode app screenshot"
          className="w-full rounded-xl shadow-2xl border border-stone-200"
        />
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-4 py-20">
        <div className="grid gap-8 sm:grid-cols-2">
          {[
            {
              title: 'Daily Ritual',
              desc: 'Start each morning with intention — set your priorities and choose a practice for the day.',
            },
            {
              title: 'Timeline View',
              desc: 'See your week at a glance. Drag tasks between days to plan ahead effortlessly.',
            },
            {
              title: 'Focus Timer',
              desc: 'Built-in Pomodoro timer to help you stay in flow and work with calm focus.',
            },
            {
              title: 'Inbox & Later',
              desc: 'Capture ideas quickly without breaking focus. Park tasks for the future when the time is right.',
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-white border border-stone-200 p-6">
              <h3 className="text-base font-bold text-stone-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sign in */}
      <section ref={signInRef} className="mx-auto max-w-sm px-4 py-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-stone-900">
            Get started
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            Sign in to sync your tasks across devices
          </p>
        </div>

        <div className="mt-8">
          {sent ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
              <p className="text-stone-700">
                Check your email for a magic link to sign in.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-4 text-sm text-stone-500 hover:text-stone-700"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleOAuth('google')}
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-900 hover:bg-stone-50 transition-colors"
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
                <div className="h-px flex-1 bg-stone-200" />
                <span className="text-xs text-stone-400">or</span>
                <div className="h-px flex-1 bg-stone-200" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-full border border-stone-300 bg-white px-5 py-2.5 text-stone-900 placeholder-stone-400 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                />
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Sending...' : 'Send magic link'}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-6 text-center flex items-center justify-center gap-4">
        <a
          href="/privacy.html"
          className="text-xs text-stone-400 hover:text-stone-600"
        >
          Privacy Policy
        </a>
        <a
          href="/changelog.html"
          className="text-xs text-stone-400 hover:text-stone-600"
        >
          Changelog & Roadmap
        </a>
      </footer>
    </div>
  );
}
