import { useRef, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Provider } from '@supabase/supabase-js';

type AuthView = 'landing' | 'signin' | 'signup' | 'forgot';

export function LoginPage() {
  const [view, setView] = useState<AuthView>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollCards = useCallback((direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const cardWidth = 420 + 24;
    el.scrollBy({ left: direction === 'right' ? cardWidth : -cardWidth, behavior: 'smooth' });
  }, []);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    if (authError) setError(authError.message);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !email.trim() || !password) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    }
    // If email confirmation is required, Supabase will handle it.
    // If auto-confirm is on, the user will be logged in automatically.
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !email.trim() || !password) return;
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !email.trim()) return;
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: window.location.origin + window.location.pathname }
    );

    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setResetSent(true);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError('');
    setResetSent(false);
    setShowPassword(false);
  };

  const goTo = (v: AuthView) => {
    resetForm();
    setView(v);
  };

  // --- Auth form pages (sign in, sign up, forgot password) ---
  if (view === 'signin' || view === 'signup' || view === 'forgot') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        {/* Back to home */}
        <div className="px-6 py-4">
          <button
            onClick={() => goTo('landing')}
            className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </button>
        </div>

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center px-4 pb-20">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                <img
                  src={import.meta.env.BASE_URL + 'zenmode-logo.svg'}
                  alt=""
                  className="w-8 h-8"
                />
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white">
                {view === 'signup' && 'Create a zenmode account'}
                {view === 'signin' && 'Sign in to zenmode'}
                {view === 'forgot' && 'Reset your password'}
              </h1>
              <p className="mt-2 text-sm text-neutral-400">
                {view === 'signup' && (
                  <>Already have an account? <button onClick={() => goTo('signin')} className="text-white font-medium hover:underline">Sign in</button>.</>
                )}
                {view === 'signin' && (
                  <>Don't have an account? <button onClick={() => goTo('signup')} className="text-white font-medium hover:underline">Sign up</button>.</>
                )}
                {view === 'forgot' && (
                  <>Remember your password? <button onClick={() => goTo('signin')} className="text-white font-medium hover:underline">Sign in</button>.</>
                )}
              </p>
            </div>

            {view !== 'forgot' && (
              <>
                {/* Google OAuth */}
                <button
                  onClick={() => handleOAuth('google')}
                  className="w-full flex items-center justify-center gap-3 rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                  <div className="h-px flex-1 bg-neutral-800" />
                  <span className="text-xs text-neutral-500">or</span>
                  <div className="h-px flex-1 bg-neutral-800" />
                </div>
              </>
            )}

            {/* Email/Password form */}
            {view === 'forgot' && resetSent ? (
              <div className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-6 text-center">
                <p className="text-sm text-neutral-300">
                  Check your email for a password reset link.
                </p>
                <button
                  onClick={() => { setResetSent(false); setEmail(''); }}
                  className="mt-4 text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  Try a different email
                </button>
              </div>
            ) : (
              <form onSubmit={view === 'signup' ? handleSignUp : view === 'signin' ? handleSignIn : handleForgotPassword}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-neutral-300 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoFocus
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                    />
                  </div>

                  {view !== 'forgot' && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm text-neutral-300">Password</label>
                        {view === 'signin' && (
                          <button
                            type="button"
                            onClick={() => goTo('forgot')}
                            className="text-sm text-white font-medium hover:underline"
                          >
                            Forgot your password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={8}
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-3 pr-10 text-sm text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                        >
                          {showPassword ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <p className="mt-3 text-sm text-red-400">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 w-full rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white disabled:opacity-50 transition-colors"
                >
                  {loading
                    ? (view === 'signup' ? 'Creating account...' : view === 'forgot' ? 'Sending...' : 'Signing in...')
                    : (view === 'signup' ? 'Create account' : view === 'forgot' ? 'Send reset link' : 'Sign in')
                  }
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Landing page ---
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <img
            src={import.meta.env.BASE_URL + 'zenmode-logo.svg'}
            alt=""
            className="w-10 h-10"
          />
          <span className="text-xl font-bold text-stone-900 tracking-tight">zenmode</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="/manifesto" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">Manifesto</a>
          <a href="/downloads" className="text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors">Downloads</a>
          <button
            onClick={() => goTo('signin')}
            className="text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors"
          >
            Sign in
          </button>
          <button
            onClick={() => goTo('signup')}
            className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            Get Started
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
            onClick={() => goTo('signup')}
            className="rounded-full bg-stone-900 px-7 py-3 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            Get started
          </button>
          <button
            onClick={scrollToFeatures}
            className="rounded-full border border-stone-300 px-7 py-3 text-sm font-medium text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Learn more
          </button>
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
      <section ref={featuresRef} className="mx-auto max-w-4xl px-4 py-20">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <img src={import.meta.env.BASE_URL + 'feature-ritual.png'} alt="Daily Planning Ritual" className="w-full rounded-xl mb-3" />
            <div className="rounded-2xl bg-white border border-stone-200 p-6">
              <h3 className="text-base font-bold text-stone-900">Daily Ritual</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">Start each morning with intention — organize your tasks and set your priorities for the day.</p>
            </div>
          </div>
          <div>
            <img src={import.meta.env.BASE_URL + 'feature-capture.png'} alt="Timeline view" className="w-full rounded-xl mb-3" />
            <div className="rounded-2xl bg-white border border-stone-200 p-6">
              <h3 className="text-base font-bold text-stone-900">Timeline View</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">See your week at a glance. Drag tasks between days to plan ahead effortlessly.</p>
            </div>
          </div>
          <div>
            <img src={import.meta.env.BASE_URL + 'feature-timeline.png'} alt="Quick capture" className="w-full rounded-xl mb-3" />
            <div className="rounded-2xl bg-white border border-stone-200 p-6">
              <h3 className="text-base font-bold text-stone-900">Capture Quickly</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">Jot down ideas and tasks in seconds. Your inbox catches everything so nothing slips through the cracks.</p>
            </div>
          </div>
          <div>
            <div className="rounded-xl overflow-hidden mb-3">
              <img src={import.meta.env.BASE_URL + 'feature-timer.png'} alt="Focus timer" className="w-full" style={{ marginBottom: '-12%' }} />
            </div>
            <div className="rounded-2xl bg-white border border-stone-200 p-6">
              <h3 className="text-base font-bold text-stone-900">Focus Timer</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">Built-in Pomodoro timer to help you stay in flow and work with calm focus.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="py-20 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">zenmode philosophy</p>
          <div className="flex items-end justify-between gap-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight leading-tight max-w-lg">
              5 Essential Principles
            </h2>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => scrollCards('left')}
                className="w-10 h-10 rounded-full border border-stone-300 flex items-center justify-center text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors"
                aria-label="Scroll left"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => scrollCards('right')}
                className="w-10 h-10 rounded-full bg-stone-900 flex items-center justify-center text-white hover:bg-stone-800 transition-colors"
                aria-label="Scroll right"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto px-4 pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', paddingLeft: 'max(1rem, calc((100vw - 56rem) / 2 + 1rem))' }}
        >
          {[
            { title: 'Get clear each morning', description: 'Start your day with a Daily Planning Ritual — set priorities, review your inbox, and choose what matters most.', feature: 'Daily Planning Ritual' },
            { title: 'Focus on today', description: "Don't drown in everything that needs to be done. See only what's on your plate right now and give it your full attention.", feature: 'Today view' },
            { title: 'One task at a time', description: 'Expand any task into a distraction-free focus view with a built-in timer. Everything else fades away.', feature: 'Task Focus view' },
            { title: 'Frictionless capture', description: 'Jot down tasks and ideas in seconds with keyboard shortcuts and Quick Capture. Nothing slips through the cracks.', feature: 'Keyboard shortcuts & Quick Capture' },
            { title: 'Organize on a timeline', description: 'Life unfolds day by day — so your tasks should too. See your week at a glance and drag tasks between days.', feature: 'Timeline view' },
          ].map((principle, i) => (
            <div key={principle.title} className="flex-shrink-0 w-[420px] snap-start rounded-2xl bg-white border border-stone-200 p-8 flex flex-col">
              <span className="w-8 h-8 rounded-full bg-stone-900 text-white text-sm font-semibold flex items-center justify-center mb-4">{i + 1}</span>
              <h3 className="text-xl font-bold text-stone-900 mb-3">{principle.title}</h3>
              <p className="text-sm leading-relaxed text-stone-500 flex-1">{principle.description}</p>
              <p className="mt-5 text-xs font-medium text-stone-400 uppercase tracking-wide">{principle.feature}</p>
            </div>
          ))}
          <div className="flex-shrink-0 w-4" />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-sm px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-stone-900">Ready to focus?</h2>
        <p className="mt-2 text-sm text-stone-500">Create a free account to get started.</p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => goTo('signup')}
            className="rounded-full bg-stone-900 px-7 py-3 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            Get started
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-8 text-center flex items-center justify-center gap-6">
        <a href="/about" className="text-base text-stone-500 hover:text-stone-700 transition-colors">About</a>
        <a href="/manifesto" className="text-base text-stone-500 hover:text-stone-700 transition-colors">Manifesto</a>
        <a href="/downloads" className="text-base text-stone-500 hover:text-stone-700 transition-colors">Downloads</a>
        <a href="/privacy" className="text-base text-stone-500 hover:text-stone-700 transition-colors">Privacy Policy</a>
        <a href="/changelog" className="text-base text-stone-500 hover:text-stone-700 transition-colors">Changelog</a>
      </footer>
    </div>
  );
}
