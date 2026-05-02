import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Zap, Shield, Star, Loader2 } from 'lucide-react';
import { createCheckout } from '../../lib/subscription';

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '£0',
    period: '/month',
    description: 'Get started with the basics',
    icon: Star,
    iconColor: 'text-slate-400',
    iconBg: 'bg-slate-500/10 border-slate-500/20',
    features: [
      '1 team chat',
      'Basic AI assistant',
      'Profile & business setup',
      '0 GB storage',
    ],
    limitations: [
      'Finance dashboard locked',
      'Lead Hunter locked',
      'Browser automation locked',
      'AI skills locked',
    ],
    current: true,
    cta: null,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '£449',
    period: '/month',
    description: 'Full power for growing businesses',
    icon: Shield,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/10 border-indigo-500/20',
    features: [
      'Unlimited team chats',
      'Full AI assistant (all skills)',
      '64 GB file storage',
      'Finance dashboard with AI commentary',
      'Lead Hunter (LinkedIn, web, YouTube)',
      'Browser automation + outreach sender',
      'Scenario simulator & forecasts',
      'Priority support',
    ],
    limitations: [],
    current: false,
    cta: 'Upgrade to Enterprise',
    popular: true,
  },
];

export const PlanSelectionModal: React.FC<PlanSelectionModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await createCheckout();
      if (result && 'url' in result && result.url) {
        window.location.href = result.url;
      } else if (result && 'error' in result) {
        if (result.error === 'CHECKOUT_FAILED') {
          setError('Stripe is not yet configured. Please contact support or try again later.');
        } else {
          setError(result.error);
        }
      } else {
        setError('Checkout service is unavailable. Please try again later.');
      }
    } catch {
      setError('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0e1a] border border-white/10 rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col m-2"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0a0e1a]/95 backdrop-blur-sm border-b border-white/5 px-6 py-5 sm:py-6 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">Choose Your Plan</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium truncate mt-0.5">Select the plan that fits your business needs</p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all active:scale-95 shrink-0"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Plans - Scrollable Area */}
        <div className="p-4 sm:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {PLANS.map(plan => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl border p-6 sm:p-8 flex flex-col transition-all duration-300 ${
                  plan.popular
                    ? 'border-indigo-500/40 bg-white/[0.03] shadow-2xl shadow-indigo-500/10'
                    : 'border-white/5 bg-white/[0.01]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-indigo-500 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/40">
                    Recommended
                  </div>
                )}

                <div className="flex items-center gap-4 mb-6">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${plan.iconBg} shadow-inner`}>
                    <Icon className={plan.iconColor} size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight">{plan.name}</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{plan.description}</p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-black text-white tabular-nums">{plan.price}</span>
                  <span className="text-sm text-slate-500 font-bold">{plan.period}</span>
                  {plan.current && (
                    <span className="ml-auto text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                      Current
                    </span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-3 text-sm text-slate-300 font-medium">
                      <Check size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {plan.limitations.map(f => (
                    <li key={f} className="flex items-start gap-3 text-sm text-slate-600 font-medium line-through decoration-rose-500/30">
                      <X size={16} className="text-rose-500/40 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {plan.cta ? (
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed mt-auto shadow-xl"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      <>
                        <Zap size={16} className="text-indigo-400" />
                        {plan.cta}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full py-4 rounded-2xl text-center text-xs font-black uppercase tracking-widest text-slate-500 bg-white/[0.03] border border-white/5 mt-auto">
                    Active Environment
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Message & Footer - Fixed at bottom */}
      <div className="shrink-0 bg-[#0a0e1a]/95 backdrop-blur-sm border-t border-white/5 p-6 space-y-4">
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-bold text-rose-300 animate-in slide-in-from-bottom-2">
            <Shield size={16} className="shrink-0 text-rose-400" />
            {error}
          </div>
        )}
        <p className="text-[10px] text-slate-600 text-center font-bold uppercase tracking-[0.2em]">
          Secure payment via Stripe · Global Neural Network Access · 24/7 Priority Support
        </p>
      </div>
      </div>
    </div>,
    document.body
  );
};
