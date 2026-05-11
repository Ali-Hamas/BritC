import React, { useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  X, Loader2, Zap, Shield, Lock, CheckCircle2, CreditCard, AlertTriangle,
} from 'lucide-react';
import { createSubscriptionIntent } from '../../lib/subscription';

const PUB_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise: Promise<Stripe | null> = PUB_KEY
  ? loadStripe(PUB_KEY)
  : Promise.resolve(null);

const FEATURES = [
  'Finance Intelligence Engine',
  'Lead Alpha Hunter Protocols',
  'Autonomous Browser Automation',
  'Unlimited Team Workspace Clusters',
  '64 GB Encrypted Strategic Storage',
  'Priority 24/7 Command Support',
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
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#0f172a',
        colorDanger: '#dc2626',
        fontFamily: 'Inter, system-ui, sans-serif',
        borderRadius: '16px',
        spacingUnit: '5px',
      },
      rules: {
        '.Input': {
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          padding: '16px',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
        },
        '.Input:focus': {
          border: '1px solid #2563eb',
          boxShadow: '0 0 0 4px rgba(37,99,235,0.1)',
        },
        '.Label': {
          color: '#64748b',
          fontSize: '10px',
          fontWeight: '800',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: '8px',
        },
        '.Tab': {
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          padding: '12px',
        },
        '.Tab--selected': {
          backgroundColor: '#eff6ff',
          border: '2px solid #2563eb',
        },
      },
    }),
    []
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all active:scale-95"
        >
          <X size={20} />
        </button>

        {/* Left — plan summary */}
        <div className="md:w-[40%] p-8 sm:p-12 bg-slate-50 border-r border-slate-100 flex flex-col">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xl shadow-blue-500/5 shrink-0 overflow-hidden p-2">
              <img src="/britsee-logo.jpg" alt="Britsync" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
                Protocol Deployment
              </p>
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Enterprise Command</h3>
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-5xl font-black text-slate-900 tracking-tight">£449</span>
            <span className="text-sm font-black text-slate-400 uppercase tracking-widest">/ monthly</span>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-tight mb-10">Full high-tier clearance active instantly</p>

          <div className="space-y-4 mb-10 flex-1">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-start gap-3 group">
                <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <CheckCircle2 size={14} className="text-emerald-600 stroke-[3px]" />
                </div>
                <span className="text-sm text-slate-600 font-bold uppercase tracking-tight leading-snug">{f}</span>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-slate-200 space-y-3">
            <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <Lock size={14} className="text-blue-600" />
              <span>Stripe 256-bit AES Encryption</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <Shield size={14} className="text-emerald-600" />
              <span>Detach Protocol anytime via Console</span>
            </div>
          </div>
        </div>

        {/* Right — payment form */}
        <div className="flex-1 p-8 sm:p-12 bg-white flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
              <CreditCard size={20} />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Payment Interface</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Instant strategic authorization</p>
            </div>
          </div>

          {!PUB_KEY && (
            <div className="p-6 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-black uppercase tracking-tight flex items-center gap-3">
              <AlertTriangle size={20} />
              <div>
                <p className="font-black mb-1">STRIPE CONFIGURATION FAULT</p>
                <p className="font-bold opacity-80 uppercase">Missing public vector: VITE_STRIPE_PUBLISHABLE_KEY</p>
              </div>
            </div>
          )}

          {PUB_KEY && loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
              <Loader2 size={40} className="animate-spin text-blue-600" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Negotiating Handshake...</p>
            </div>
          )}

          {PUB_KEY && error && (
            <div className="p-6 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-black uppercase tracking-tight space-y-4">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} />
                <span>{error}</span>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setClientSecret(null);
                }}
                className="w-full py-3 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-all"
              >
                RE-INITIALIZE
              </button>
            </div>
          )}

          {PUB_KEY && clientSecret && !error && (
            <div className="animate-in fade-in duration-500">
              <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
                <PaymentForm onSuccess={onSuccess} />
              </Elements>
            </div>
          )}
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
      setErr(error.message || 'Transmission fault. Verify credentials.');
      setSubmitting(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <PaymentElement options={{ layout: 'tabs' }} />

      {err && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-[10px] font-black uppercase tracking-tight shadow-sm">
          {err}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full flex items-center justify-center gap-3 py-5 rounded-[20px] font-black text-sm uppercase tracking-[0.25em] text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
      >
        {submitting ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <Zap size={20} className="fill-white" />
            Confirm Command · £449/mo
          </>
        )}
      </button>

      <div className="text-center space-y-2">
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.1em] px-4">
          By confirming, you authorize Britsync to establish a recurring monthly debit of £449.00 until termination.
        </p>
        <div className="flex items-center justify-center gap-4 grayscale opacity-40">
           <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-5" />
        </div>
      </div>
    </form>
  );
};

export default StripeCheckoutModal;
