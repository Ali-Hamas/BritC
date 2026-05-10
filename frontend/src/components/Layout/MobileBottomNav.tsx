import React from 'react';
import { Bot, Users, PoundSterling, Settings, Shield, Newspaper, Lock } from 'lucide-react';
import { TeamService } from '../../lib/team';
import type { SubscriptionStatus } from '../../lib/subscription';
import { PlanSelectionModal } from '../Common/PlanSelectionModal';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  subscription?: SubscriptionStatus | null;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onTabChange, subscription }) => {
  const isModerator = TeamService.isGlobalModerator();
  const isFree = !subscription || subscription.plan === 'free';
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const items: { id: string; label: string; icon: typeof Bot; locked?: boolean }[] = [
    { id: 'assistant', label: 'Chat',    icon: Bot },
    { id: 'finance',   label: 'Finance', icon: PoundSterling, locked: isFree },
    { id: 'news',      label: 'News',    icon: Newspaper,     locked: isFree },
    { id: 'team',      label: 'Team',    icon: Users,         locked: isFree },
    { id: 'profile',   label: 'Profile', icon: Settings },
    ...(isModerator ? [{ id: 'admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-2xl border-t border-slate-200 pb-safe shadow-[0_-5px_15px_rgba(0,0,0,0.03)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around px-1 h-16 sm:h-20">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          const locked = !!item.locked;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (locked) setShowUpgradeModal(true);
                else onTabChange(item.id);
              }}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 transition-all active:scale-90 ${
                active ? 'text-blue-600' : locked ? 'text-slate-400' : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label={item.label}
            >
              <div
                className={`relative flex items-center justify-center w-12 h-7 sm:h-8 rounded-full transition-all ${
                  active ? 'bg-blue-50' : ''
                }`}
              >
                <Icon size={20} className={active ? 'stroke-[2.5px]' : 'stroke-[2px]'} />
                {locked && (
                  <span className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow border border-slate-200">
                    <Lock size={9} className="text-amber-500" />
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-blue-600' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      <PlanSelectionModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </nav>
  );
};
