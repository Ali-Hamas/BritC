import React, { useState } from 'react';
import { Shield, Lock, ArrowRight, Mail, Zap, CheckCircle, Globe, Users } from 'lucide-react';
import { signIn, signUp } from '../../lib/auth-client';

interface AuthProps {
  onAuthenticated: (profile: Record<string, any>) => void;
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
    
    try {
      const { error: authError } = await signIn.email({
        email,
        password,
        callbackURL: "/"
      });

      if (authError) {
        throw new Error(authError.message || 'Login failed');
      }
      
      onAuthenticated({});
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const { error: authError } = await signUp.email({
        email,
        password,
        name: email.split('@')[0], // Default name from email
        callbackURL: "/"
      });

      if (authError) {
        throw new Error(authError.message || 'Registration failed');
      }

      onStartOnboarding();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[60%] sm:w-[40%] h-[40%] bg-indigo-500/10 blur-[100px] sm:blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[70%] sm:w-[50%] h-[50%] bg-purple-500/10 blur-[120px] sm:blur-[150px] rounded-full" />
      </div>

      <div className="w-full max-w-[1000px] grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10 animate-in fade-in zoom-in-95 duration-1000">
        
        {/* Left Side: Branding & Value Prop */}
        <div className="space-y-6 lg:space-y-8 hidden lg:block pr-8 border-r border-white/5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-3 transition-transform hover:rotate-0">
                <Zap className="text-white fill-white" size={24} />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter">BritSync <span className="text-indigo-500">Assistant</span></h1>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
              The premium AI-powered workspace engineered for UK entrepreneurs and creative agencies.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-200">Global AI Intelligence</h3>
                <p className="text-sm text-slate-500">Unrestricted access to high-tier AI models with real-time web scraping.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <Users size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-200">Unified Team Access</h3>
                <p className="text-sm text-slate-500">Link your workspace and instantly share your Pro plan benefits with the team.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-200">Enterprise Security</h3>
                <p className="text-sm text-slate-500">AES-256 encrypted authentication for every message and document.</p>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-xl border-2 border-[#030712] overflow-hidden bg-slate-800 flex items-center justify-center shadow-lg">
                  <span className="text-[10px] font-bold text-slate-400">U{i}</span>
                </div>
              ))}
              <div className="w-10 h-10 rounded-xl border-2 border-[#030712] bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                +14
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3 font-bold uppercase tracking-widest">Used by 1,200+ elite agencies</p>
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="w-full flex justify-center">
          <div className="glass-card rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden relative group w-full max-w-md">
            
            {/* Mobile Header (Only visible on small screens) */}
            <div className="lg:hidden p-8 pb-0 text-center space-y-2">
               <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                  <Zap className="text-white fill-white" size={24} />
               </div>
               <h1 className="text-2xl font-black text-white tracking-tighter">BritSync</h1>
            </div>

            {/* Tab Header */}
            <div className="flex border-b border-white/5 bg-white/[0.01] mt-6 lg:mt-0">
              <button 
                onClick={() => setActiveMode('login')}
                className={`flex-1 py-5 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeMode === 'login' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Sign In
                {activeMode === 'login' && <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-indigo-500 rounded-full" />}
              </button>
              <button 
                onClick={() => setActiveMode('register')}
                className={`flex-1 py-5 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeMode === 'register' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Register
                {activeMode === 'register' && <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-indigo-500 rounded-full" />}
              </button>
            </div>

            <div className="p-6 sm:p-10 space-y-6">
              {/* Form Switching Logic */}
              <form onSubmit={activeMode === 'login' ? handleLogin : handleRegister} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-slate-200 outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-700 font-medium text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{activeMode === 'register' ? 'Choose Password' : 'Password'}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      type="password" 
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-slate-200 outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-700 font-medium font-mono text-sm"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold text-center animate-shake">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className={`w-full py-4 text-white rounded-2xl font-black text-xs tracking-widest uppercase transition-all shadow-xl flex items-center justify-center gap-2 group bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/10 disabled:opacity-50`}
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />}
                  {activeMode === 'login' ? 'Enter Workspace' : 'Launch My Account'}
                </button>

                <div className="text-center pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setActiveMode(activeMode === 'login' ? 'register' : 'login');
                      setError('');
                    }}
                    className="text-slate-500 hover:text-indigo-400 text-[10px] font-bold uppercase tracking-widest mt-1 transition-colors"
                  >
                    {activeMode === 'login' ? "New to BritSync? Create account" : "Have an account? Sign in here"}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Footer Tip */}
            <div className="p-6 bg-white/[0.01] border-t border-white/5 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              <p className="text-[9px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest">
                AES-256 Military-grade Encryption Active
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
