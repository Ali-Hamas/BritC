import { Link, LogOut, AlertTriangle, Shield } from 'lucide-react';
import { signOut } from '../../lib/auth-client';

export const ReferralRequiredScreen = ({ email, onSignOut }: { email: string; onSignOut: () => void }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[45rem] h-[45rem] bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-32 w-[40rem] h-[40rem] bg-blue-500/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-[2.5rem] bg-white border border-slate-200 shadow-2xl p-8 sm:p-12 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
            <Shield size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Activation Locked</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Your operator profile requires a secure referral vector for activation. Use a valid invitation link to establish your workspace.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
            <Link size={16} className="text-slate-400" />
            <span className="text-sm text-slate-900 font-black font-mono">{email}</span>
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Transmission pending. Check your inbox for directives.
          </p>
          <div className="flex items-start gap-4 p-5 bg-blue-50 border border-blue-100 rounded-2xl text-left shadow-sm">
            <AlertTriangle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 font-bold leading-relaxed space-y-1.5 uppercase tracking-tight">
              <p className="font-black text-blue-700">Enterprise Protocols Include:</p>
              <ul className="space-y-1 ml-1">
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-400 rounded-full" /> Unlimited Team Clusters</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-400 rounded-full" /> 64 GB Encrypted Storage</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-400 rounded-full" /> Full Autonomous Agent Suite</li>
              </ul>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut().then(() => onSignOut())}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
          >
            <LogOut size={16} />
            Detach Session
          </button>
        </div>
      </div>
    </div>
  );
};
