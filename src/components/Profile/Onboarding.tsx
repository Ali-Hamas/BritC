import React from 'react';
import { Target, Users, Briefcase, ChevronRight } from 'lucide-react';
import { ProfileService } from '../../lib/profiles';

const steps = [
    { id: 'basics', title: 'The Basics', icon: Briefcase },
    { id: 'audience', title: 'Target Audience', icon: Users },
    { id: 'goals', title: 'Growth Goals', icon: Target },
];

export const Onboarding = ({ onComplete }: { onComplete: (profile: any) => void }) => {
    const [currentStep, setCurrentStep] = React.useState(0);
    const [formData, setFormData] = React.useState({
        businessName: '',
        industry: 'SaaS',
        audience: '',
        revenueGoal: '',
    });

    const next = async () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(s => s + 1);
        } else {
            try {
                // Ensure all fields are passed correctly
                await ProfileService.saveProfile({
                    businessName: formData.businessName,
                    industry: formData.industry,
                    audience: formData.audience,
                    revenueGoal: formData.revenueGoal,
                    plan: 'pro'
                });
            } catch (error) {
                console.warn('Onboarding save failed, proceeding with local fallback:', error);
            } finally {
                // ALWAYS call onComplete to let the app proceed
                onComplete(formData);
            }
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="w-full max-w-2xl glass-card relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                    <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    />
                </div>

                <div className="p-8">
                    <header className="mb-8">
                        <h2 className="text-2xl font-bold grad-text">Build Your Business Profile</h2>
                        <p className="text-slate-400 mt-1">Help me understand your vision to maximize your growth.</p>
                    </header>

                    <div className="grid grid-cols-1 gap-8">
                        {currentStep === 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Business Name</label>
                                    <input
                                        type="text"
                                        value={formData.businessName}
                                        onChange={(e) => handleInputChange('businessName', e.target.value)}
                                        placeholder="e.g. Britsee Agency"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Industry</label>
                                    <select
                                        value={formData.industry}
                                        onChange={(e) => handleInputChange('industry', e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-primary/50 text-white"
                                    >
                                        <option value="SaaS" className="bg-slate-900">SaaS</option>
                                        <option value="E-commerce" className="bg-slate-900">E-commerce</option>
                                        <option value="Services" className="bg-slate-900">Services</option>
                                        <option value="Hospitality" className="bg-slate-900">Hospitality</option>
                                        <option value="Real Estate" className="bg-slate-900">Real Estate</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {currentStep === 1 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Who is your ideal customer?</label>
                                    <textarea
                                        value={formData.audience}
                                        onChange={(e) => handleInputChange('audience', e.target.value)}
                                        placeholder="Describe your target audience..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 h-32 focus:outline-none focus:border-primary/50"
                                    />
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Primary Growth Goal</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {['Revenue Growth', 'Market Share', 'Customer Retention', 'Lead Gen'].map(goal => (
                                            <button
                                                key={goal}
                                                onClick={() => handleInputChange('revenueGoal', goal)}
                                                className={`p-4 rounded-xl border transition-all text-left text-sm font-medium ${formData.revenueGoal === goal
                                                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                                                    : 'border-white/10 hover:border-primary/50 hover:bg-primary/5 text-slate-400'
                                                    }`}
                                            >
                                                {goal}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-12">
                        <div className="flex gap-2">
                            {steps.map((_, i) => (
                                <div key={i} className={`w-2 h-2 rounded-full ${i === currentStep ? 'bg-primary' : 'bg-white/10'}`} />
                            ))}
                        </div>
                        <button
                            onClick={next}
                            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all active:scale-95 shadow-lg shadow-primary/20"
                        >
                            {currentStep === steps.length - 1 ? 'Start Growth' : 'Continue'}
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
