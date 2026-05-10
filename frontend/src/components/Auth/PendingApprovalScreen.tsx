import { useEffect, useState } from 'react';
import { Clock, Mail, Loader2, AlertCircle, LogOut } from 'lucide-react';
import { getMyApprovalStatus, type ApprovalStatus } from '../../lib/approval';
import { signOut } from '../../lib/auth-client';

export const PendingApprovalScreen = ({ email, onSignOut }: { email: string; onSignOut: () => void }) => {
  const [status, setStatus] = useState<ApprovalStatus>('pending');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const s = await getMyApprovalStatus();
      if (!cancelled) setStatus(s);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (status === 'approved') {
    window.location.reload();
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[45rem] h-[45rem] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-32 w-[40rem] h-[40rem] bg-red-500/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-[2.5rem] bg-white border border-slate-200 shadow-2xl p-8 sm:p-12 text-center space-y-6 animate-in fade-in duration-500">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shadow-sm animate-pulse">
            <Clock size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Profile in Review</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Your operator credentials are being vetted for workspace access. Notification will be dispatched upon approval.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
            <Mail size={16} className="text-slate-400" />
            <span className="text-sm text-slate-900 font-black font-mono">{email}</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-orange-600 text-xs font-black uppercase tracking-widest">
            <Loader2 size={16} className="animate-spin" />
            <span>Awaiting Oversight...</span>
          </div>
          <div className="flex items-start gap-4 p-5 bg-blue-50 border border-blue-100 rounded-2xl text-left shadow-sm">
            <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-800 font-bold leading-relaxed uppercase tracking-tight">
              New deployments require manual clearance. Secure a referral vector for instantaneous kernel access.
            </p>
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
