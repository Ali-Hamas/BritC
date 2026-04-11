import React, { useState } from 'react';
import { Shield, Lock, ArrowRight, Mail, Zap, CheckCircle, Globe, Users } from 'lucide-react';
import { ProfileService } from '../../lib/profiles';

interface AuthProps {
  onAuthenticated: (profile: any) => void;
  onStartOnboarding: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthenticated, onStartOnboarding }) => {
  const [activeMode, setActiveMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Login/Register States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Mock Login: Check if a local profile exists
    const profile = await ProfileService.getLatestProfile();
    if (profile) {
      setTimeout(() => {
        onAuthenticated(profile);
        setIsLoading(false);
      }, 1000);
    } else {
      setError('No profile found. Please register a new workspace.');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Create a Pro profile for new workspace
    const newProfile = {
      businessName: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
      email: email,
      industry: 'Technology',
      plan: 'pro'
    };
    
    localStorage.setItem('britsync_profile', JSON.stringify(newProfile));
    
    // Mock Registration: Just proceed to onboarding for now
    setTimeout(() => {
      onStartOnboarding();
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-purple-500/10 blur-[150px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-[1000px] grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10 animate-in fade-in zoom-in-95 duration-1000">
        
        {/* Left Side: Branding & Value Prop */}
        <div className="space-y-8 hidden lg:block pr-8 border-r border-white/5">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-3 transition-transform hover:rotate-0">
                <Zap className="text-white fill-white" size={24} />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter">BritSync <span className="text-indigo-500">Assistant</span></h1>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
              The only AI-powered workspace that grows as fast as your business.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-200">Global AI Intelligence</h3>
                <p className="text-sm text-slate-500">Unrestricted access to top-tier browser-enabled AI models.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <Users size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-200">Unified Team Access</h3>
                <p className="text-sm text-slate-500">Link your team and instantly unlock the shared Pro Plan.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-pink-500/10 rounded-xl text-pink-400 border border-pink-500/20">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-200">Enterprise Security</h3>
                <p className="text-sm text-slate-500">Advanced authenticated workflows for every member.</p>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#020617] overflow-hidden bg-slate-800 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-500">U{i}</span>
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-[#020617] bg-indigo-500 flex items-center justify-center text-[10px] font-black text-white">
                +14
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 font-medium">Joined by 1,200+ fast-growing agencies this week.</p>
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="w-full">
          <div className="glass-card rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden relative group">
            
            {/* Tab Header */}
            <div className="flex border-b border-white/5 bg-white/[0.02]">
              <button 
                onClick={() => setActiveMode('login')}
                className={`flex-1 py-5 text-xs font-black uppercase tracking-widest transition-all relative ${activeMode === 'login' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Sign In
                {activeMode === 'login' && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-500 rounded-full" />}
              </button>
              <button 
                onClick={() => setActiveMode('register')}
                className={`flex-1 py-5 text-xs font-black uppercase tracking-widest transition-all relative ${activeMode === 'register' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Register
                {activeMode === 'register' && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 rounded-full" />}
              </button>
            </div>

            <div className="p-8 pb-10 space-y-6">
              {/* Form Switching Logic */}
              <form onSubmit={activeMode === 'login' ? handleLogin : handleRegister} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-slate-200 outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700 font-medium"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{activeMode === 'register' ? 'Set Password' : 'Password'}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-slate-200 outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-700 font-medium font-mono"
                    />
                  </div>
                  {activeMode === 'register' && password && (
                    <div className="flex gap-1 px-1 mt-2">
                      {[1, 2, 3, 4].map(i => (
                        <div 
                          key={i} 
                          className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                            password.length >= i * 2 ? 'bg-emerald-500' : 'bg-white/5'
                          }`} 
                        />
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-2xl text-pink-400 text-xs font-bold text-center animate-shake">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className={`w-full py-4 text-white rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-xl flex items-center justify-center gap-2 group ${activeMode === 'login' ? 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'}`}
                >
                  {isLoading ? <Zap className="animate-spin" size={20} /> : <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />}
                  {activeMode === 'login' ? 'Sign In to Workspace' : 'Create My Workspace'}
                </button>

                <div className="text-center pt-2">
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                    {activeMode === 'login' ? "Don't have a workspace yet?" : "Already have an account?"}
                  </p>
                  <button 
                    type="button"
                    onClick={() => {
                      setActiveMode(activeMode === 'login' ? 'register' : 'login');
                      setError('');
                    }}
                    className="text-indigo-400 hover:text-indigo-300 text-xs font-black uppercase tracking-widest mt-1 underline underline-offset-4 decoration-indigo-500/30 transition-colors"
                  >
                    {activeMode === 'login' ? 'Register Now' : 'Sign in instead'}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Footer Tip */}
            <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center gap-3">
              <CheckCircle size={16} className="text-emerald-400" />
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase tracking-tighter">
                BritSync utilizes AES-256 military-grade encryption for all team data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
