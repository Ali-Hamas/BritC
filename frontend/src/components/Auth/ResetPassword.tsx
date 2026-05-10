import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, Loader2, CheckCircle2, AlertTriangle, ChevronLeft } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[45rem] h-[45rem] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-32 w-[40rem] h-[40rem] bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-xl border border-slate-100 flex items-center justify-center bg-white">
              <img src="/favicon.png" alt="Britsync AI" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              Britsync <span className="text-blue-600">AI</span>
            </h1>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl p-8 sm:p-12 animate-in zoom-in-95 duration-300 relative overflow-hidden">
           <button
            type="button"
            onClick={() => window.location.href = '/'}
            className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all active:scale-95"
          >
            <ChevronLeft size={14} /> Back
          </button>

            {done ? (
              <div className="text-center space-y-6 py-6">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="text-emerald-500" size={40} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Access Restored</h2>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">System identity successfully updated. Re-deploying to session node...</p>
                </div>
              </div>
            ) : !token && error ? (
              <div className="text-center space-y-6 py-6">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-red-50 border border-red-100 flex items-center justify-center shadow-sm">
                  <AlertTriangle className="text-red-500" size={40} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Protocol Invalid</h2>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => (window.location.href = '/')}
                  className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                  Request New Vector
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8 mt-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">New Secret Key</h2>
                  <p className="text-sm text-slate-500 font-medium">Establish a high-entropy credential for your workspace.</p>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Key</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                      <input
                        type="password"
                        required
                        minLength={8}
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="8+ Characters"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-4 text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-200 font-mono text-sm shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Identity</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Repeat Key"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-4 text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-200 font-mono text-sm shadow-inner"
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
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      Commit New Credential
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
        </div>
      </div>
    </div>
  );
};
