import React, { useState, useEffect, Component } from 'react';
import type { ReactNode } from 'react';
import { Auth } from './components/Auth/Auth';
import { ResetPassword } from './components/Auth/ResetPassword';
import { Layout } from './components/Layout/Layout';
import { useSession, signOut } from './lib/auth-client';
import { ProfileService, BusinessProfile } from './lib/profiles';
import { TeamService } from './lib/team';
import { MemoryService } from './lib/memory';


import { Bot } from 'lucide-react';

// Lazy-load components
const Chatbot = React.lazy(() => import('./components/Chat/Chatbot').then(m => ({ default: m.Chatbot })));
const ProfileView = React.lazy(() => import('./components/Profile/ProfileView').then(m => ({ default: m.ProfileView })));
const TeamPanel = React.lazy(() => import('./components/Team/TeamPanel').then(m => ({ default: m.TeamPanel })));
const FinanceDashboard = React.lazy(() => import('./components/Finance/FinanceDashboard').then(m => ({ default: m.FinanceDashboard })));
const AdminPanel = React.lazy(() => import('./components/Admin/AdminPanel').then(m => ({ default: m.AdminPanel })));

// Error boundary
class ErrorBoundary extends Component<{ children: ReactNode; name: string }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: '' };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 glass-card border-rose-500/30 m-4 flex flex-col items-center text-center">
          <h2 className="text-rose-400 font-bold text-xl mb-4 grad-text">Intelligence Engine Offline</h2>
          <p className="text-slate-400 text-sm font-mono bg-black/40 p-4 rounded-xl mb-6 max-w-lg">{this.state.error}</p>
          <button onClick={() => window.location.reload()} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20">Re-Initialize Core</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Spinner = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="relative">
       <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-full animate-pulse" />
       <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-indigo-500 border-r-2 border-r-transparent relative z-10"></div>
    </div>
  </div>
);

function App() {
  // Route: /reset-password is public — render it before any session gating
  // so users clicking the email link (likely logged out) can actually reset.
  if (typeof window !== 'undefined' && window.location.pathname === '/reset-password') {
    return <ResetPassword />;
  }

  const { data: session, isPending: loading } = useSession();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('assistant');
  const [timedOut, setTimedOut] = useState(false);

  // 1. Initial Handshake Timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) setTimedOut(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [loading]);

  // 2. Profile Sync Logic - FIXES THE LOOP
  useEffect(() => {
    if (session?.user) {
      const uid = session.user.id;
      // Better-Auth may expose the email under `email`, `emailAddress`, or
      // nested on `user.email`. Fall back to all known shapes so the moderator
      // detection (which keys off email) works regardless of session version.
      const u: any = session.user;
      const email =
        u.email ||
        u.emailAddress ||
        u.primaryEmail ||
        u.user?.email ||
        (session as any).email ||
        null;
      // Registered display name — set during signup via signUp.email({name}).
      // Fall back to the email handle so existing users (pre-name feature) still
      // see something sensible.
      const displayName: string =
        (typeof u.name === 'string' && u.name.trim()) ||
        (typeof u.displayName === 'string' && u.displayName.trim()) ||
        (typeof u.fullName === 'string' && u.fullName.trim()) ||
        (email ? email.split('@')[0] : 'My Business');

      // Push identity into TeamService so sync callers (TeamService._uid,
      // TeamPanel, Chatbot) always resolve the current user. Also warms
      // team context + moderator memory so member chats get fresh directives.
      TeamService.setCurrentIdentity(uid, email);
      TeamService.getMyTeam(uid).then(ctx => {
        if (ctx?.team?.id) MemoryService.syncFromTeam(ctx.team.id).catch(() => {});
      }).catch(() => {});

      const localKey = `britsync_profile_v2_${uid}`;
      const cached = localStorage.getItem(localKey);
      
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setProfile(new BusinessProfile(parsed));
          setOnboarded(true);
        } catch { /* ignore */ }
      }

      // Auto-profile: no onboarding form. If the user has saved profile data,
      // load it; otherwise auto-create a minimal blank profile derived from
      // their email so dependent code (Finance, Team, memory) keeps working.
      // Users can edit business details from the Profile tab when they want
      // personalized AI replies.
      ProfileService.getLatestProfile(uid).then(existingProfile => {
        if (existingProfile && existingProfile.businessName && existingProfile.businessName !== 'BritSync Partner') {
          localStorage.setItem(localKey, JSON.stringify(existingProfile));
          setProfile(existingProfile);
        } else {
          const blank = new BusinessProfile({
            businessName: displayName,
            industry: '',
            audience: '',
            revenueGoal: '',
            userId: uid,
          });
          localStorage.setItem(localKey, JSON.stringify(blank));
          setProfile(blank);
          // Best-effort persist so Finance / Team queries resolve.
          ProfileService.saveProfile(blank, uid).catch(() => {});
        }
        setOnboarded(true);
      }).catch((err) => {
        console.error("Profile Fetch Error:", err);
        // Even on failure, keep the user out of the onboarding form.
        const blank = new BusinessProfile({
          businessName: displayName,
          userId: uid,
        });
        setProfile(blank);
        setOnboarded(true);
      });
    } else if (!loading) {
      setOnboarded(null);
    }
  }, [session, loading]);

  const handleSignOut = async () => {
    if (session?.user?.id) {
       localStorage.removeItem(`britsync_profile_v2_${session.user.id}`);
    }
    TeamService.setCurrentIdentity(null, null);
    await signOut();
    setProfile(null);
    setOnboarded(false);
    localStorage.removeItem('britc_chat_sessions');
    localStorage.removeItem('britc_active_session');
    window.location.reload();
  };

  const renderView = () => {
    switch (activeTab) {
      case 'team':
        return <TeamPanel profile={profile} userId={session?.user?.id || null} />;
      case 'finance':
        return <FinanceDashboard profile={profile} />;
      case 'profile':
        return <ProfileView profile={profile} onSignOut={handleSignOut} />;
      case 'admin':
        return <AdminPanel />;
      case 'assistant':
      default:
        return <Chatbot profile={profile} onSignOut={handleSignOut} />;
    }
  };

  // ─── Render Stages ───

  if (loading || (session && onboarded === null)) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_70%)]" />
        <div className="text-center relative z-10 animate-in fade-in duration-1000">
          {!timedOut ? (
            <div className="space-y-8">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
                <div className="animate-spin rounded-full h-24 w-24 border-t-2 border-indigo-500 border-r-2 border-r-transparent relative z-10 shadow-[0_0_30px_rgba(99,102,241,0.3)]"></div>
              </div>
              <div className="space-y-2">
                <p className="grad-text text-lg font-black tracking-widest uppercase">BRITSYNC</p>
                <p className="text-slate-500 font-bold text-[10px] tracking-[0.4em] uppercase animate-pulse">Syncing Neural Net</p>
              </div>
            </div>
          ) : (
            <div className="glass-card border-rose-500/20 p-10 max-w-md shadow-2xl">
              <div className="w-16 h-16 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-rose-400 border border-rose-500/20">
                 <Bot size={32} />
              </div>
              <h2 className="text-white font-bold text-2xl mb-2">Connection Interrupted</h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">The BritSync engine couldn't establish a handshake with the backend server. Please verify your connection.</p>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
              >
                Attempt Force-Sync
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth onAuthenticated={() => {}} onStartOnboarding={() => { /* onboarding disabled — user goes straight to Chat */ }} />;
  }
  // Onboarding form removed — new users auto-get a blank profile and land in Chat.

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} onSignOut={handleSignOut} profile={profile}>
      <React.Suspense fallback={<Spinner />}>
        <ErrorBoundary name={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}>
          <div className="h-full w-full flex flex-col">
            {renderView()}
          </div>
        </ErrorBoundary>
      </React.Suspense>
    </Layout>
  );
}

export default App;
