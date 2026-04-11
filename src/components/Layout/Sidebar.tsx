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
    { id: 'dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
    { id: 'assistant',   label: 'AI Assistant', icon: Bot },
    { id: 'finance',     label: 'Finance Hub',  icon: BarChart3 },
    { id: 'leadhunter',  label: 'Lead Hunter',  icon: Search },
    { id: 'sender',      label: 'Email Sender', icon: Mail },
    { id: 'operations',  label: 'Operations',   icon: Zap },
    { id: 'settings',    label: 'Settings',     icon: Settings },
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

      <div className="p-6">
        <div className="bg-slate-900/40 rounded-2xl border border-white/5 p-4 space-y-4">
           <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Growth Plan</span>
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded">Pro</span>
           </div>
           <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[75%]" />
           </div>
           <p className="text-[10px] text-slate-500 leading-tight">75% of monthly lead quota used. Upgrade for unlimited.</p>
        </div>
        
        <button 
          onClick={onSignOut}
          className="w-full mt-6 flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-400 transition-colors"
        >
          <LogOut size={18} />
          <span className="font-medium text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
