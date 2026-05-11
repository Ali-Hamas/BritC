import React, { useState, useEffect } from 'react';
import { Shield, Lock, ArrowRight, Mail, Globe, Users, Loader2, Sparkles, X, CheckCircle2, Gift, ChevronLeft } from 'lucide-react';
import { signIn, signUp, signOut, forgetPassword, authClient } from '../../lib/auth-client';
import { getMyApprovalStatus, claimReferralForEmail, recordSignupIntent } from '../../lib/approval';

interface AuthProps {
  onAuthenticated: (profile: Record<string, any>) => void;
  onStartOnboarding?: () => void;
  initialMode?: 'login' | 'register';
  intent?: 'free' | 'enterprise' | null;
  onBackToHome?: () => void;
}

export const Auth: React.FC<AuthProps> = ({
  onAuthenticated,
  onStartOnboarding: _onStartOnboarding,
  initialMode = 'login',
  intent = null,
  onBackToHome,
}) => {
  const [activeMode, setActiveMode] = useState<'login' | 'register'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingState, setPendingState] = useState<null | 'pending' | 'rejected'>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Referral token from URL (?ref=...). When present, the new account skips
  // admin approval and lands on the enterprise plan automatically.
  const [referral, setReferral] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferral(ref);
      setActiveMode('register');
    }
  }, []);

  // Sync mode if props change
  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

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

      const status = await getMyApprovalStatus();
      if (status === 'pending' || status === 'rejected') {
        await signOut().catch(() => {});
        setPendingState(status);
        return;
      }
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
      if (intent) {
        await recordSignupIntent(email, intent);
      }

      let referralAccepted = false;
      if (referral) {
        referralAccepted = await claimReferralForEmail(email, referral);
        if (!referralAccepted) {
          throw new Error('This invite link is invalid or has already been used.');
        }
      }

      const { error: authError } = await signUp.email({
        email,
        password,
        name: name || email.split('@')[0],
        callbackURL: '/',
      });

      if (authError) throw new Error(authError.message || 'Registration failed');

      if (referralAccepted) {
        onAuthenticated({});
        return;
      }

      await signOut().catch(() => {});
      setPendingState('pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocial = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    setError('');
    try {
      if (intent && email) {
        try { await recordSignupIntent(email, intent); } catch { /* non-blocking */ }
      }
      await authClient.signIn.social({
        provider,
        callbackURL: `${window.location.origin}/`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : `${provider} sign-in failed`);
      setIsLoading(false);
    }
  };

  if (pendingState) {
    const isRejected = pendingState === 'rejected';
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-[45rem] h-[45rem] bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-32 w-[40rem] h-[40rem] bg-red-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-md">
          <div className="rounded-[2.5rem] bg-white border border-slate-200 shadow-2xl p-8 sm:p-12 text-center space-y-6">
            <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-sm ${
              isRejected
                ? 'bg-red-50 border border-red-100 text-red-500'
                : 'bg-orange-50 border border-orange-100 text-orange-500'
            }`}>
              {isRejected ? <X size={40} /> : <Shield size={40} />}
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                {isRejected ? 'Application Declined' : 'Entry Pending Review'}
              </h2>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {isRejected
                  ? 'Your workspace application was not approved. For inquiries, please contact platform administration.'
                  : 'Your account is currently under strategic review. You will receive an activation email once access is granted.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setPendingState(null); setActiveMode('login'); setEmail(''); setPassword(''); }}
              className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[45rem] h-[45rem] bg-blue-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-32 w-[40rem] h-[40rem] bg-red-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '40px 48px' }} />
      </div>

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left: Brand */}
        <div className="hidden lg:flex flex-col gap-12 pr-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[20px] overflow-hidden flex items-center justify-center shadow-xl shadow-blue-500/10 border border-slate-100">
              <img src="/britsee-logo.jpg" alt="Britsync AI" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900">
                Britsync <span className="text-blue-600">AI</span>
              </h1>
              <p className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">
                Strategic Workspace Unit
              </p>
            </div>
          </div>

          <p className="text-slate-500 text-xl font-medium leading-relaxed max-w-md">
            The premium growth partner for UK digital agencies. Lead generation, market intelligence, and automated outreach in one unified hub.
          </p>

          <div className="space-y-6">
            {[
              {
                Icon: Globe,
                iconColor: 'text-blue-600',
                bgColor: 'bg-blue-50',
                title: 'Market Intelligence',
                desc: 'Real-time financial signals and global news vectors.',
              },
              {
                Icon: Users,
                iconColor: 'text-red-600',
                bgColor: 'bg-red-50',
                title: 'Team Alignment',
                desc: 'PIN-secured workspaces with shared strategic memory.',
              },
              {
                Icon: Shield,
                iconColor: 'text-orange-600',
                bgColor: 'bg-orange-50',
                title: 'Platform Integrity',
                desc: 'Enterprise-grade security for your proprietary growth data.',
              },
            ].map(({ Icon, iconColor, bgColor, title, desc }) => (
              <div key={title} className="flex items-start gap-5 group">
                <div className={`shrink-0 w-12 h-12 rounded-2xl ${bgColor} flex items-center justify-center shadow-sm border border-transparent group-hover:border-slate-200 transition-all`}>
                  <Icon className={iconColor} size={22} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">{title}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 pt-4">
             <div className="flex -space-x-3">
              {[
                { initials: 'JM', from: '#447794', to: '#2D5B75' },
                { initials: 'SK', from: '#6a9cba', to: '#447794' },
                { initials: 'AR', from: '#2D5B75', to: '#123249' },
                { initials: 'LC', from: '#5b8ba8', to: '#2D5B75' },
              ].map((a, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-[#061222] shadow-sm flex items-center justify-center text-[10px] font-black text-white tracking-wider"
                  style={{ backgroundImage: `linear-gradient(135deg, ${a.from}, ${a.to})` }}
                >
                  {a.initials}
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              Trusted by <span className="text-slate-900 font-black">500+</span> Elite Operators
            </div>
          </div>
        </div>

        {/* Right: Auth card */}
        <div className="w-full max-w-md mx-auto">
          {/* Back to home — sits above the card so it never overlaps tabs */}
          {onBackToHome && (
            <div className="mb-4 flex justify-start">
              <button
                type="button"
                onClick={onBackToHome}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm transition-all active:scale-95"
              >
                <ChevronLeft size={14} /> Home
              </button>
            </div>
          )}

          <div className="relative bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl shadow-blue-500/10 p-2 overflow-hidden">
              {/* Mobile brand */}
              <div className="lg:hidden pt-8 pb-4 text-center">
                <div className="inline-flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg border border-slate-100 flex items-center justify-center">
                    <img src="/britsee-logo.jpg" alt="Britsync AI" className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">Britsync AI</h2>
                </div>
              </div>

              <div className="p-6 sm:p-10 space-y-8">
                {/* Social buttons — top */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSocial('google')}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .55 4.1 1.62l3.05-3.05C17.2 1.7 14.78.75 12 .75 7.36.75 3.35 3.42 1.4 7.3l3.55 2.76C5.92 7.16 8.7 5 12 5z"/><path fill="#4285F4" d="M23.5 12.27c0-.78-.07-1.53-.2-2.27H12v4.51h6.47c-.28 1.5-1.13 2.78-2.4 3.62l3.7 2.87c2.16-2 3.4-4.94 3.4-8.73z"/><path fill="#FBBC05" d="M5 14.06c-.25-.75-.4-1.55-.4-2.31s.15-1.56.4-2.31L1.4 6.7C.5 8.5 0 10.4 0 12.5s.5 4 1.4 5.8l3.55-2.74z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.7-2.87c-1.04.7-2.4 1.1-4.23 1.1-3.3 0-6.08-2.16-7.07-5.06L1.4 17.05C3.36 20.6 7.36 24 12 24z"/></svg>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocial('github')}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.86-.38.97 0 1.95.13 2.86.38 2.18-1.49 3.14-1.18 3.14-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg>
                    GitHub
                  </button>
                </div>

                <div className="relative flex items-center gap-4">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Or Continue With</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* Tabs */}
                <div className="relative flex bg-slate-50 rounded-2xl p-1.5 border border-slate-100">
                  <button
                    onClick={() => { setActiveMode('login'); setError(''); }}
                    className={`relative z-10 flex-1 py-3 text-xs font-black uppercase tracking-[0.15em] transition-colors ${
                      activeMode === 'login' ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { setActiveMode('register'); setError(''); }}
                    className={`relative z-10 flex-1 py-3 text-xs font-black uppercase tracking-[0.15em] transition-colors ${
                      activeMode === 'register' ? 'text-white' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Register
                  </button>
                  <div
                    className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 transition-all duration-500 ease-out ${
                      activeMode === 'login' ? 'left-1.5' : 'left-[calc(50%+3px)]'
                    }`}
                  />
                </div>

                <form
                  key={activeMode}
                  onSubmit={activeMode === 'login' ? handleLogin : handleRegister}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {activeMode === 'login' ? 'Welcome Back' : 'Join the Network'}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">
                      {activeMode === 'login'
                        ? 'Access your strategic growth assets.'
                        : 'Deploy your autonomous AI team today.'}
                    </p>
                  </div>

                  {activeMode === 'register' && referral && (
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm animate-pulse">
                      <Gift size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                      <div className="text-[11px] text-emerald-800 font-bold leading-relaxed uppercase tracking-tight">
                        <strong className="font-black text-emerald-900">Invite Code Valid.</strong><br/>
                        Activation will be instantaneous with Enterprise clearance.
                      </div>
                    </div>
                  )}

                  <div className="space-y-5">
                    {activeMode === 'register' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Name</label>
                        <div className="relative group">
                          <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Operator Name"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-4 text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 text-sm shadow-inner"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="operator@agency.co.uk"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-4 text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 text-sm shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secret Key</label>
                        {activeMode === 'login' && (
                          <button
                            type="button"
                            onClick={openForgot}
                            className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                          >
                            Lost Key?
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input
                          type="password"
                          required
                          minLength={activeMode === 'register' ? 8 : undefined}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={activeMode === 'register' ? '8+ Characters' : '••••••••'}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-4 text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 font-mono text-sm shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="px-5 py-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-black uppercase tracking-tight shadow-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full group inline-flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        {activeMode === 'login' ? 'Authenticate' : 'Establish Account'}
                        <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                      </>
                    )}
                  </button>

                </form>

                <div className="text-center px-4 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-[2.5rem] -mx-10 -mb-10 flex items-center justify-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Secure Protocol v1.0.4 Active</span>
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* Forgot-password modal */}
      {showForgot && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeForgot}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-[2.5rem] bg-white border border-slate-200 shadow-2xl p-8 sm:p-12 animate-in zoom-in-95 duration-300"
          >
            <button
              type="button"
              onClick={closeForgot}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {!forgotSent ? (
              <form onSubmit={handleForgot} className="space-y-8">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight text-center">Reset Key</h3>
                  <p className="text-sm text-slate-500 font-medium text-center">
                    Initiate access recovery via registered email.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Vector</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                      type="email"
                      required
                      autoFocus
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-4 text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 text-sm shadow-inner"
                    />
                  </div>
                </div>

                {forgotError && (
                  <div className="px-5 py-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-black uppercase tracking-tight">
                    {forgotError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail}
                  className="w-full inline-flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-95"
                >
                  {forgotLoading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      Dispatch Link
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center space-y-8 py-4">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="text-emerald-500" size={40} />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Transmission Sent</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    Check <span className="text-blue-600 font-black">{forgotEmail}</span> for recovery directives. Link expires in 60 minutes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForgot}
                  className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
                >
                  Confirm Awareness
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
