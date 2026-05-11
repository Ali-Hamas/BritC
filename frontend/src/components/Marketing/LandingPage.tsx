import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Globe,
  Users,
  ArrowRight,
  CheckCircle2,
  Zap,
  BarChart3,
  Search,
} from 'lucide-react';
import { getApiUrl } from '../../lib/api-config';

interface LandingPageProps {
  onGetStarted: (intent?: 'free' | 'enterprise') => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
  const [seats, setSeats] = useState<{ taken: number; cap: number; remaining: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(getApiUrl('/seats'))
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled && data) setSeats(data); })
      .catch(() => { /* keep null → fall back to default copy */ });
    return () => { cancelled = true; };
  }, []);

  const remaining = seats?.remaining ?? 1500;
  const cap = seats?.cap ?? 1500;
  const taken = seats?.taken ?? 0;
  const pctTaken = Math.min(100, Math.round((taken / cap) * 100));

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600/10 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-24 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl overflow-hidden shadow-xl shadow-blue-500/10 border border-slate-100 shrink-0">
              <img src="/britsee-logo.jpg" alt="Britsync Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-lg sm:text-2xl font-black tracking-tighter uppercase">BRITSYNC</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-8 shrink-0">
            <button
              onClick={onLogin}
              className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors px-3 py-2"
            >
              Sign In
            </button>
            <button
              onClick={() => onGetStarted('enterprise')}
              className="bg-blue-600 text-white px-5 sm:px-8 py-3 sm:py-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95 whitespace-nowrap"
            >
              <span className="sm:hidden">Deploy</span>
              <span className="hidden sm:inline">Deploy Enterprise Unit</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 sm:pt-48 md:pt-56 pb-20 sm:pb-32 md:pb-40 px-4 sm:px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.08),transparent_70%)] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 mb-8 sm:mb-12 shadow-sm"
          >
            <div className="flex items-center gap-1">
               <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
               <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse delay-75" />
            </div>
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] font-black text-slate-600 truncate">Limited release: {remaining.toLocaleString()} Seats Remaining</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl sm:text-7xl md:text-9xl font-black tracking-tight leading-[0.9] mb-8 sm:mb-12 text-slate-900"
          >
            Autonomous <br className="hidden md:block" />
            <span className="text-blue-600">Growth Partner.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg sm:text-2xl text-slate-500 font-medium max-w-3xl mx-auto mb-12 sm:mb-16 leading-relaxed"
          >
            For digital agencies and elite operators. Britsync AI unifies lead generation, market intelligence, and team execution into one secure, premium workspace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
          >
            <button
              onClick={() => onGetStarted('enterprise')}
              className="w-full sm:w-auto px-10 py-5 rounded-[24px] bg-blue-600 text-white font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-700 shadow-2xl shadow-blue-600/30 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              Start Enterprise Deployment
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => onGetStarted('free')}
              className="w-full sm:w-auto px-10 py-5 rounded-[24px] bg-white border-2 border-slate-200 text-slate-700 font-black text-sm uppercase tracking-[0.2em] hover:bg-slate-50 transition-all active:scale-95"
            >
              Initialize Standard Unit
            </button>
          </motion.div>

          {/* Seat availability bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="max-w-md mx-auto mt-16 sm:mt-24 space-y-3"
          >
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>Network Capacity</span>
              <span>{pctTaken}% Utilised</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pctTaken}%` }}
                transition={{ duration: 2, delay: 1.2, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-600 via-red-600 to-orange-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Automated load balancing active across UK regions.</p>
          </motion.div>
        </div>
      </section>

      {/* Featured Capabilities */}
      <section className="py-24 sm:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-20 sm:mb-32">
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-600 mb-4">Unified Strategic Core</h2>
            <h3 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight">The platform for dominance.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10">
            {[
              {
                icon: Search,
                color: 'text-blue-600',
                bg: 'bg-blue-50 border-blue-100',
                title: 'Lead Alpha Hunter',
                desc: 'Autonomous discovery of high-value prospects across LinkedIn, YouTube, and the wider web with high-tier scraper units.'
              },
              {
                icon: BarChart3,
                color: 'text-red-600',
                bg: 'bg-red-50 border-red-100',
                title: 'Finance Intelligence',
                desc: 'Deterministic ledger analytics augmented by neural narratives. Predict revenue acceleration and track growth metrics in real-time.'
              },
              {
                icon: Globe,
                color: 'text-orange-500',
                bg: 'bg-orange-50 border-orange-100',
                title: 'Market Signal Vector',
                desc: 'Live financial news ingestion from global hubs. Stay ahead of market shifts with AI-summarised executive reports.'
              },
              {
                icon: Users,
                color: 'text-blue-700',
                bg: 'bg-blue-100 border-blue-200',
                title: 'Strategic Alignment',
                desc: 'Shared team memory clusters. Your AI teammate learns your agency unique DNA to guide every member interaction.'
              },
              {
                icon: Zap,
                color: 'text-orange-600',
                bg: 'bg-orange-100 border-orange-200',
                title: 'Agentic Outreach',
                desc: 'Autonomous email dispatch and browser-based engagement. From prospect identification to booking in one unified flow.'
              },
              {
                icon: Shield,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50 border-emerald-100',
                title: 'Encrypted Integrity',
                desc: 'Bank-grade security protocols. Your strategic advantage is protected by session-cookie auth and private database shards.'
              }
            ].map((feat, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -8 }}
                className="p-8 sm:p-10 rounded-[32px] bg-white border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-blue-600/5 hover:border-blue-300 transition-all group"
              >
                <div className={`w-14 h-14 rounded-2xl ${feat.bg} flex items-center justify-center mb-8 border shadow-sm group-hover:scale-110 transition-transform`}>
                  <feat.icon className={feat.color} size={28} />
                </div>
                <h4 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tight">{feat.title}</h4>
                <p className="text-slate-500 font-medium leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / Tiers */}
      <section className="py-24 sm:py-32 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 sm:mb-24">
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-red-600 mb-4">Deployment Options</h2>
            <h3 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Scale your agency unit.</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free */}
            <div className="p-8 sm:p-12 rounded-[40px] bg-white border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-all">
              <div className="mb-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">Standard Protocols</span>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-5xl font-black text-slate-900">£0</span>
                  <span className="text-slate-400 font-bold uppercase tracking-widest">/mo</span>
                </div>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                {[
                  '1 Team Workspace cluster',
                  'Basic AI Assistant unit',
                  'Standard Intelligence sync',
                  'Community knowledge base'
                ].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm font-bold text-slate-600 uppercase tracking-tight">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onGetStarted('free')}
                className="w-full py-5 rounded-2xl border-2 border-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
              >
                Initialise Unit
              </button>
            </div>

            {/* Enterprise */}
            <div className="p-8 sm:p-12 rounded-[40px] bg-white border-4 border-blue-600 shadow-2xl shadow-blue-600/10 flex flex-col relative scale-[1.02] z-10">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-600/30">
                Recommended Command
              </div>
              <div className="mb-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">Strategic Dominion</span>
                <div className="flex items-baseline gap-1 mt-4">
                  <span className="text-5xl font-black text-slate-900">£449</span>
                  <span className="text-slate-400 font-bold uppercase tracking-widest">/mo</span>
                </div>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                {[
                  'Unlimited Team Clusters',
                  'All Autonomous Agent skills',
                  'Finance Alpha Intelligence',
                  '64 GB Secure Storage Node',
                  'Lead Hunter + Browser Units',
                  'Priority Command Support'
                ].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm font-black text-slate-900 uppercase tracking-tight">
                    <CheckCircle2 size={18} className="text-blue-600 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onGetStarted('enterprise')}
                className="w-full py-5 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 active:scale-95"
              >
                Acquire Full Command
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 sm:gap-16 mb-20">
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-slate-100">
                  <img src="/britsee-logo.jpg" alt="Britsync Logo" className="w-full h-full object-cover" />
                </div>
                <span className="text-xl font-black tracking-tight uppercase">BRITSYNC AI</span>
              </div>
              <p className="text-slate-500 font-medium max-w-sm leading-relaxed uppercase text-xs tracking-wider">
                Elite autonomous team members for high-performance UK agencies. Deploy strategy at the speed of thought.
              </p>
              <div className="flex items-center gap-4 text-slate-400">
                <Globe size={18} />
                <Shield size={18} />
                <Users size={18} />
              </div>
            </div>
            <div>
              <h4 className="font-black text-slate-900 uppercase tracking-widest text-[10px] mb-6">Operations</h4>
              <ul className="space-y-4 text-xs font-bold text-slate-500 uppercase tracking-tight">
                <li><button onClick={onLogin} className="hover:text-blue-600 transition-colors">Unit Console</button></li>
                <li><button onClick={() => onGetStarted('enterprise')} className="hover:text-blue-600 transition-colors">Apply for Access</button></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Intelligence Hub</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-slate-900 uppercase tracking-widest text-[10px] mb-6">Identity</h4>
              <ul className="space-y-4 text-xs font-bold text-slate-500 uppercase tracking-tight">
                <li><a href="/privacy.html" className="hover:text-blue-600 transition-colors">Protocol Privacy</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Term Shards</a></li>
                <li><a href="mailto:info@britsyncai.com" className="hover:text-blue-600 transition-colors">Command Center</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-10 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-6">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
              © 2026 BRITSYNC STRATEGIC UNITS. ALL VECTORS PROTECTED.
            </p>
            <div className="flex items-center gap-6 opacity-30 grayscale">
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" alt="Stripe" className="h-4" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
