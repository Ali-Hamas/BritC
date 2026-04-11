import React, { useState, useEffect, Component } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import { ProfileService, BusinessProfile } from './lib/profiles';
import { Auth } from './components/Auth/Auth';

// Lazy-load views to prevent one broken import crashing everything
const FinanceDashboard = React.lazy(() => import('./components/Finance/FinanceDashboard').then(m => ({ default: m.FinanceDashboard })));
const Chatbot = React.lazy(() => import('./components/Chat/Chatbot').then(m => ({ default: m.Chatbot })));
const ChatWidget = React.lazy(() => import('./components/Chat/ChatWidget').then(m => ({ default: m.ChatWidget })));
const Onboarding = React.lazy(() => import('./components/Profile/Onboarding').then(m => ({ default: m.Onboarding })));
const LeadHunterView = React.lazy(() => import('./components/Marketing/LeadHunterView').then(m => ({ default: m.LeadHunterView })));
const SenderView = React.lazy(() => import('./components/Marketing/SenderView').then(m => ({ default: m.SenderView })));
const OperationsView = React.lazy(() => import('./components/Operations/OperationsView'));
const Settings = React.lazy(() => import('./components/Settings/Settings'));
const IntelligenceView = React.lazy(() => import('./components/Intelligence/IntelligenceView').then(m => ({ default: m.IntelligenceView })));

// Error boundary to show error instead of blank screen
class ErrorBoundary extends Component<{ children: ReactNode; name: string }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: '' };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-rose-900/20 border border-rose-500/30 rounded-2xl m-4">
          <h2 className="text-rose-400 font-bold text-lg mb-2">⚠️ Component Error: {this.props.name}</h2>
          <p className="text-slate-400 text-sm font-mono">{this.state.error}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const Spinner = () => (
  <div className="flex items-center justify-center p-16">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already "logged in" locally
    const authStatus = localStorage.getItem('britsee_auth_session');
    if (authStatus === 'active') {
      ProfileService.getLatestProfile()
        .then(savedProfile => {
          if (savedProfile) {
            setProfile(savedProfile);
            setOnboarded(true);
            setIsAuthenticated(true);
          }
        })
        .catch(err => console.error('Profile load error:', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuthenticated = (p: any) => {
    setProfile(p);
    setOnboarded(true);
    setIsAuthenticated(true);
    localStorage.setItem('britsee_auth_session', 'active');
  };

  const handleOnboardingComplete = (newProfile: any) => {
    const p = new BusinessProfile(newProfile);
    ProfileService.saveProfile(p).catch(console.warn);
    setProfile(p);
    setOnboarded(true);
    setIsAuthenticated(true);
    setIsNewUser(false);
    localStorage.setItem('britsee_auth_session', 'active');
  };

  const handleSignOut = () => {
    localStorage.removeItem('britsee_auth_session');
    setIsAuthenticated(false);
    setOnboarded(false);
    setProfile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Loading Britsee...</p>
        </div>
      </div>
    );
  }

  // Auth Layer First
  if (!isAuthenticated && !isNewUser) {
    return (
      <React.Suspense fallback={<Spinner />}>
        <ErrorBoundary name="Auth">
          <Auth 
            onAuthenticated={handleAuthenticated} 
            onStartOnboarding={() => {
              setLoading(true);
              setTimeout(() => {
                setIsNewUser(true);
                setLoading(false);
              }, 800);
            }} 
          />
        </ErrorBoundary>
      </React.Suspense>
    );
  }

  // Onboarding Second (Only for new workspace creators)
  if (isNewUser && !onboarded) {
    return (
      <React.Suspense fallback={<Spinner />}>
        <ErrorBoundary name="Onboarding">
          <Onboarding onComplete={handleOnboardingComplete} />
        </ErrorBoundary>
      </React.Suspense>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden">
      <ErrorBoundary name="Sidebar">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} onSignOut={handleSignOut} />
      </ErrorBoundary>

      <main className="flex-1 flex flex-col overflow-hidden">
        <ErrorBoundary name="Header">
          <Header profile={profile} />
        </ErrorBoundary>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto pb-24">
            <React.Suspense fallback={<Spinner />}>
              {activeTab === 'dashboard' && (
                <ErrorBoundary name="IntelligenceView">
                  <IntelligenceView profile={profile} />
                </ErrorBoundary>
              )}
              {activeTab === 'assistant' && (
                <div className="h-[calc(100vh-8rem)]">
                  <ErrorBoundary name="Chatbot">
                    <Chatbot profile={profile} />
                  </ErrorBoundary>
                </div>
              )}
              {activeTab === 'finance' && (
                <ErrorBoundary name="FinanceDashboard">
                  <FinanceDashboard profile={profile} />
                </ErrorBoundary>
              )}
              {activeTab === 'leadhunter' && (
                <ErrorBoundary name="LeadHunterView">
                  <LeadHunterView profile={profile} />
                </ErrorBoundary>
              )}
              {activeTab === 'sender' && (
                <ErrorBoundary name="SenderView">
                  <SenderView profile={profile} />
                </ErrorBoundary>
              )}
              {activeTab === 'operations' && (
                <ErrorBoundary name="OperationsView">
                  <OperationsView profile={profile} />
                </ErrorBoundary>
              )}
              {activeTab === 'settings' && (
                <ErrorBoundary name="Settings">
                  <Settings />
                </ErrorBoundary>
              )}
            </React.Suspense>
          </div>
        </div>
      </main>
      <React.Suspense fallback={null}>
        <ChatWidget />
      </React.Suspense>
    </div>
  );
}

export default App;
