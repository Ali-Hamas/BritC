import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Zap, Shield, Star, ShieldCheck } from 'lucide-react';
import { StripeCheckoutModal } from '../Profile/StripeCheckoutModal';

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLANS = [
  {
    id: 'free',
    name: 'Standard Unit',
    price: '£0',
    period: '/month',
    description: 'Core intelligence protocols',
    icon: Star,
    iconColor: 'text-slate-400',
    iconBg: 'bg-slate-50 border-slate-200',
    features: [
      '1 Team Workspace cluster',
      'Autonomous AI Assistant',
      'Business profile identity',
      'Standard model inference',
    ],
    limitations: [
      'Finance Intelligence locked',
      'Lead Hunter locked',
      'Browser automation locked',
      'Advanced strategy skills locked',
    ],
    current: true,
    cta: null,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Command',
    price: '£449',
    period: '/month',
    description: 'Full strategic dominance suite',
    icon: Shield,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-100',
    features: [
      'Unlimited Team Workspace clusters',
      'Full AI Assistant (All skills unlocked)',
      '64 GB Encrypted file storage',
      'Finance Intelligence with AI commentary',
      'Lead Hunter (LinkedIn, Web, YouTube)',
      'Autonomous Browser + Outreach',
      'Neural Scenario Simulation',
      'Priority 24/7 Command Support',
    ],
    limitations: [],
    current: false,
    cta: 'Acquire Enterprise Access',
    popular: true,
  },
];

export const PlanSelectionModal: React.FC<PlanSelectionModalProps> = ({ isOpen, onClose }) => {
  const [showCheckout, setShowCheckout] = useState(false);

  const handleCheckout = () => setShowCheckout(true);

  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    onClose();
    setTimeout(() => window.location.reload(), 600);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col m-2"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-6 sm:py-8 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight truncate uppercase">Operational Tiers</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-bold uppercase tracking-widest truncate mt-1">Select your workspace deployment level</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all active:scale-95 shrink-0"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Plans - Scrollable Area */}
        <div className="p-4 sm:p-10 overflow-y-auto scrollbar-thin bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 max-w-5xl mx-auto">
          {PLANS.map(plan => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative rounded-[32px] border-2 p-6 sm:p-8 flex flex-col transition-all duration-500 ${
                  plan.popular
                    ? 'border-blue-600 bg-white shadow-2xl shadow-blue-600/10 scale-[1.02] z-10'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-600/30">
                    High Command Choice
                  </div>
                )}

                <div className="flex items-center gap-4 mb-8">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border-2 ${plan.iconBg} shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon className={plan.iconColor} size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">{plan.name}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{plan.description}</p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-black text-slate-900 tracking-tight tabular-nums">{plan.price}</span>
                  <span className="text-sm text-slate-400 font-black uppercase tracking-widest">{plan.period}</span>
                  {plan.current && (
                    <span className="ml-auto text-[9px] font-black uppercase tracking-[0.25em] text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg shadow-sm">
                      ACTIVE
                    </span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-12 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-3 text-sm text-slate-600 font-bold uppercase tracking-tight leading-tight">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Check size={12} className="text-emerald-600 stroke-[3px]" />
                      </div>
                      <span>{f}</span>
                    </li>
                  ))}
                  {plan.limitations.map(f => (
                    <li key={f} className="flex items-start gap-3 text-sm text-slate-400 font-medium opacity-60">
                      <X size={16} className="text-red-300 mt-1 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {plan.cta ? (
                  <button
                    type="button"
                    onClick={handleCheckout}
                    className="w-full flex items-center justify-center gap-3 py-5 rounded-[20px] font-black text-xs uppercase tracking-[0.25em] text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-95 mt-auto shadow-xl shadow-blue-500/30"
                  >
                    <Zap size={18} className="fill-white" />
                    {plan.cta}
                  </button>
                ) : (
                  <div className="w-full py-5 rounded-[20px] text-center text-xs font-black uppercase tracking-[0.25em] text-slate-400 bg-slate-50 border border-slate-100 mt-auto">
                    Active Deployment
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer - Fixed at bottom */}
      <div className="shrink-0 bg-white border-t border-slate-100 p-6 flex flex-col sm:flex-row items-center justify-center gap-4">
        <div className="flex items-center gap-6 opacity-40">
           <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-6" />
           <ShieldCheck size={24} className="text-slate-400" />
        </div>
        <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-[0.2em]">
          Encrypted Billing · Neural Sovereignty · Global Support Cluster
        </p>
      </div>
      </div>

      <StripeCheckoutModal
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        onSuccess={handleCheckoutSuccess}
      />
    </div>,
    document.body
  );
};
