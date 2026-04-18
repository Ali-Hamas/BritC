import React from 'react';
import { Target, Users, Briefcase, ChevronRight } from 'lucide-react';
import { ProfileService } from '../../lib/profiles';

const steps = [
    { id: 'basics', title: 'The Basics', icon: Briefcase },
    { id: 'audience', title: 'Target Audience', icon: Users },
    { id: 'goals', title: 'Growth Goals', icon: Target },
];

export const Onboarding = ({ onComplete }: { onComplete: (profile: any) => void }) => {
    const [formData, setFormData] = React.useState({
        businessName: '',
        industry: 'Services',
        audience: '',
        revenueGoal: 'Support Team',
    });

    const finish = async () => {
        if (!formData.businessName) return;
        
        try {
            await ProfileService.saveProfile({
                businessName: formData.businessName,
                industry: formData.industry,
                audience: formData.audience,
                revenueGoal: formData.revenueGoal,
                plan: 'pro'
            });
        } catch (error) {
            console.warn('Onboarding save failed:', error);
        } finally {
            onComplete(formData);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="w-full max-w-md glass-card relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="p-8">
                    <header className="mb-8 text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
                            <Briefcase className="w-8 h-8 text-primary shadow-glow" />
                        </div>
                        <h2 className="text-2xl font-bold grad-text">Create Business Profile</h2>
                        <p className="text-slate-400 mt-1">Quickly set up your team's business identity.</p>
                    </header>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Business Name</label>
                            <input
                                type="text"
                                value={formData.businessName}
                                onChange={(e) => handleInputChange('businessName', e.target.value)}
                                placeholder="e.g. Britsee Assistant Ltd"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white placeholder:text-slate-600"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Industry</label>
                            <select
                                value={formData.industry}
                                onChange={(e) => handleInputChange('industry', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white"
                            >
                                <option value="Services" className="bg-slate-900">Services</option>
                                <option value="SaaS" className="bg-slate-900">SaaS</option>
                                <option value="E-commerce" className="bg-slate-900">E-commerce</option>
                                <option value="Hospitality" className="bg-slate-900">Hospitality</option>
                                <option value="Real Estate" className="bg-slate-900">Real Estate</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">What you want from the assistant?</label>
                            <textarea
                                value={formData.revenueGoal}
                                onChange={(e) => handleInputChange('revenueGoal', e.target.value)}
                                placeholder="Describe your primary business goals..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 h-24 focus:outline-none focus:border-primary/50 text-white placeholder:text-slate-600 resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Target Audience</label>
                            <input
                                type="text"
                                value={formData.audience}
                                onChange={(e) => handleInputChange('audience', e.target.value)}
                                placeholder="e.g. Small UK Agencies, E-commerce owners"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    <button
                        onClick={finish}
                        disabled={!formData.businessName || !formData.revenueGoal}
                        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-4 rounded-xl font-bold hover:scale-[1.02] transition-all active:scale-98 shadow-lg shadow-primary/20 mt-8 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        Start Collaborating
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
