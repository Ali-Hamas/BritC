import React from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (id: string) => void;
    onSignOut?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, onSignOut }) => {
    return (
        <div className="h-screen bg-[#020617] flex overflow-hidden">
            <Sidebar activeTab={activeTab} onTabChange={onTabChange} onSignOut={onSignOut} />
            <main className="flex-1 relative overflow-hidden flex flex-col">
                {/* Background Gradients */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full -z-10 animate-pulse-glow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full -z-10 animate-pulse-glow" />

                <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};
