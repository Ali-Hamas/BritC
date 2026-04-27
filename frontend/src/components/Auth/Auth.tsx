import React, { useState } from 'react';
import { Shield, Lock, ArrowRight, Mail, Globe, Users, Loader2, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { signIn, signUp, forgetPassword } from '../../lib/auth-client';

interface AuthProps {
  onAuthenticated: (profile: Record<string, any>) => void;
  onStartOnboarding: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthenticated, onStartOnboarding }) => {
  const [activeMode, setActiveMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Forgot-password modal state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const openForgot = () => {
    setForgotEmail(email);
    setForgotError('');
    setForgotSent(false);
    setShowForgot(true);
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: fErr } = await forgetPassword({
        email: forgotEmail,
        redirectTo,
      });
      if (fErr) throw new Error(fErr.message || 'Could not send reset email');
      setForgotSent(true);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error: authError } = await signIn.email({
        email,
        password,
        callbackURL: '/',
      });

      if (authError) throw new Error(authError.message || 'Login failed');
      onAuthenticated({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error: authError } = await signUp.email({
        email,
        password,
        name: name || email.split('@')[0],
        callbackURL: '/',
      });

      if (authError) throw new Error(authError.message || 'Registration failed');
      onStartOnboarding();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setActiveMode(activeMode === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#05060d] text-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Animated gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[45rem] h-[45rem] bg-gradient-to-br from-indigo-600/30 via-violet-500/10 to-transparent rounded-full blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 -right-32 w-[40rem] h-[40rem] bg-gradient-to-tr from-fuchsia-600/20 via-indigo-500/10 to-transparent rounded-full blur-3xl animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-indigo-500/5 rounded-full blur-3xl" />
        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        {/* Left: Brand */}
        <div className="hidden lg:flex flex-col gap-10 pr-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 blur-xl opacity-60" />
              <div className="relative w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shadow-xl">
                <img src="/favicon.png" alt="Britsync AI" className="w-full h-full object-cover" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">
                Britsync <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">AI</span>
              </h1>
              <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 font-semibold mt-0.5">
                AI Workspace for UK Agencies
              </p>
            </div>
          </div>

          <p className="text-slate-400 text-lg leading-relaxed max-w-md">
            Your autonomous team member for lead generation, outreach, research and booking — all in one clean workspace.
          </p>

          <div className="space-y-5">
            {[
              {
                Icon: Globe,
                color: 'from-emerald-400 to-teal-400',
                title: 'Global AI Intelligence',
                desc: 'High-tier models with real-time web browsing and scraping.',
              },
              {
                Icon: Users,
                color: 'from-indigo-400 to-violet-400',
                title: 'Unified Team Workspace',
                desc: 'Share PIN-based team chats. Everyone sees everything in real time.',
              },
              {
                Icon: Shield,
                color: 'from-fuchsia-400 to-pink-400',
                title: 'Secure by Default',
                desc: 'Encrypted auth with session cookies. Your data stays yours.',
              },
            ].map(({ Icon, color, title, desc }) => (
              <div key={title} className="group flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all">
                <div className={`shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                  <Icon className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex -space-x-2.5">
              {['from-indigo-500 to-violet-500', 'from-fuchsia-500 to-pink-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500'].map((g, i) => (
                <div key={i} className={`w-9 h-9 rounded-xl border-2 border-[#05060d] bg-gradient-to-br ${g} shadow-lg`} />
              ))}
            </div>
            <div className="text-xs text-slate-500">
              <span className="text-slate-300 font-semibold">Trusted</span> by UK agencies and solo operators
            </div>
          </div>
        </div>

        {/* Right: Auth card */}
        <div className="w-full max-w-md mx-auto">
          <div className="relative">
            {/* gradient border */}
            <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-br from-indigo-500/40 via-fuchsia-500/20 to-transparent opacity-60" />
            <div className="relative rounded-[2rem] bg-[#0a0b14]/80 backdrop-blur-2xl border border-white/10 shadow-[0_0_60px_-20px_rgba(99,102,241,0.5)] overflow-hidden">
              {/* Mobile brand */}
              <div className="lg:hidden pt-8 pb-2 text-center">
                <div className="inline-flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center">
                    <img src="/favicon.png" alt="Britsync AI" className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight">Britsync AI</h2>
                </div>
              </div>

              {/* Tabs */}
              <div className="relative flex px-6 pt-6">
                <div className="relative flex w-full bg-white/[0.03] rounded-2xl p-1 border border-white/5">
                  <button
                    onClick={() => { setActiveMode('login'); setError(''); }}
                    className={`relative z-10 flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                      activeMode === 'login' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { setActiveMode('register'); setError(''); }}
                    className={`relative z-10 flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                      activeMode === 'register' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Create Account
                  </button>
                  <div
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30 transition-all duration-300 ${
                      activeMode === 'login' ? 'left-1' : 'left-[calc(50%+0px)]'
                    }`}
                  />
                </div>
              </div>

              {/* Form */}
              <form
                key={activeMode}
                onSubmit={activeMode === 'login' ? handleLogin : handleRegister}
                className="p-6 sm:p-8 space-y-4"
              >
                <div className="space-y-1">
                  <h3 className="text-xl font-bold tracking-tight">
                    {activeMode === 'login' ? 'Welcome back' : 'Create your account'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {activeMode === 'login'
                      ? 'Sign in to access your workspace.'
                      : 'Start building with your AI teammate in seconds.'}
                  </p>
                </div>

                {activeMode === 'register' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full name</label>
                    <div className="relative">
                      <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-slate-100 outline-none focus:border-indigo-500/60 focus:bg-white/[0.05] focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-600 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-slate-100 outline-none focus:border-indigo-500/60 focus:bg-white/[0.05] focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-600 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                    {activeMode === 'login' && (
                      <button
                        type="button"
                        onClick={openForgot}
                        className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="password"
                      required
                      minLength={activeMode === 'register' ? 8 : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={activeMode === 'register' ? 'At least 8 characters' : '••••••••'}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-slate-100 outline-none focus:border-indigo-500/60 focus:bg-white/[0.05] focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-600 font-mono text-sm"
                    />
                  </div>
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative group inline-flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-white bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 shadow-lg shadow-indigo-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      {activeMode === 'login' ? 'Sign in' : 'Create account'}
                      <ArrowRight className="group-hover:translate-x-0.5 transition-transform" size={16} />
                    </>
                  )}
                </button>

                <div className="text-center text-xs text-slate-500 pt-1">
                  {activeMode === 'login' ? (
                    <>Don't have an account?{' '}
                      <button type="button" onClick={switchMode} className="text-indigo-400 hover:text-indigo-300 font-semibold">
                        Create one
                      </button>
                    </>
                  ) : (
                    <>Already have an account?{' '}
                      <button type="button" onClick={switchMode} className="text-indigo-400 hover:text-indigo-300 font-semibold">
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              </form>

              <div className="px-6 sm:px-8 py-4 border-t border-white/5 bg-white/[0.01] flex items-center gap-2 text-[10px] text-slate-500 font-semibold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                Secure session · Encrypted in transit
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot-password modal */}
      {showForgot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeForgot}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl bg-[#0a0b14] border border-white/10 shadow-[0_0_60px_-20px_rgba(99,102,241,0.6)] p-7"
          >
            <button
              type="button"
              onClick={closeForgot}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {!forgotSent ? (
              <form onSubmit={handleForgot} className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold tracking-tight">Reset your password</h3>
                  <p className="text-sm text-slate-500">
                    Enter the email on your account and we'll send you a reset link.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="email"
                      required
                      autoFocus
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-slate-100 outline-none focus:border-indigo-500/60 focus:bg-white/[0.05] focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-600 text-sm"
                    />
                  </div>
                </div>

                {forgotError && (
                  <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                    {forgotError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-white bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 shadow-lg shadow-indigo-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {forgotLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center space-y-5 py-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-400" size={28} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-bold tracking-tight">Check your inbox</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    If an account exists for <span className="text-slate-200 font-semibold">{forgotEmail}</span>, we've sent a reset link. It expires in 1 hour.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForgot}
                  className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 transition-all"
                >
                  Got it
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
