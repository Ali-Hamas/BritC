import { useState } from 'react';
import { Lock, Zap } from 'lucide-react';
import { PlanSelectionModal } from './PlanSelectionModal';

interface UpgradeScreenProps {
  feature?: string;
  onContact?: () => void;
}

export const UpgradeScreen: React.FC<UpgradeScreenProps> = ({ feature }) => {
  const [showModal, setShowModal] = useState(true);

  return (
    <>
      <div className="h-full w-full overflow-y-auto p-4 sm:p-6 lg:p-10 relative flex items-center justify-center bg-slate-50 font-sans">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-32 w-[35rem] h-[35rem] bg-red-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center space-y-6 max-w-lg bg-white p-8 sm:p-12 border border-slate-200 rounded-[32px] shadow-xl shadow-blue-500/5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-xs font-black uppercase tracking-widest shadow-sm">
            <Lock size={12} /> {feature ? `${feature} is locked` : 'Premium feature'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Unlock everything Britsync can do
          </h1>
          <p className="text-slate-500 text-sm sm:text-base font-medium leading-relaxed">
            You&apos;re currently on the Free plan. Upgrade to Enterprise for the full workspace &mdash; Finance intelligence, Lead Hunter, Browser automation, unlimited team chats, and 64 GB of storage.
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.1em] text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 active:scale-95"
          >
            <Zap size={18} /> View Plans &amp; Upgrade
          </button>
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              Have a referral link?
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Sign out and register using the invite link to get Enterprise access instantly.
            </p>
          </div>
        </div>
      </div>
      <PlanSelectionModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
