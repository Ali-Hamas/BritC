import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, X } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (id: string) => void;
    onSignOut?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, onSignOut }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="h-screen bg-[#020617] flex overflow-hidden relative">
            {/* Mobile Sidebar Toggle */}
            <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden fixed top-6 left-6 z-[60] p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 backdrop-blur-md"
            >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Backdrop for mobile */}
            {isSidebarOpen && (
                <div 
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[50]"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className={`
                fixed lg:relative inset-y-0 left-0 z-[55] transform transition-transform duration-300 ease-in-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <Sidebar 
                    activeTab={activeTab} 
                    onTabChange={(id) => {
                        onTabChange(id);
                        setIsSidebarOpen(false);
                    }} 
                    onSignOut={onSignOut} 
                />
            </div>

            <main className="flex-1 relative overflow-hidden flex flex-col">
                {/* Background Gradients */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full -z-10 animate-pulse-glow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full -z-10 animate-pulse-glow" />

                <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin mt-16 lg:mt-0">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};
