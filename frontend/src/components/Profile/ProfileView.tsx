import React, { useState } from 'react';
import { Briefcase, Building2, Shield, LogOut, CreditCard, HardDrive, Zap, AlertCircle, Loader2, ExternalLink, Clock, XCircle, Sliders, ShieldCheck, Scale, TrendingUp } from 'lucide-react';
import { BusinessProfile } from '../../lib/profiles';
import type { SubscriptionStatus } from '../../lib/subscription';
import { formatBytes, getPortalUrl, cancelSubscription, createCheckout, STORAGE_LIMIT } from '../../lib/subscription';
import {
  type FinanceStyle,
  FINANCE_STYLE_LABELS,
  FINANCE_STYLE_DESCRIPTIONS,
  getFinanceStyle,
  setFinanceStyle,
} from '../../lib/financeStyle';

interface ProfileViewProps {
  profile: BusinessProfile | null;
  onSignOut: () => void;
  subscription: SubscriptionStatus | null;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onSignOut, subscription }) => {
  const [cancelLoading, setCancelLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [financeStyle, setFinanceStyleState] = useState<FinanceStyle>(() =>
    getFinanceStyle(profile?.userId)
  );

  if (!profile) return null;

  const handleStyleChange = (style: FinanceStyle) => {
    if (!profile.userId) return;
    setFinanceStyleState(style);
    setFinanceStyle(profile.userId, style);
  };

  const STYLE_ICONS: Record<FinanceStyle, typeof ShieldCheck> = {
    conservative: ShieldCheck,
    balanced: Scale,
    aggressive: TrendingUp,
  };

  const isEnterprise = subscription?.plan === 'enterprise' && subscription?.subscriptionStatus === 'active';
  const isFree = !isEnterprise;
  const storageUsed = subscription?.storageUsed ?? 0;
  const storageLimit = isEnterprise ? STORAGE_LIMIT : 0;
  const storagePct = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const result = await getPortalUrl();
      if (result?.url) window.open(result.url, '_blank');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    setCancelError(null);
    try {
      const ok = await cancelSubscription();
      if (ok) {
        window.location.reload();
      } else {
        setCancelError('Failed to cancel. Please use the Stripe billing portal.');
      }
    } finally {
      setCancelLoading(false);
      setShowCancelConfirm(false);
    }
  };

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const result = await createCheckout();
      if ('url' in result && result.url) window.location.href = result.url;
      else if ('error' in result) setCheckoutError(result.error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
      <header className="mb-8 sm:mb-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Business Profile</h1>
        <p className="text-slate-400 text-sm sm:text-base">Manage your organization&apos;s identity, subscription, and preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Main Profile Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-4 sm:p-6 md:p-8 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Building2 size={120} />
             </div>
             
             <div className="flex items-center gap-4 mb-8">
                <div className="h-16 w-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                   <Briefcase className="text-indigo-400" size={32} />
                </div>
                <div>
                   <h2 className="text-xl font-bold text-white">{profile.businessName}</h2>
                   <span className="text-xs font-medium px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20 uppercase tracking-wider">
                      {profile.industry}
                   </span>
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                   <span className="text-sm text-slate-400">Target Audience</span>
                   <span className="text-sm text-white font-medium">{profile.audience || 'General'}</span>
                </div>
                <div className="flex flex-col gap-2 py-3 border-b border-white/5">
                   <span className="text-sm text-slate-400">Britsync AI Goals</span>
                   <p className="text-sm text-slate-300 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/10">
                      {profile.revenueGoal || 'No goals specified yet.'}
                   </p>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                   <span className="text-sm text-slate-400">Created</span>
                   <span className="text-sm text-slate-300">
                      {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                   </span>
                </div>
             </div>
          </div>

          {/* Subscription Card */}
          <div className="glass-card p-4 sm:p-6 md:p-8 relative overflow-hidden">
             <div className={`absolute top-0 right-0 p-4 opacity-5 transition-opacity ${isEnterprise ? 'text-emerald-400' : 'text-slate-400'}`}>
                <CreditCard size={100} />
             </div>

             <div className="flex items-center gap-3 mb-6">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${isEnterprise ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-500/10 border-slate-500/20'}`}>
                   <Zap className={isEnterprise ? 'text-emerald-400' : 'text-slate-400'} size={20} />
                </div>
                <div>
                   <h3 className="text-lg font-bold text-white">Subscription</h3>
                   <span className={`text-xs font-medium px-2 py-0.5 rounded-md border uppercase tracking-wider ${isEnterprise ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                      {isEnterprise ? 'Enterprise' : 'Free'}
                   </span>
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                   <span className="text-sm text-slate-400">Plan</span>
                   <span className="text-sm text-white font-semibold">{isEnterprise ? 'Enterprise (£449/mo)' : 'Free'}</span>
                </div>

                {isEnterprise && subscription?.billingCycleEnd && (
                   <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-sm text-slate-400">Renews</span>
                      <span className="text-sm text-white font-medium flex items-center gap-1.5">
                         <Clock size={12} className="text-slate-500" />
                         {new Date(subscription.billingCycleEnd).toLocaleDateString()}
                      </span>
                   </div>
                )}

                {/* Storage Usage */}
                <div className="py-3 border-b border-white/5">
                   <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400 flex items-center gap-1.5">
                         <HardDrive size={14} />
                         Storage
                      </span>
                      <span className="text-sm text-white font-medium">
                         {formatBytes(storageUsed)} / {isEnterprise ? '64 GB' : '0 B'}
                      </span>
                   </div>
                   <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isEnterprise ? (storagePct > 90 ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-slate-600'}`}
                        style={{ width: `${isEnterprise ? Math.min(storagePct, 100) : 0}%` }}
                      />
                   </div>
                </div>

                {/* Action Buttons */}
                {isFree ? (
                   <div className="space-y-2">
                      <button
                         onClick={handleUpgrade}
                         disabled={checkoutLoading}
                         className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                      >
                         {checkoutLoading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                         {checkoutLoading ? 'Redirecting...' : 'Upgrade to Enterprise — £449/mo'}
                      </button>
                      {checkoutError && (
                         <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 text-center">
                            {checkoutError}
                         </p>
                      )}
                   </div>
                ) : (
                   <div className="space-y-2">
                      <button
                         onClick={handlePortal}
                         disabled={portalLoading}
                         className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl font-bold transition-all disabled:opacity-50"
                      >
                         {portalLoading ? <Loader2 size={18} className="animate-spin" /> : <ExternalLink size={18} />}
                         Manage Billing
                      </button>
                      <button
                         onClick={() => setShowCancelConfirm(true)}
                         disabled={cancelLoading}
                         className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl font-bold transition-all disabled:opacity-50"
                      >
                         <XCircle size={18} />
                         Cancel Subscription
                      </button>
                   </div>
                )}
             </div>
          </div>

          {/* Finance Style */}
          <div className="glass-card p-4 sm:p-6 md:p-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 text-fuchsia-400">
                <Sliders size={100} />
             </div>

             <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center border bg-fuchsia-500/10 border-fuchsia-500/20">
                   <Sliders className="text-fuchsia-400" size={20} />
                </div>
                <div>
                   <h3 className="text-lg font-bold text-white">Finance Style</h3>
                   <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                      Biases scenarios &amp; AI commentary
                   </span>
                </div>
             </div>

             <p className="text-xs text-slate-400 leading-relaxed mb-5 mt-3">
                Choose how aggressive Britsync&apos;s scenario presets and AI narratives should be. Saved on this device only.
             </p>

             <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(Object.keys(FINANCE_STYLE_LABELS) as FinanceStyle[]).map((s) => {
                   const Icon = STYLE_ICONS[s];
                   const selected = financeStyle === s;
                   return (
                      <button
                         key={s}
                         type="button"
                         onClick={() => handleStyleChange(s)}
                         className={`p-3.5 rounded-xl border text-left transition-all ${
                            selected
                               ? 'bg-fuchsia-500/10 border-fuchsia-500/40 shadow-[0_0_24px_-12px_rgba(217,70,239,0.6)]'
                               : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                         }`}
                      >
                         <div className="flex items-center gap-2 mb-1.5">
                            <div
                               className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  selected
                                     ? 'bg-fuchsia-500/20 text-fuchsia-300'
                                     : 'bg-white/5 text-slate-400'
                               }`}
                            >
                               <Icon size={14} />
                            </div>
                            <div className={`text-sm font-bold ${selected ? 'text-white' : 'text-slate-200'}`}>
                               {FINANCE_STYLE_LABELS[s]}
                            </div>
                         </div>
                         <div className="text-[11px] text-slate-500 leading-relaxed">
                            {FINANCE_STYLE_DESCRIPTIONS[s]}
                         </div>
                      </button>
                   );
                })}
             </div>
          </div>

          {/* Danger Zone */}
          <div className="glass-card p-8 border-rose-500/10">
             <h3 className="text-sm font-bold text-rose-400 uppercase tracking-widest mb-4">Danger Zone</h3>
             <p className="text-slate-400 text-sm mb-6">Signing out will clear your current local session data.</p>
             <button 
                onClick={onSignOut}
                className="flex items-center gap-2 px-6 py-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all font-bold"
             >
                <LogOut size={18} />
                Sign Out from Britsync AI
             </button>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           <div className="glass-card p-6 border-indigo-500/10">
              <div className="flex items-center gap-2 mb-4 text-indigo-400">
                 <Shield size={18} />
                 <h3 className="text-sm font-bold uppercase tracking-widest">Security</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                 Your data is protected by Britsync AI&apos;s enterprise-grade encryption.
              </p>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full w-full bg-indigo-500/30 animate-pulse" />
              </div>
           </div>

           {isEnterprise && subscription?.billingCycleEnd && (
              <div className="glass-card p-6 border-emerald-500/10">
                 <div className="flex items-center gap-2 mb-3 text-emerald-400">
                    <Clock size={18} />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Billing</h3>
                 </div>
                 <p className="text-xs text-slate-400 leading-relaxed">
                    Next billing date: <span className="text-white font-medium">{new Date(subscription.billingCycleEnd).toLocaleDateString()}</span>
                 </p>
              </div>
           )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)}>
            <div className="bg-[#0f1025] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20">
                     <AlertCircle className="text-rose-400" size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-white">Cancel Subscription?</h3>
               </div>
               <p className="text-sm text-slate-400">
                  Your Enterprise access will continue until the end of your current billing period. This action cannot be undone.
               </p>
               {cancelError && (
                  <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">{cancelError}</p>
               )}
               <div className="flex gap-2">
                  <button
                     onClick={() => setShowCancelConfirm(false)}
                     className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 rounded-xl text-sm font-bold transition-colors"
                  >
                     Keep Subscription
                  </button>
                  <button
                     onClick={handleCancel}
                     disabled={cancelLoading}
                     className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                     {cancelLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                     Confirm Cancel
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

