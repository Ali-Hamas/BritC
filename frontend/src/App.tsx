import React, { useState, useEffect, Component } from 'react';
import type { ReactNode } from 'react';
import { Auth } from './components/Auth/Auth';
import { Layout } from './components/Layout/Layout';
import { useSession, signOut } from './lib/auth-client';

// Lazy-load components
const Chatbot = React.lazy(() => import('./components/Chat/Chatbot').then(m => ({ default: m.Chatbot })));
const Onboarding = React.lazy(() => import('./components/Profile/Onboarding').then(m => ({ default: m.Onboarding })));
const ProfileView = React.lazy(() => import('./components/Profile/ProfileView').then(m => ({ default: m.ProfileView })));

// Error boundary
class ErrorBoundary extends Component<{ children: ReactNode; name: string }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: '' };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-rose-900/20 border border-rose-500/30 rounded-2xl m-4">
          <h2 className="text-rose-400 font-bold text-lg mb-2">⚠️ Error: {this.props.name}</h2>
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
  const { data: session, isPending: loading } = useSession();
  const [profile, setProfile] = useState<any | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [activeTab, setActiveTab] = useState('assistant');

  useEffect(() => {
    if (session?.user) {
      // Check if this user already has a profile
      ProfileService.getLatestProfile(session.user.id).then(existingProfile => {
        if (existingProfile) {
          setProfile(existingProfile);
          setOnboarded(true);
        } else {
          setProfile(session.user);
          setOnboarded(false);
        }
      });
    }
  }, [session]);

  const handleSignOut = async () => {
    await signOut();
    setProfile(null);
    setOnboarded(false);
  };

  const renderView = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileView profile={profile} onSignOut={handleSignOut} />;
      case 'assistant':
      default:
        return <Chatbot profile={profile} onSignOut={handleSignOut} />;
    }
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

  // Handle Authentication Flow
  if (!session) {
    return (
      <Auth 
        onAuthenticated={() => {}} 
        onStartOnboarding={() => setOnboarded(false)} 
      />
    );
  }

  // Handle Onboarding Flow
  if (isAuthenticated && !onboarded) {
    return (
      <React.Suspense fallback={<Spinner />}>
        <Onboarding onComplete={handleOnboardingComplete} />
      </React.Suspense>
    );
  }
  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} onSignOut={handleSignOut}>
      <React.Suspense fallback={<Spinner />}>
        <ErrorBoundary name={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}>
          {renderView()}
        </ErrorBoundary>
      </React.Suspense>
    </Layout>
  );
}

export default App;
