import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout/Layout';
import { Chatbot } from './components/Chat/Chatbot';
import { FinanceDashboard } from './components/Finance/FinanceDashboard';
import { IntelligenceView } from './components/Intelligence/IntelligenceView';
import { ProfileView } from './components/Profile/ProfileView';
import { TeamPanel } from './components/Team/TeamPanel';
import { AdminPanel } from './components/Admin/AdminPanel';
import { NewsFeed } from './components/News/NewsFeed';
import { useSession, signOut } from './lib/auth-client';
import { Auth } from './components/Auth/Auth';
import { BusinessProfile } from './lib/profiles';
import { getMyApprovalStatus, checkSessionStale } from './lib/approval';
import { ReferralRequiredScreen } from './components/Auth/ReferralRequiredScreen';
import { RejectedScreen } from './components/Auth/RejectedScreen';
import { getSubscriptionStatus, type SubscriptionStatus } from './lib/subscription';
import { Bot, AlertTriangle } from 'lucide-react';
import { LandingPage } from './components/Marketing/LandingPage';

// ─── Shared UI Components ───────────────────────────────────────────────────

const Spinner = () => (
  <div className="flex flex-col items-center justify-center p-12 gap-5 font-sans">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full animate-pulse" />
      <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin shadow-sm relative z-10" />
    </div>
    <div className="text-center">
      <p className="text-slate-900 font-black text-xs uppercase tracking-[0.2em]">Neural Net Syncing</p>
      <div className="flex gap-1 justify-center mt-2">
        {[1,2,3].map(i => (
          <div key={i} className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    </div>
  </div>
);

class ErrorBoundary extends React.Component<{ children: React.ReactNode; name: string }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 sm:p-12 flex items-center justify-center h-full bg-slate-50 font-sans">
          <div className="bg-white border-2 border-red-100 rounded-[32px] p-8 sm:p-12 text-center max-w-md shadow-2xl shadow-red-500/5 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-red-50 border border-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-600 shadow-sm">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-3">Module Runtime Fault</h2>
            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
              The <span className="font-black text-red-600">{this.props.name}</span> module encountered a critical execution exception.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
            >
              Re-initialize Kernel
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Main Application ──────────────────────────────────────────────────────────

function App() {
  const { data: session, isPending } = useSession();
  const [activeTab, setActiveTab] = useState('assistant');
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [approval, setApproval] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isAuthView, setIsAuthView] = useState(false);
  const [authIntent, setAuthIntent] = useState<'free' | 'enterprise' | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setProfile(null);
    setApproval(null);
    setActiveTab('assistant');
    setIsAuthView(false);
    setAuthIntent(null);
  };

  useEffect(() => {
    const timer = setTimeout(() => { if (isPending) setTimedOut(true); }, 10000);
    return () => clearTimeout(timer);
  }, [isPending]);

  useEffect(() => {
    if (session?.user) {
      const u: any = session.user;
      const uid = u.id || u.sub;
      const displayName = u.name || u.email?.split('@')[0] || 'User';

      (async () => {
        try {
          const status = await getMyApprovalStatus();
          if ((status as string) === 'stale') { await checkSessionStale(); window.location.reload(); return; }
          setApproval(status);

          if (status === 'approved') {
            const localKey = `britsync_profile_${uid}`;
            const cached = localStorage.getItem(localKey);
            if (cached) {
              const existingProfile = JSON.parse(cached);
              existingProfile.userId = uid;
              localStorage.setItem(localKey, JSON.stringify(existingProfile));
              setProfile(existingProfile);
            } else {
              const blank = new BusinessProfile({
                businessName: displayName,
                industry: '',
                audience: '',
                revenueGoal: '',
              });
              blank.userId = uid;
              localStorage.setItem(localKey, JSON.stringify(blank));
              setProfile(blank);
            }
            const sub = await getSubscriptionStatus();
            setSubscription(sub);
          }
        } catch (err) {
          console.error('Core Sync Failure:', err);
        }
      })();
    }
  }, [session]);

  const renderView = () => {
    const p = { profile, subscription, onSignOut: handleSignOut };
    const isFree = !subscription || subscription.plan === 'free';
    const enterpriseOnly = ['finance', 'intelligence', 'team', 'news'];
    const safeTab = isFree && enterpriseOnly.includes(activeTab) ? 'assistant' : activeTab;
    switch (safeTab) {
      case 'assistant': return <Chatbot profile={profile} onSignOut={handleSignOut} />;
      case 'finance': return <FinanceDashboard profile={profile} />;
      case 'intelligence': return <IntelligenceView profile={profile} />;
      case 'team': return <TeamPanel profile={profile} userId={session?.user?.id} plan={subscription?.plan} />;
      case 'news': return <NewsFeed />;
      case 'profile': return <ProfileView {...p} />;
      case 'admin': return <AdminPanel userEmail={session?.user?.email} />;
      default: return <Chatbot profile={profile} onSignOut={handleSignOut} />;
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.05),transparent_70%)]" />
        <div className="text-center relative z-10 animate-in fade-in duration-1000">
          {!timedOut ? (
            <div className="space-y-8">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
                <div className="w-24 h-24 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin shadow-xl relative z-10" />
              </div>
              <div className="space-y-2">
                <p className="grad-text text-xl font-black tracking-[0.2em] uppercase">BRITSYNC</p>
                <p className="text-slate-400 font-bold text-[10px] tracking-[0.4em] uppercase animate-pulse">Establishing Secure Uplink</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-red-100 p-10 sm:p-12 max-w-md rounded-[40px] shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-red-50 border border-red-100 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-red-600 shadow-sm">
                 <Bot size={40} />
              </div>
              <h2 className="text-slate-900 font-black text-2xl tracking-tight mb-3">Connection Timeout</h2>
              <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed px-4">The core engine is failing to handshake with global services. Please verify your network vector.</p>
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-500/20 active:scale-95"
              >
                Force Re-Sync
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    if (!isAuthView) {
      return (
        <LandingPage 
          onGetStarted={(intent) => {
            setAuthIntent(intent || 'free');
            setIsAuthView(true);
          }} 
          onLogin={() => {
            setAuthIntent(null);
            setIsAuthView(true);
          }} 
        />
      );
    }
    return (
      <Auth
        onAuthenticated={() => {}}
        initialMode={authIntent ? 'register' : 'login'}
        intent={authIntent}
        onBackToHome={() => { setIsAuthView(false); setAuthIntent(null); }}
      />
    );
  }

  if (approval === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.03),transparent_70%)]" />
        <div className="text-center relative z-10 animate-in fade-in duration-1000">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full animate-pulse" />
            <div className="w-20 h-20 border-4 border-white border-t-blue-600 rounded-full animate-spin shadow-lg relative z-10" />
          </div>
          <p className="text-slate-400 font-black text-[10px] tracking-[0.3em] uppercase mt-8 animate-pulse">Verifying Credentials...</p>
        </div>
      </div>
    );
  }

  if (approval === 'referral_required' || approval === 'pending') {
    const u: any = session?.user || {};
    const email = u.email || u.emailAddress || u.primaryEmail || '';
    return <ReferralRequiredScreen email={email} onSignOut={handleSignOut} />;
  }
  if (approval === 'rejected') {
    const u: any = session?.user || {};
    const email = u.email || u.emailAddress || u.primaryEmail || '';
    return <RejectedScreen email={email} onSignOut={handleSignOut} />;
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} onSignOut={handleSignOut} profile={profile} subscription={subscription}>
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
