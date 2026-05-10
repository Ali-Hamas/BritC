import { XCircle, Mail, AlertTriangle, LogOut } from 'lucide-react';
import { signOut } from '../../lib/auth-client';

export const RejectedScreen = ({ email, onSignOut }: { email: string; onSignOut: () => void }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[45rem] h-[45rem] bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-32 w-[40rem] h-[40rem] bg-orange-500/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-[2.5rem] bg-white border border-slate-200 shadow-2xl p-8 sm:p-12 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-sm">
            <XCircle size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Application Rejected</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Your operator credentials have been denied activation by platform oversight. Inquiries can be directed to the support nexus.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
            <Mail size={16} className="text-slate-400" />
            <span className="text-sm text-slate-900 font-black font-mono">{email}</span>
          </div>
          <div className="flex items-start gap-4 p-5 bg-red-50 border border-red-100 rounded-2xl text-left shadow-sm">
            <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-red-800 font-bold leading-relaxed uppercase tracking-tight">
              Protocol Error: Authorization Vector Invalid. Secure an official referral link for a new deployment attempt.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 pt-2">
            <a
              href="mailto:info@britsyncai.com"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Mail size={16} />
              Open Support Channel
            </a>
            <button
              type="button"
              onClick={() => signOut().then(() => onSignOut())}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
            >
              <LogOut size={16} />
              Sever Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
