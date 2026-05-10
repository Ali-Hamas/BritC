import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import Header from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { BusinessProfile } from '../../lib/profiles';
import type { SubscriptionStatus } from '../../lib/subscription';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  profile: BusinessProfile | null;
  subscription?: SubscriptionStatus | null;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  onTabChange, 
  onSignOut,
  profile,
  subscription,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen h-dvh w-full max-w-full bg-[#f8fafc] text-slate-800 overflow-hidden font-sans selection:bg-blue-500/30 selection:text-blue-900">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/15 blur-[120px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-500/10 blur-[120px] rounded-full animate-pulse delay-700" />
         <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-orange-500/8 blur-[120px] rounded-full animate-pulse delay-500" />
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
          subscription={subscription}
        />
      </aside>

      {/* Main Content Area - Full width on mobile */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full w-full">
        <Header
          profile={profile}
          onMenuClick={toggleSidebar}
          isMenuOpen={isSidebarOpen}
          onTabChange={onTabChange}
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
        subscription={subscription}
      />
    </div>
  );
};

