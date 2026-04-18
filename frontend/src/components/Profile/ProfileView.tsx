import React from 'react';
import { Briefcase, Building2, Shield, LogOut, ChevronRight } from 'lucide-react';
import { BusinessProfile } from '../../lib/profiles';

interface ProfileViewProps {
  profile: BusinessProfile | null;
  onSignOut: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onSignOut }) => {
  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-12">
        <h1 className="text-3xl font-bold text-white mb-2">Business Profile</h1>
        <p className="text-slate-400">Manage your organization's identity and preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Profile Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-8 relative overflow-hidden group">
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
                   <span className="text-sm text-slate-400">Assistant Goals</span>
                   <p className="text-sm text-slate-300 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/10">
                      {profile.revenueGoal || 'No goals specified yet.'}
                   </p>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-white/5">
                   <span className="text-sm text-slate-400">Plan</span>
                   <span className="text-sm text-indigo-400 font-medium uppercase">{profile.plan} Access</span>
                </div>
                <div className="flex items-center justify-between py-3">
                   <span className="text-sm text-slate-400">Created</span>
                   <span className="text-sm text-slate-300">
                      {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                   </span>
                </div>
             </div>
          </div>

          <div className="glass-card p-8 border-rose-500/10">
             <h3 className="text-sm font-bold text-rose-400 uppercase tracking-widest mb-4">Danger Zone</h3>
             <p className="text-slate-400 text-sm mb-6">Signing out will clear your current local session data.</p>
             <button 
                onClick={onSignOut}
                className="flex items-center gap-2 px-6 py-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-all font-bold"
             >
                <LogOut size={18} />
                Sign Out from Britsee
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
                 Your data is protected by Britsee's enterprise-grade encryption.
              </p>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full w-full bg-indigo-500/30 animate-pulse" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
