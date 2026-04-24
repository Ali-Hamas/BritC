import React from 'react';
import { Bot, Users, PoundSterling, Settings, Shield } from 'lucide-react';
import { TeamService } from '../../lib/team';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, onTabChange }) => {
  const isModerator = TeamService.isGlobalModerator();
  const items = [
    { id: 'assistant', label: 'Chat', icon: Bot },
    { id: 'finance', label: 'Finance', icon: PoundSterling },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'profile', label: 'Profile', icon: Settings },
    ...(isModerator ? [{ id: 'admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#030712]/95 backdrop-blur-xl border-t border-white/5 pb-safe"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              aria-label={item.label}
            >
              <div
                className={`flex items-center justify-center w-11 h-7 rounded-xl transition-all ${
                  active ? 'bg-indigo-500/15' : ''
                }`}
              >
                <Icon size={19} />
              </div>
              <span className={`text-[10px] font-semibold tracking-wide ${active ? 'text-indigo-400' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
