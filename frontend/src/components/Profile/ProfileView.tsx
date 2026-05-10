import React, { useState } from 'react';
import { Briefcase, Building2, Shield, LogOut, CreditCard, HardDrive, Zap, AlertCircle, Loader2, ExternalLink, Clock, XCircle, Sliders, ShieldCheck, Scale, TrendingUp } from 'lucide-react';
import { BusinessProfile } from '../../lib/profiles';
import type { SubscriptionStatus } from '../../lib/subscription';
import { formatBytes, getPortalUrl, cancelSubscription, STORAGE_LIMIT } from '../../lib/subscription';
import { StripeCheckoutModal } from './StripeCheckoutModal';
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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
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

  const handleUpgrade = () => setShowCheckout(true);
  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto bg-slate-50 min-h-full font-sans text-slate-900">
      <header className="mb-8 sm:mb-12">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Business Profile</h1>
        <p className="text-slate-500 font-medium text-sm sm:text-base">Manage your organization&apos;s identity, subscription, and preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Main Profile Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-4 sm:p-6 md:p-8 relative overflow-hidden group transition-all hover:shadow-md hover:border-blue-200">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Building2 size={120} className="text-blue-500" />
             </div>
             
             <div className="flex items-center gap-4 mb-8 relative z-10">
                <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
                   <Briefcase className="text-blue-600" size={32} />
                </div>
                <div>
                   <h2 className="text-xl font-black text-slate-900">{profile.businessName}</h2>
                   <span className="text-xs font-bold px-2 py-1 mt-1 inline-block bg-orange-50 text-orange-600 rounded-md border border-orange-100 uppercase tracking-wider shadow-sm">
                      {profile.industry}
                   </span>
                </div>
             </div>

             <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                   <span className="text-sm font-semibold text-slate-500">Target Audience</span>
                   <span className="text-sm text-slate-900 font-bold">{profile.audience || 'General'}</span>
                </div>
                <div className="flex flex-col gap-2 py-3 border-b border-slate-100">
                   <span className="text-sm font-semibold text-slate-500">Britsync AI Goals</span>
                   <p className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {profile.revenueGoal || 'No goals specified yet.'}
                   </p>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                   <span className="text-sm font-semibold text-slate-500">Created</span>
                   <span className="text-sm text-slate-700 font-bold">
                      {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                   </span>
                </div>
             </div>
          </div>

          {/* Subscription Card */}
          <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-4 sm:p-6 md:p-8 relative overflow-hidden transition-all hover:shadow-md hover:border-blue-200">
             <div className={`absolute top-0 right-0 p-4 opacity-5 transition-opacity ${isEnterprise ? 'text-emerald-500' : 'text-slate-500'}`}>
                <CreditCard size={100} />
             </div>

             <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center border shadow-sm ${isEnterprise ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                   <Zap className={isEnterprise ? 'text-emerald-500' : 'text-slate-500'} size={20} />
                </div>
                <div>
                   <h3 className="text-lg font-black text-slate-900">Subscription</h3>
                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider shadow-sm mt-0.5 inline-block ${isEnterprise ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {isEnterprise ? 'Enterprise' : 'Free'}
                   </span>
                </div>
             </div>

             <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                   <span className="text-sm font-semibold text-slate-500">Plan</span>
                   <span className="text-sm text-slate-900 font-black">{isEnterprise ? 'Enterprise (£449/mo)' : 'Free'}</span>
                </div>

                {isEnterprise && subscription?.billingCycleEnd && (
                   <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-sm font-semibold text-slate-500">Renews</span>
                      <span className="text-sm text-slate-900 font-bold flex items-center gap-1.5">
                         <Clock size={12} className="text-blue-500" />
                         {new Date(subscription.billingCycleEnd).toLocaleDateString()}
                      </span>
                   </div>
                )}

                {/* Storage Usage */}
                <div className="py-3 border-b border-slate-100">
                   <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-500 flex items-center gap-1.5">
                         <HardDrive size={14} className="text-orange-500" />
                         Storage
                      </span>
                      <span className="text-[11px] text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                         {formatBytes(storageUsed)} / {isEnterprise ? '64 GB' : '0 B'}
                      </span>
                   </div>
                   <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
                      <div
                        className={`h-full rounded-full transition-all duration-500 shadow-sm ${isEnterprise ? (storagePct > 90 ? 'bg-red-500' : 'bg-emerald-500') : 'bg-slate-300'}`}
                        style={{ width: `${isEnterprise ? Math.min(storagePct, 100) : 0}%` }}
                      />
                   </div>
                </div>

                {/* Action Buttons */}
                {isFree ? (
                   <div className="space-y-2 pt-2">
                      <button
                         onClick={handleUpgrade}
                         className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-blue-500/30 active:scale-95"
                      >
                         <Zap size={16} />
                         Upgrade to Enterprise
                      </button>
                   </div>
                ) : (
                   <div className="space-y-2 pt-2">
                      <button
                         onClick={handlePortal}
                         disabled={portalLoading}
                         className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm active:scale-95"
                      >
                         {portalLoading ? <Loader2 size={16} className="animate-spin text-blue-500" /> : <ExternalLink size={16} className="text-blue-500" />}
                         Manage Billing
                      </button>
                      <button
                         onClick={() => setShowCancelConfirm(true)}
                         disabled={cancelLoading}
                         className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm active:scale-95"
                      >
                         <XCircle size={16} />
                         Cancel Subscription
                      </button>
                   </div>
                )}
             </div>
          </div>

          {/* Finance Style */}
          <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-4 sm:p-6 md:p-8 relative overflow-hidden transition-all hover:shadow-md hover:border-blue-200">
             <div className="absolute top-0 right-0 p-4 opacity-5 text-orange-500">
                <Sliders size={100} />
             </div>

             <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center border bg-orange-50 border-orange-100 shadow-sm">
                   <Sliders className="text-orange-500" size={20} />
                </div>
                <div>
                   <h3 className="text-lg font-black text-slate-900">Finance Style</h3>
                   <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 inline-block">
                      Biases scenarios &amp; AI commentary
                   </span>
                </div>
             </div>

             <p className="text-xs font-medium text-slate-600 leading-relaxed mb-6 mt-3 relative z-10">
                Choose how aggressive Britsync&apos;s scenario presets and AI narratives should be. Saved on this device only.
             </p>

             <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 relative z-10">
                {(Object.keys(FINANCE_STYLE_LABELS) as FinanceStyle[]).map((s) => {
                   const Icon = STYLE_ICONS[s];
                   const selected = financeStyle === s;
                   return (
                      <button
                         key={s}
                         type="button"
                         onClick={() => handleStyleChange(s)}
                         className={`p-3.5 rounded-xl border text-left transition-all active:scale-95 shadow-sm ${
                            selected
                               ? 'bg-blue-50 border-blue-300 shadow-[0_0_15px_rgba(37,99,235,0.15)] ring-1 ring-blue-500/20'
                               : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                         }`}
                      >
                         <div className="flex items-center gap-2 mb-2">
                            <div
                               className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm ${
                                  selected
                                     ? 'bg-blue-100 text-blue-600 border-blue-200'
                                     : 'bg-slate-50 text-slate-400 border-slate-100'
                               }`}
                            >
                               <Icon size={14} />
                            </div>
                            <div className={`text-xs font-black uppercase tracking-wider ${selected ? 'text-blue-900' : 'text-slate-700'}`}>
                               {FINANCE_STYLE_LABELS[s]}
                            </div>
                         </div>
                         <div className="text-[10px] font-medium text-slate-500 leading-relaxed">
                            {FINANCE_STYLE_DESCRIPTIONS[s]}
                         </div>
                      </button>
                   );
                })}
             </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white border-2 border-red-100 rounded-[24px] shadow-sm p-4 sm:p-6 md:p-8">
             <h3 className="text-sm font-black text-red-600 uppercase tracking-widest mb-2 sm:mb-3">Danger Zone</h3>
             <p className="text-slate-500 font-medium text-sm mb-4 sm:mb-6">Signing out will clear your current local session data.</p>
             <button
                onClick={onSignOut}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-red-600 border-2 border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all font-black text-xs uppercase tracking-wider shadow-sm active:scale-95"
             >
                <LogOut size={16} />
                Sign Out from Britsync AI
             </button>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 relative overflow-hidden transition-all hover:shadow-md hover:border-blue-200">
              <div className="flex items-center gap-2 mb-4 text-blue-600">
                 <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 shadow-sm"><Shield size={16} /></div>
                 <h3 className="text-xs font-black uppercase tracking-widest">Security</h3>
              </div>
              <p className="text-xs font-medium text-slate-600 leading-relaxed mb-5">
                 Your data is protected by Britsync AI&apos;s enterprise-grade encryption.
              </p>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
                 <div className="h-full w-full bg-blue-500 animate-pulse shadow-sm" />
              </div>
           </div>

           {isEnterprise && subscription?.billingCycleEnd && (
              <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 relative overflow-hidden transition-all hover:shadow-md hover:border-emerald-200">
                 <div className="flex items-center gap-2 mb-3 text-emerald-600">
                    <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 shadow-sm"><Clock size={16} /></div>
                    <h3 className="text-xs font-black uppercase tracking-widest">Billing</h3>
                 </div>
                 <p className="text-xs font-medium text-slate-600 leading-relaxed">
                    Next billing date: <br/><span className="text-slate-900 text-sm font-black mt-1 inline-block">{new Date(subscription.billingCycleEnd).toLocaleDateString()}</span>
                 </p>
              </div>
           )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)}>
            <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
               <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100 shrink-0 shadow-sm">
                     <AlertCircle className="text-red-500" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">Cancel Subscription?</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">
                      Your Enterprise access will continue until the end of your current billing period. This action cannot be undone.
                    </p>
                  </div>
               </div>
               
               {cancelError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-4 shadow-sm">
                    <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-red-700">{cancelError}</p>
                  </div>
               )}
               <div className="flex gap-3 mt-6">
                  <button
                     onClick={() => setShowCancelConfirm(false)}
                     className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs uppercase tracking-widest font-black transition-all shadow-sm active:scale-95"
                  >
                     Keep It
                  </button>
                  <button
                     onClick={handleCancel}
                     disabled={cancelLoading}
                     className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs uppercase tracking-widest font-black disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 active:scale-95"
                  >
                     {cancelLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                     Confirm Cancel
                  </button>
               </div>
            </div>
         </div>
      )}

      <StripeCheckoutModal
         open={showCheckout}
         onClose={() => setShowCheckout(false)}
         onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
};
