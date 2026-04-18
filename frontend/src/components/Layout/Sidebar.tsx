import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  Search, 
  Mail, 
  Zap, 
  Settings,
  LogOut,
  ChevronRight,
  Bot,
  Users
} from 'lucide-react';
import { ActivityService } from '../../lib/activity';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onSignOut }) => {
  const menuItems = [
    { id: 'assistant',   label: 'Chat & Team',  icon: Bot },
    { id: 'profile',     label: 'Profile',      icon: Settings },
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
    <aside className="w-64 bg-[#020617] border-r border-white/5 flex flex-col h-full z-50">
      <div className="p-8">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="h-10 w-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
            <Zap className="text-white fill-white" size={24} />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">Britsee</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'} />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
              {isActive && <ChevronRight size={14} className="animate-pulse" />}
            </button>
          );
        })}
      </nav>

      {activeMembers.length > 0 && (
        <div className="px-6 py-4 border-t border-white/5">
          <div className="flex items-center gap-2 mb-3">
             <Users size={12} className="text-slate-500" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Team</span>
          </div>
          <div className="space-y-3">
            {activeMembers.map((member, i) => (
              <div key={i} className="flex items-start gap-2 group">
                <div className="relative mt-1">
                  <div className="h-2 w-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <div className="absolute inset-0 h-2 w-2 bg-emerald-500 rounded-full animate-ping opacity-20" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-300 truncate">{member.name}</p>
                  <p className="text-[9px] text-slate-500 truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight font-medium">
                    {member.lastAction}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-6 border-t border-white/5 space-y-4">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-200 group font-medium text-sm"
        >
          <LogOut size={18} className="text-slate-500 group-hover:text-rose-400" />
          <span>Sign Out</span>
        </button>
        <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest opacity-50 font-bold">Britsee Assistant v1.0</p>
      </div>
    </aside>
  );
};
