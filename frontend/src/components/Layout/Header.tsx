import React from 'react';
import { User, Bell, Search } from 'lucide-react';
import { BusinessProfile } from '../../lib/profiles';

interface HeaderProps {
  profile: BusinessProfile | null;
}

const Header: React.FC<HeaderProps> = ({ profile }) => {
  return (
    <header className="h-20 border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4 bg-slate-900/50 px-4 py-2 rounded-xl border border-white/5">
        <Search size={18} className="text-slate-500" />
        <input 
          type="text" 
          placeholder="Search insights, documents, or leads..." 
          className="bg-transparent border-none outline-none text-sm text-slate-300 w-64"
        />
        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative text-slate-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full border-2 border-[#020617]"></span>
        </button>
        
        <div className="h-8 w-[1px] bg-white/5 mx-2"></div>
        
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white tracking-tight">{profile?.businessName || 'Guest'}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{profile?.industry || 'Setup Required'}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="h-full w-full rounded-[10px] bg-[#020617] flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
