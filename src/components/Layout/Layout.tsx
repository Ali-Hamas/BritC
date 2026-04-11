import React from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (id: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
    return (
        <div className="min-h-screen bg-background flex">
            <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
            <main className="flex-1 ml-64 p-8 relative overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full -z-10" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full -z-10" />

                <div className="max-w-7xl mx-auto h-full">
                    {children}
                </div>
            </main>
        </div>
    );
};
