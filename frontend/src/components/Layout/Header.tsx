import React from 'react';
import { User, Bell, Search, Menu, X } from 'lucide-react';
import { BusinessProfile } from '../../lib/profiles';

interface HeaderProps {
  profile: BusinessProfile | null;
}

interface HeaderWithMenuProps extends HeaderProps {
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
}

const Header: React.FC<HeaderWithMenuProps> = ({ profile, onMenuClick, isMenuOpen }) => {
  return (
    <header className="h-16 md:h-20 border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl px-3 md:px-8 flex items-center justify-between sticky top-0 z-50">
      {/* Mobile Menu Button */}
      <button 
        onClick={onMenuClick} 
        className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
      >
        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      
      <div className="flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 md:gap-4 bg-slate-900/50 px-2 md:px-4 py-2 rounded-xl border border-white/5 max-w-[200px] md:max-w-none">
        <Search size={18} className="text-slate-500 shrink-0" />
        <input 
          type="text" 
          placeholder="Search..." 
          className="hidden md:block bg-transparent border-none outline-none text-sm text-slate-300 w-32 md:w-64"
        />
        <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-6">
        <button className="relative text-slate-400 hover:text-white transition-colors p-2">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full border-2 border-[#020617]"></span>
        </button>
        
        <div className="h-6 md:h-8 w-[1px] bg-white/5 mx-1 md:mx-2"></div>
        
        <div className="flex items-center gap-2 md:gap-3 pl-1 md:pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white tracking-tight">{profile?.businessName || 'Guest'}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{profile?.industry || 'Setup Required'}</p>
          </div>
          <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="h-full w-full rounded-[10px] bg-[#020617] flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
