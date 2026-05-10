import React from 'react';
import {
  LogOut,
  ChevronRight,
  Bot,
  Users,
  PoundSterling,
  Settings,
  Shield,
  X,
  Zap,
  Newspaper,
  Lock,
} from 'lucide-react';
import { ActivityService } from '../../lib/activity';
import { BusinessProfile } from '../../lib/profiles';
import { TeamService } from '../../lib/team';
import { type SubscriptionStatus } from '../../lib/subscription';
import { PlanSelectionModal } from '../Common/PlanSelectionModal';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut?: () => void;
  profile: BusinessProfile | null;
  onClose?: () => void;
  subscription?: SubscriptionStatus | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onSignOut, onClose, subscription }) => {
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const isModerator = TeamService.isGlobalModerator();
  const isFree = !subscription || subscription.plan === 'free';
  const menuItems: { id: string; label: string; icon: typeof Bot; locked?: boolean }[] = [
    { id: 'assistant', label: 'Chat',      icon: Bot },
    { id: 'finance',   label: 'Finance',   icon: PoundSterling, locked: isFree },
    { id: 'news',      label: 'News',      icon: Newspaper,     locked: isFree },
    { id: 'team',      label: 'Team Chat', icon: Users,         locked: isFree },
    { id: 'profile',   label: 'Profile',   icon: Settings },
    ...(isModerator ? [{ id: 'admin', label: 'Admin', icon: Shield }] : []),
  ];

  const [activeMembers, setActiveMembers] = React.useState<{name: string, lastAction: string}[]>([]);

  React.useEffect(() => {
    const updatePresence = () => {
      setActiveMembers(ActivityService.getActiveMembers());
    };
    updatePresence();
    const interval = setInterval(updatePresence, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-full md:w-64 lg:w-72 bg-white border-r border-slate-200 flex flex-col h-full z-50 shadow-sm min-h-0">
      <div className="p-4 md:p-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
            <img src="/favicon.png" alt="Britsync AI" className="h-full w-full object-cover" />
          </div>
          <span className="text-xl font-bold grad-text tracking-tight">Britsync AI</span>
        </div>
        <button 
          onClick={onClose} 
          className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 md:px-4 space-y-1 md:space-y-1.5 py-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isLocked = !!item.locked;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isLocked) {
                  setShowUpgradeModal(true);
                } else {
                  onTabChange(item.id);
                }
              }}
              className={`w-full flex items-center justify-between px-3 md:px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                  : isLocked
                    ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={
                  isActive
                    ? 'text-blue-600'
                    : isLocked
                      ? 'text-slate-400 group-hover:text-amber-600'
                      : 'text-slate-500 group-hover:text-blue-600'
                } />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              {isActive
                ? <ChevronRight size={14} className="animate-pulse text-blue-500" />
                : isLocked
                  ? <Lock size={12} className="text-slate-400 group-hover:text-amber-600" />
                  : null}
            </button>
          );
        })}
      </nav>

      {activeMembers.length > 0 && (
        <div className="px-4 md:px-5 py-3 border-t border-slate-200 shrink-0 max-h-32 overflow-y-auto hidden lg:block">
          <div className="flex items-center gap-2 mb-2">
             <Users size={12} className="text-slate-500" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Team</span>
          </div>
          <div className="space-y-2">
            {activeMembers.map((member, i) => (
              <div key={i} className="flex items-start gap-2 group">
                <div className="relative mt-1">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <div className="absolute inset-0 h-2 w-2 bg-emerald-500 rounded-full animate-ping opacity-20" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-900 truncate">{member.name}</p>
                  <p className="text-[9px] text-slate-500 truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight font-medium">
                    {member.lastAction}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 md:p-4 border-t border-slate-200 space-y-2 shrink-0">
        {isFree && (
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 grad-bg hover:opacity-90 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/30"
          >
            <Zap size={16} />
            Upgrade to Enterprise
          </button>
        )}
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 md:px-4 py-2.5 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group font-medium text-sm"
        >
          <LogOut size={18} className="text-slate-500 group-hover:text-red-600" />
          <span>Sign Out</span>
        </button>
        <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">Britsync AI v1.0</p>
      </div>
      <PlanSelectionModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </aside>
  );
};

