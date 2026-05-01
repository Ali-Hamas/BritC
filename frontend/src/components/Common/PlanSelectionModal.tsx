import React, { useState } from 'react';
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0e1a] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0a0e1a]/95 backdrop-blur-sm border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-white">Choose Your Plan</h2>
            <p className="text-sm text-slate-400">Select the plan that fits your business needs</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Plans */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {PLANS.map(plan => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  plan.popular
                    ? 'border-indigo-500/40 bg-gradient-to-br from-indigo-600/10 via-violet-500/5 to-fuchsia-500/5 shadow-lg shadow-indigo-500/10'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-full text-[10px] font-black uppercase tracking-wider text-white">
                    Recommended
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${plan.iconBg}`}>
                    <Icon className={plan.iconColor} size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-400">{plan.description}</p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-sm text-slate-400">{plan.period}</span>
                  {plan.current && (
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-4 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-200">
                      <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {plan.limitations.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-500">
                      <X size={14} className="text-rose-400/60 mt-0.5 shrink-0" />
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
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-white bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 transition-all shadow-lg shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Preparing Checkout...
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        {plan.cta}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full py-3 rounded-xl text-center text-sm font-semibold text-slate-500 bg-white/5 mt-auto">
                    Your Current Plan
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 pb-6">
            <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-300">
              <Shield size={16} className="shrink-0" />
              {error}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 border-t border-white/5">
          <p className="text-xs text-slate-500 text-center">
            Secure payment via Stripe · Cancel anytime from your dashboard · Billing resets at the end of your cycle
          </p>
        </div>
      </div>
    </div>
  );
};
