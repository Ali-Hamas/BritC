import { Link, LogOut, AlertTriangle, Shield } from 'lucide-react';
import { signOut } from '../../lib/auth-client';

export const ReferralRequiredScreen = ({ email, onSignOut }: { email: string; onSignOut: () => void }) => {
  return (
    <div className="min-h-screen bg-[#05060d] text-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[45rem] h-[45rem] bg-gradient-to-br from-amber-600/20 via-orange-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-32 w-[40rem] h-[40rem] bg-gradient-to-tr from-fuchsia-600/10 via-indigo-500/5 to-transparent rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-[2rem] bg-[#0a0b14]/80 backdrop-blur-2xl border border-white/10 shadow-[0_0_60px_-20px_rgba(245,158,11,0.3)] p-8 sm:p-10 text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Shield size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Activation Required</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your account needs a referral link to activate. Sign up using an invitation link from your admin to get started.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl">
            <Link size={14} className="text-slate-500" />
            <span className="text-sm text-white/80 font-mono">{email}</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed -mt-2">
            You will receive notification into the above email with a link to start.
          </p>
          <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-left">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/70 leading-relaxed space-y-1">
              <p>Referral links grant instant access to the Enterprise plan with:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>Unlimited team chats</li>
                <li>64 GB file storage</li>
                <li>All AI skills unlocked</li>
              </ul>
            </div>
          </div>
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
