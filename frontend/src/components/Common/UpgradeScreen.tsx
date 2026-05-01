import { useState } from 'react';
import { Lock } from 'lucide-react';
import { PlanSelectionModal } from './PlanSelectionModal';

interface UpgradeScreenProps {
  feature?: string;
  onContact?: () => void;
}

export const UpgradeScreen: React.FC<UpgradeScreenProps> = ({ feature }) => {
  const [showModal, setShowModal] = useState(true);

  return (
    <>
      <div className="h-full w-full overflow-y-auto p-4 sm:p-6 lg:p-10 relative flex items-center justify-center">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-gradient-to-br from-indigo-600/20 via-violet-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-32 w-[35rem] h-[35rem] bg-gradient-to-tr from-fuchsia-600/15 via-indigo-500/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Lock size={12} /> {feature ? `${feature} is locked` : 'Premium feature'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Unlock everything Britsee can do
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            You&apos;re on the Free plan. Upgrade to Enterprise for the full workspace &mdash; Finance intelligence, Lead Hunter, Browser automation, unlimited team chats, and 64 GB of storage.
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-sm uppercase tracking-wider text-white bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-indigo-500/30 active:scale-[0.98]"
          >
            View Plans &amp; Upgrade
          </button>
          <p className="text-xs text-slate-500">
            Have a referral link? Sign out and register using the invite link to get Enterprise instantly.
          </p>
        </div>
      </div>
      <PlanSelectionModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
