import { XCircle, Mail, AlertTriangle, LogOut } from 'lucide-react';
import { signOut } from '../../lib/auth-client';

export const RejectedScreen = ({ email, onSignOut }: { email: string; onSignOut: () => void }) => {
  return (
    <div className="min-h-screen bg-[#05060d] text-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[45rem] h-[45rem] bg-gradient-to-br from-indigo-600/30 via-violet-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-32 w-[40rem] h-[40rem] bg-gradient-to-tr from-fuchsia-600/20 via-indigo-500/10 to-transparent rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-[2rem] bg-[#0a0b14]/80 backdrop-blur-2xl border border-white/10 shadow-[0_0_60px_-20px_rgba(239,68,68,0.5)] p-8 sm:p-10 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <XCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Application not approved</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your account application was not approved at this time. If you believe this was a mistake, please contact support.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl">
            <Mail size={14} className="text-slate-500" />
            <span className="text-sm text-white/80 font-mono">{email}</span>
          </div>
          <div className="flex items-start gap-3 p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl text-left">
            <AlertTriangle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-rose-200/70 leading-relaxed">
              Need an invitation? Contact the admin team to request a referral link for instant access.
            </p>
          </div>
          <a
            href="mailto:info@britsyncai.com"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
          >
            <Mail size={14} />
            Contact Support
          </a>
          <button
            type="button"
            onClick={() => signOut().then(() => onSignOut())}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 transition-all"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};
