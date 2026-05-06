import React, { useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  X, Loader2, Zap, Shield, Lock, CheckCircle2, CreditCard,
} from 'lucide-react';
import { createSubscriptionIntent } from '../../lib/subscription';

const PUB_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise: Promise<Stripe | null> = PUB_KEY
  ? loadStripe(PUB_KEY)
  : Promise.resolve(null);

const FEATURES = [
  'Finance intelligence engine',
  'Lead Hunter automated prospecting',
  'Browser automation tools',
  'Unlimited team chats',
  '64 GB enterprise storage',
  'Priority support',
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StripeCheckoutModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || clientSecret) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const result = await createSubscriptionIntent();
      if (cancelled) return;
      if ('error' in result) {
        setError(result.error);
      } else {
        setClientSecret(result.clientSecret);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, clientSecret]);

  const appearance = useMemo(
    () => ({
      theme: 'night' as const,
      variables: {
        colorPrimary: '#818cf8',
        colorBackground: '#0b0d1f',
        colorText: '#e2e8f0',
        colorDanger: '#fb7185',
        fontFamily: 'Inter, system-ui, sans-serif',
        borderRadius: '12px',
        spacingUnit: '4px',
      },
      rules: {
        '.Input': {
          backgroundColor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '12px',
        },
        '.Input:focus': {
          border: '1px solid rgba(129,140,248,0.6)',
          boxShadow: '0 0 0 3px rgba(129,140,248,0.15)',
        },
        '.Label': {
          color: '#94a3b8',
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        },
        '.Tab': {
          backgroundColor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        },
        '.Tab--selected': {
          backgroundColor: 'rgba(129,140,248,0.15)',
          border: '1px solid rgba(129,140,248,0.5)',
        },
      },
    }),
    []
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-[#0b0d1f] border border-white/10 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl my-2 sm:my-4 max-h-[96vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-fuchsia-600/10 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-72 sm:w-96 h-72 sm:h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-72 sm:w-96 h-72 sm:h-96 bg-fuchsia-500/15 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
        >
          <X size={16} />
        </button>

        <div className="relative grid grid-cols-1 md:grid-cols-5 gap-0">
          {/* Left — plan summary */}
          <div className="md:col-span-2 p-4 sm:p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/10 space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2.5 pr-12">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0 overflow-hidden p-1.5">
                <img
                  src="/favicon.png"
                  alt="Britsync"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
                  Britsync
                </p>
                <h3 className="text-base sm:text-lg font-bold text-white -mt-0.5">Enterprise</h3>
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white">£449</span>
              <span className="text-xs sm:text-sm text-slate-400 font-medium">/ month</span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 -mt-2">Cancel anytime · billed monthly</p>

            <div className="space-y-2 sm:space-y-2.5 pt-3 border-t border-white/5">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2 sm:gap-2.5">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={10} className="text-emerald-400" />
                  </div>
                  <span className="text-[11px] sm:text-xs md:text-sm text-slate-300">{f}</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500">
                <Lock size={11} className="shrink-0" />
                <span>Encrypted by Stripe · PCI-DSS compliant</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-500">
                <Shield size={11} className="shrink-0" />
                <span>Cancel anytime from your profile</span>
              </div>
            </div>
          </div>

          {/* Right — payment form */}
          <div className="md:col-span-3 p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-2.5 mb-4 sm:mb-6">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0">
                <CreditCard size={16} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-white text-sm sm:text-base md:text-lg">Payment Details</h4>
                <p className="text-[10px] sm:text-[11px] text-slate-500">Secure & instant activation</p>
              </div>
            </div>

            {!PUB_KEY && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                <p className="font-bold mb-1">Stripe is not configured.</p>
                <p>Add VITE_STRIPE_PUBLISHABLE_KEY to your frontend .env.</p>
              </div>
            )}

            {PUB_KEY && loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 size={28} className="animate-spin text-indigo-400" />
                <p className="text-xs text-slate-400">Preparing secure checkout...</p>
              </div>
            )}

            {PUB_KEY && error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
                <button
                  onClick={() => {
                    setError(null);
                    setClientSecret(null);
                  }}
                  className="ml-2 underline font-bold"
                >
                  Try again
                </button>
              </div>
            )}

            {PUB_KEY && clientSecret && !error && (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
                <PaymentForm onSuccess={onSuccess} />
              </Elements>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/?payment=success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErr(error.message || 'Payment failed. Please try a different card.');
      setSubmitting(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />

      {err && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {err}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 text-white rounded-xl font-bold text-sm sm:text-base shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {submitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Zap size={18} />
            Confirm Payment · £449/mo
          </>
        )}
      </button>

      <p className="text-[10px] text-slate-500 text-center leading-relaxed">
        By confirming, you authorize Britsync to charge your card £449.00 monthly until canceled.
        Powered by Stripe.
      </p>
    </form>
  );
};

export default StripeCheckoutModal;
