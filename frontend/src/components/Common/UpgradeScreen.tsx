import React from 'react';
import { Check, Crown, Lock, Sparkles, X } from 'lucide-react';

interface UpgradeScreenProps {
  feature?: string;
  onContact?: () => void;
}

const ENTERPRISE_FEATURES = [
  'Unlimited team members + Team Chat',
  'Finance dashboard with AI commentary',
  'Lead Hunter (LinkedIn, web, YouTube)',
  'Browser automation + outreach sender',
  'Scenario simulator + forecasts',
  'Priority support',
];

const FREE_FEATURES = [
  'Owner-only Team Chat',
  'Basic AI assistant',
  'Profile + business setup',
];

export const UpgradeScreen: React.FC<UpgradeScreenProps> = ({ feature, onContact }) => {
  const handleContact = () => {
    if (onContact) onContact();
    else window.location.href = 'mailto:info@britsyncai.com?subject=Britsync Enterprise Upgrade';
  };

  return (
    <div className="h-full w-full overflow-y-auto p-4 sm:p-6 lg:p-10 relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-gradient-to-br from-indigo-600/20 via-violet-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-32 w-[35rem] h-[35rem] bg-gradient-to-tr from-fuchsia-600/15 via-indigo-500/10 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Lock size={12} /> {feature ? `${feature} is locked` : 'Premium feature'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Unlock everything Britsync can do
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            You're on the Free plan. Upgrade to Enterprise to access the full
            workspace — Finance intelligence, Lead Hunter, Browser automation,
            and unlimited team members.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Free */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7 space-y-5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Free</h3>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Current plan</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">£0</span>
                <span className="text-sm text-slate-500">/month</span>
              </div>
            </div>
            <ul className="space-y-2.5">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
              <li className="flex items-start gap-2.5 text-sm text-slate-500 line-through">
                <X size={16} className="text-rose-400/60 mt-0.5 shrink-0" />
                <span>Finance, Lead Hunter, Browser automation</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-500 line-through">
                <X size={16} className="text-rose-400/60 mt-0.5 shrink-0" />
                <span>Adding team members</span>
              </li>
            </ul>
          </div>

          {/* Enterprise */}
          <div className="relative rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-600/20 via-violet-500/10 to-fuchsia-500/10 p-6 sm:p-7 space-y-5 shadow-[0_0_40px_-10px_rgba(99,102,241,0.4)]">
            <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-wider">
              <Crown size={10} /> Recommended
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-300" /> Enterprise
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">£480</span>
                <span className="text-sm text-slate-300">/month</span>
              </div>
              <p className="text-xs text-slate-400">All skills unlocked. No middle tier.</p>
            </div>
            <ul className="space-y-2.5">
              {ENTERPRISE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-200">
                  <Check size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleContact}
              className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest text-white bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-indigo-500/30 active:scale-[0.98]"
            >
              Upgrade to Enterprise
            </button>
            <p className="text-[11px] text-center text-slate-400">
              Contact sales to activate · info@britsyncai.com
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500">
          Have an invite? Open the invite link from your inviter to skip
          approval and unlock Enterprise instantly.
        </p>
      </div>
    </div>
  );
};
