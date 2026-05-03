import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Globe,
  Users,
  ArrowRight,
  Target,
  Cpu,
  Database,
  CheckCircle2
} from 'lucide-react';
import { getApiUrl } from '../../lib/api-config';

interface LandingPageProps {
  onGetStarted: (intent?: 'free' | 'enterprise') => void;
  onLogin: () => void;
}

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

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
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden shadow-2xl shadow-indigo-500/20 shrink-0">
              <img src="/favicon.png" alt="Britsee Logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-base sm:text-xl font-black tracking-tighter truncate">BRITSEE</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-6 shrink-0">
            <button
              onClick={onLogin}
              className="text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors px-2"
            >
              Sign In
            </button>
            <button
              onClick={() => onGetStarted('enterprise')}
              className="bg-white text-black px-3 sm:px-6 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-sm font-bold hover:bg-slate-200 transition-all active:scale-95 whitespace-nowrap"
            >
              <span className="sm:hidden">Apply</span>
              <span className="hidden sm:inline">Apply for Enterprise</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-40 md:pt-48 pb-16 sm:pb-24 md:pb-32 px-4 sm:px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 border border-white/10 mb-6 sm:mb-8 max-w-full"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em] font-bold text-slate-400 truncate">Limited Release: {remaining.toLocaleString()} Seats Remaining</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tight leading-[1] sm:leading-[0.95] mb-6 sm:mb-8 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent"
          >
            AI-Powered Team Execution. <br className="hidden md:block" />
            Without Noise.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed font-medium"
          >
            Britsee is a controlled AI communication and execution system built for enterprises that demand clarity, alignment, and autonomous growth.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <button
              onClick={() => onGetStarted('enterprise')}
              className="w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-5 bg-white text-black rounded-full font-black text-xs sm:text-sm uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2 group"
            >
              Apply for Enterprise <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onGetStarted('free')}
              className="w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-5 bg-white/5 border border-white/10 text-white rounded-full font-black text-xs sm:text-sm uppercase tracking-wider hover:bg-white/10 transition-all active:scale-95"
            >
              Try Free
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-6 sm:mt-8 text-[10px] sm:text-xs text-slate-600 font-bold tracking-widest uppercase px-4"
          >
            Global allocation: {remaining.toLocaleString()} of {cap.toLocaleString()} seats left
          </motion.p>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-t border-white/5">
        <motion.div
          viewport={{ once: true }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.25em] sm:tracking-[0.3em] text-rose-400 mb-4 sm:mb-6 block">The Problem</span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 sm:mb-8 leading-[1.05]">
            Most Teams Don't Lack Tools.
          </h2>
          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            They suffer from noise, confusion, and scattered execution across too many platforms. Every new tool adds friction instead of removing it.
          </p>
        </motion.div>
      </section>

      {/* Solution */}
      <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
        <motion.div
          viewport={{ once: true }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.25em] sm:tracking-[0.3em] text-emerald-400 mb-4 sm:mb-6 block">The Solution</span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 sm:mb-8 leading-[1.05]">
            Britsee Fixes the Core Problem.
          </h2>
          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Private, structured communication powered by AI — eliminating chaos and keeping teams aligned on a single source of truth.
          </p>
        </motion.div>
      </section>

      {/* Core Memory Tech */}
      <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-y border-white/5 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-5 sm:gap-8">
          <motion.div
            viewport={{ once: true }}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 transition-transform">
              <Database className="text-indigo-400" size={24} />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">LLM Memory</h3>
            <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
              Global intelligence guiding decisions and learning continuously from every interaction within your organization.
            </p>
          </motion.div>

          <motion.div
            viewport={{ once: true }}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center mb-6 sm:mb-8 group-hover:scale-110 transition-transform">
              <Shield className="text-fuchsia-400" size={24} />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Moderator Memory</h3>
            <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
              Controls structure, access, and strategic alignment across the team. Ensures the AI stays on mission.
            </p>
          </motion.div>
        </div>
      </section>

      {/* AI Engines */}
      <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16 md:mb-24">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 sm:mb-8">AI Execution Engines</h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-base sm:text-xl font-medium">
              Four specialized cores designed to handle the heavy lifting of business growth.
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-8"
          >
            {[
              {
                icon: <Target className="text-indigo-400" size={24} />,
                title: "Growth",
                desc: "Lead generation and multi-channel outreach automation."
              },
              {
                icon: <Users className="text-fuchsia-400" size={24} />,
                title: "Operations",
                desc: "CRM, calendar, and private team collaboration tools."
              },
              {
                icon: <Cpu className="text-emerald-400" size={24} />,
                title: "Intelligence",
                desc: "Autonomous AI agents and complex workflow automation."
              },
              {
                icon: <Globe className="text-amber-400" size={24} />,
                title: "Media",
                desc: "High-tier video and professional content generation."
              }
            ].map((skill, i) => (
              <motion.div
                key={i}
                variants={fadeIn}
                className="group p-6 sm:p-10 rounded-3xl sm:rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="mb-6 sm:mb-8 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                  {skill.icon}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{skill.title}</h3>
                <p className="text-sm sm:text-base text-slate-500 leading-relaxed font-medium">{skill.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Scarcity */}
      <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6">
        <motion.div
          viewport={{ once: true }}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="max-w-5xl mx-auto bg-gradient-to-br from-indigo-600/20 to-transparent border border-indigo-500/20 rounded-3xl sm:rounded-[4rem] p-6 sm:p-12 md:p-24 relative overflow-hidden"
        >
          <div className="relative z-10 text-center md:text-left">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 sm:mb-8">Limited Global Access</h2>
            <p className="text-base sm:text-xl text-slate-400 mb-8 sm:mb-12 max-w-2xl font-medium leading-relaxed">
              We are limiting access to {cap.toLocaleString()} enterprise environments worldwide to ensure network stability.
            </p>

            <div className="grid grid-cols-3 gap-4 sm:gap-8 mb-8 sm:mb-10">
              <div>
                <div className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-2">Taken</div>
                <div className="text-2xl sm:text-4xl md:text-5xl font-black text-white tabular-nums">{taken.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[9px] sm:text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 sm:mb-2">Remaining</div>
                <div className="text-2xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent tabular-nums">
                  {remaining.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 sm:mb-2">Cap</div>
                <div className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-400 tabular-nums">{cap.toLocaleString()}</div>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-700"
                style={{ width: `${pctTaken}%` }}
              />
            </div>
            <p className="mt-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-500">
              {pctTaken}% allocated · live count
            </p>
          </div>
        </motion.div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 sm:py-32 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4 leading-[1.05] bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
              Simple, transparent plans.
            </h2>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-medium">
              Start free to try the assistant. Upgrade when you're ready to unlock the full finance suite, lead hunter, and AI commentary.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="p-6 sm:p-10 rounded-3xl sm:rounded-[3rem] bg-white/[0.03] border border-white/5 flex flex-col">
              <h3 className="text-xl sm:text-2xl font-bold mb-1">Basic</h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-6">For solo founders trying Britsync out.</p>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-5xl sm:text-6xl font-black">£0</span>
                <span className="text-base text-slate-500 font-bold">/month</span>
              </div>
              <ul className="space-y-3 sm:space-y-4 mb-10 flex-grow">
                {[
                  '1 team chat (owner only)',
                  'Basic AI assistant',
                  'Profile & business setup',
                  'Live financial news feed',
                  'Personal finance style preference',
                ].map((feat, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-slate-300 font-medium">
                    <CheckCircle2 className="text-slate-500 mt-0.5 shrink-0" size={18} /> {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onGetStarted('free')}
                className="w-full py-4 sm:py-5 rounded-full bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Start Free
              </button>
            </div>

            {/* Enterprise */}
            <div className="p-6 sm:p-10 rounded-3xl sm:rounded-[3rem] bg-gradient-to-br from-indigo-600/15 via-violet-500/5 to-fuchsia-500/10 border border-indigo-500/30 flex flex-col relative shadow-2xl shadow-indigo-500/10">
              <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 px-4 sm:px-6 py-1.5 sm:py-2 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                Recommended
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-1">Enterprise</h3>
              <p className="text-xs sm:text-sm text-indigo-200/70 mb-6">Full power for growing businesses.</p>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-5xl sm:text-6xl font-black">£449</span>
                <span className="text-base text-indigo-200/60 font-bold">/month</span>
              </div>
              <ul className="space-y-3 sm:space-y-4 mb-10 flex-grow">
                {[
                  'Unlimited team chats',
                  'Full AI assistant — all skills',
                  '64 GB file storage',
                  'Finance dashboard with AI commentary',
                  'Lead Hunter (LinkedIn, web, YouTube)',
                  'Browser automation + outreach sender',
                  'Scenario simulator & forecasts',
                  'Auto report emails (weekly + monthly)',
                  'Priority support',
                ].map((feat, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-white font-medium">
                    <CheckCircle2 className="text-indigo-400 mt-0.5 shrink-0" size={18} /> {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onGetStarted('enterprise')}
                className="w-full py-4 sm:py-5 rounded-full bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-2xl shadow-indigo-500/20"
              >
                Apply for Enterprise
              </button>
            </div>
          </div>

          <p className="text-center text-xs sm:text-sm text-slate-500 mt-8 sm:mt-10 font-medium">
            All plans include secure UK hosting · Cancel anytime · No setup fees
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24 md:py-32 px-4 sm:px-6 border-t border-white/5">
        <motion.div
          viewport={{ once: true }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight mb-6 sm:mb-8 leading-[1.05] bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
            This Is Not Another Tool.
          </h2>
          <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto mb-8 sm:mb-12 font-medium leading-relaxed">
            It's a new way to run your company — clear, aligned, and AI-powered. Built for teams that take execution seriously.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => onGetStarted('enterprise')}
              className="w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-5 bg-white text-black rounded-full font-black text-xs sm:text-sm uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2 group"
            >
              Apply for Enterprise <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onGetStarted('free')}
              className="w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-5 bg-white/5 border border-white/10 text-white rounded-full font-black text-xs sm:text-sm uppercase tracking-wider hover:bg-white/10 transition-all active:scale-95"
            >
              Try Free
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 sm:py-16 md:py-24 px-4 sm:px-6 border-t border-white/5 text-center text-slate-600 bg-[#050505]">
        <div className="flex items-center justify-center gap-3 mb-8 sm:mb-12 grayscale opacity-50">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden">
            <img src="/favicon.png" alt="Britsee Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-lg sm:text-2xl font-black tracking-tighter">BRITSEE</span>
        </div>
        <p className="text-[11px] sm:text-sm font-bold tracking-widest uppercase">© 2026 Britsync AI. All rights reserved.</p>
      </footer>
    </div>
  );
};
