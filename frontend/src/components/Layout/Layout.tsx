import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import Header from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { BusinessProfile } from '../../lib/profiles';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  profile: BusinessProfile | null;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  onTabChange, 
  onSignOut,
  profile 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen-dvh w-full max-w-full bg-[#030712] text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse delay-700" />
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150 brightness-100" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Full screen overlay on mobile */}
      <aside className={`
        fixed inset-0 z-50 w-full md:w-64 lg:w-72 transform transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${!isSidebarOpen && 'md:block'}
        ${isSidebarOpen ? 'block' : 'hidden md:block'}
      `}>
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={(tab) => {
            onTabChange(tab);
            setIsSidebarOpen(false);
          }} 
          onSignOut={onSignOut}
          profile={profile}
          onClose={() => setIsSidebarOpen(false)}
        />
      </aside>

      {/* Main Content Area - Full width on mobile */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full w-full">
        <Header
          profile={profile}
          onMenuClick={toggleSidebar}
          isMenuOpen={isSidebarOpen}
        />

        <main className="flex-1 overflow-hidden relative flex flex-col w-full pb-[64px] md:pb-0">
          {/* Full width app viewport */}
          <div className="flex-1 w-full max-w-full mx-auto flex flex-col h-full">
             {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          onTabChange(tab);
          setIsSidebarOpen(false);
        }}
      />
    </div>
  );
};
