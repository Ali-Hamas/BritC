import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, Loader2, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { resetPassword } from '../../lib/auth-client';

export const ResetPassword: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) {
      setError('This reset link is invalid or incomplete. Please request a new one.');
    } else {
      setToken(t);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Missing reset token.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: rErr } = await resetPassword({
        newPassword: password,
        token,
      });
      if (rErr) throw new Error(rErr.message || 'Could not reset password');
      setDone(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05060d] text-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[45rem] h-[45rem] bg-gradient-to-br from-indigo-600/30 via-violet-500/10 to-transparent rounded-full blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-40 -right-32 w-[40rem] h-[40rem] bg-gradient-to-tr from-fuchsia-600/20 via-indigo-500/10 to-transparent rounded-full blur-3xl animate-[pulse_10s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-xl">
              <Zap className="text-white fill-white" size={20} />
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              BritSync <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">Assistant</span>
            </h1>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-br from-indigo-500/40 via-fuchsia-500/20 to-transparent opacity-60" />
          <div className="relative rounded-[2rem] bg-[#0a0b14]/90 backdrop-blur-2xl border border-white/10 shadow-[0_0_60px_-20px_rgba(99,102,241,0.5)] p-7 sm:p-8">
            {done ? (
              <div className="text-center space-y-5 py-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="text-emerald-400" size={28} />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold tracking-tight">Password updated</h2>
                  <p className="text-sm text-slate-400">Redirecting you to sign in…</p>
                </div>
              </div>
            ) : !token && error ? (
              <div className="text-center space-y-5 py-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                  <AlertTriangle className="text-rose-400" size={28} />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold tracking-tight">Link invalid</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => (window.location.href = '/')}
                  className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-white bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 shadow-lg shadow-indigo-500/30 transition-all"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight">Set a new password</h2>
                  <p className="text-sm text-slate-500">Choose a strong password you haven't used before.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">New password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-slate-100 outline-none focus:border-indigo-500/60 focus:bg-white/[0.05] focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-600 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat the password"
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
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-white bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 shadow-lg shadow-indigo-500/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      Update password
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <div className="text-center text-xs text-slate-500 pt-1">
                  <button
                    type="button"
                    onClick={() => (window.location.href = '/')}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Back to sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
