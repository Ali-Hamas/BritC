import React, { useState } from 'react';
import { Key, Save, CheckCircle, Users, Link as LinkIcon, Zap, Calendar, Brain } from 'lucide-react';
import { SettingsService } from '../../lib/settings';
import { LeadHunterService } from '../../lib/leadhunter';
import TeamSettings from './TeamSettings';
import MemoryCenter from './MemoryCenter';
import { motion, AnimatePresence } from 'framer-motion';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'team' | 'integrations' | 'brain'>('services');
  const [apiKey, setApiKey] = useState(SettingsService.getLeadHunterApiKey() || '');
  const [leadHunterUrl, setLeadHunterUrl] = useState(SettingsService.getLeadHunterBaseUrl() || 'https://leadhunter.uk');
  const [schedLink, setSchedLink] = useState(SettingsService.getSchedulingLink() || '');
  const [saved, setSaved] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [lhTestStatus, setLhTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [lhTestMsg, setLhTestMsg] = useState('');
  const [groqApiKey, setGroqApiKey] = useState(SettingsService.getGroqApiKey());
  const [groqModel, setGroqModel] = useState(SettingsService.getGroqModel());
  const [globalSystemPrompt, setGlobalSystemPrompt] = useState(SettingsService.getGlobalSystemPrompt());


  const handleSave = () => {
    SettingsService.setLeadHunterApiKey(apiKey);
    SettingsService.setLeadHunterBaseUrl(leadHunterUrl);
    SettingsService.setSchedulingLink(schedLink);
    SettingsService.setGroqApiKey(groqApiKey);
    SettingsService.setGroqModel(groqModel);
    SettingsService.setGlobalSystemPrompt(globalSystemPrompt);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };


  const tabs = [
    { id: 'services', label: 'Services', icon: Key },
    { id: 'brain', label: 'Strategic Brain', icon: Brain },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'integrations', label: 'Integrations', icon: LinkIcon },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Settings</h1>
          <p className="text-slate-400 mt-1">Configure your BritSync environment and team.</p>
        </div>

        <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5 backdrop-blur-sm self-start">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'services' && (
          <motion.div
            key="services"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/40 rounded-2xl border border-white/5 p-6 space-y-8"
          >
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                  <Key size={20} />
                </div>
                <h3 className="font-semibold text-white">LeadHunter.uk Integration</h3>
              </div>

              <div className="space-y-3">
                {/* Base URL */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">LeadHunter Base URL</label>
                  <input
                    type="text"
                    value={leadHunterUrl}
                    onChange={(e) => setLeadHunterUrl(e.target.value)}
                    placeholder="https://leadhunter.uk"
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-slate-300 outline-none focus:border-indigo-500/50 text-sm font-mono"
                  />
                  <p className="text-[11px] text-slate-600">Change if running LeadHunter locally (e.g. http://localhost:3000)</p>
                </div>

                {/* API Key */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">API Key (x-api-key)</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => { setApiKey(e.target.value); setLhTestStatus('idle'); }}
                      placeholder="Enter your LeadHunter External API Key"
                      className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-slate-300 outline-none focus:border-indigo-500/50"
                    />
                    <button
                      onClick={async () => {
                        setLhTestStatus('testing');
                        setLhTestMsg('');
                        // Save the URL first so the service uses the new value
                        SettingsService.setLeadHunterBaseUrl(leadHunterUrl);
                        SettingsService.setLeadHunterApiKey(apiKey);
                        const isValid = await LeadHunterService.testConnection(apiKey);
                        if (isValid) {
                          setLhTestStatus('ok');
                          setLhTestMsg('Connected successfully!');
                        } else {
                          setLhTestStatus('error');
                          setLhTestMsg('Key rejected. Check your LeadHunter External API key or Base URL.');
                        }
                      }}
                      disabled={lhTestStatus === 'testing'}
                      className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {lhTestStatus === 'testing' ? '...' : 'Test'}
                    </button>
                  </div>

                  {/* Inline status — replaces the browser alert() */}
                  {lhTestStatus === 'ok' && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                      <span>✅</span><span>{lhTestMsg}</span>
                    </div>
                  )}
                  {lhTestStatus === 'error' && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                        <span>❌</span><span>{lhTestMsg}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed px-1">
                        Get your External API key from: <span className="text-indigo-400 font-mono">{leadHunterUrl}/settings</span> → API Access section.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-6 pt-6 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <Zap size={20} />
                </div>
                <h3 className="font-semibold text-white">Groq Cloud AI (Ultra-Fast)</h3>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-white">Groq AI Active</p>
                    <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-400/20">
                      CONNECTED
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Fast • Free Tier • Llama 3.3</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Groq API Key</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={groqApiKey}
                        onChange={(e) => setGroqApiKey(e.target.value)}
                        placeholder="Enter Groq API Key (gsk_...)"
                        className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-slate-200 focus:border-emerald-500/50 outline-none transition-all"
                      />
                      <button
                        onClick={async () => {
                          if (!groqApiKey) return alert('Please enter an API key first.');
                          setIsConnecting('groq');
                          try {
                            const { GroqService } = await import('../../lib/groq');
                            await GroqService.chat([{ role: 'user', content: 'test' }], 'llama-3.1-8b-instant', groqApiKey);
                            alert('✅ Groq Connection Successful!');
                          } catch (err: any) {
                            alert(`❌ Connection Failed: ${err.message}`);
                          } finally {
                            setIsConnecting(null);
                          }
                        }}
                        disabled={isConnecting === 'groq'}
                        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        {isConnecting === 'groq' ? '...' : 'Test'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Model</label>
                    <select
                      value={groqModel}
                      onChange={(e) => setGroqModel(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-slate-200 focus:border-emerald-500/50 outline-none transition-all"
                    >
                      <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Best — Recommended)</option>
                      <option value="llama-3.1-8b-instant">Llama 3.1 8B (Fastest)</option>
                      <option value="llama3-70b-8192">Llama 3 70B</option>
                      <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4 pt-6 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
                  <Calendar size={20} />
                </div>
                <h3 className="font-semibold text-white">Scheduling & BritC</h3>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Default Booking Link</label>
                <input
                  type="text"
                  value={schedLink}
                  onChange={(e) => setSchedLink(e.target.value)}
                  placeholder="https://calendly.com/your-business/discovery"
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-slate-200 focus:border-indigo-500/50 outline-none"
                />
              </div>
            </section>

            <section className="pt-6 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Save Changes</h3>
                  <p className="text-sm text-slate-500">Updated settings apply immediately to BritC.</p>
                </div>
                <button
                  onClick={handleSave}
                  className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl font-semibold hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  {saved ? <CheckCircle size={18} /> : <Save size={18} />}
                  {saved ? 'Saved Successfully' : 'Update Configuration'}
                </button>
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'brain' && (
          <motion.div
            key="brain"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <section className="bg-slate-900/40 rounded-2xl border border-white/5 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                  <Brain size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Global Cognitive Identity</h3>
                  <p className="text-xs text-slate-500">Define the core personality and behavioral constraints of BritSee.</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">System Architecture Prompt</label>
                <textarea
                  value={globalSystemPrompt}
                  onChange={(e) => setGlobalSystemPrompt(e.target.value)}
                  placeholder="You are BritSee, an enterprise-grade Cognitive Alignment Engine..."
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-slate-200 focus:border-purple-500/50 outline-none transition-all min-h-[150px] font-mono text-sm leading-relaxed"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-500/30 transition-all border border-purple-500/20"
                  >
                    {saved ? (<CheckCircle size={14} />) : (<Save size={14} />)}
                    {saved ? 'Cognitive State Saved' : 'Apply Identity Changes'}
                  </button>
                </div>
              </div>
            </section>

            <MemoryCenter />
          </motion.div>
        )}

        {activeTab === 'team' && (
          <motion.div
            key="team"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <TeamSettings />
          </motion.div>
        )}

        {activeTab === 'integrations' && (
          <motion.div
            key="integrations"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="bg-slate-900/40 rounded-2xl border border-white/5 p-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400">
                <LinkIcon size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Advanced Integrations</h3>
                <p className="text-slate-400 max-w-sm mt-2">Connect Discord, WhatsApp, and custom webhooks to BritSee Cognitive Engine.</p>
              </div>
              <button className="px-6 py-2 bg-indigo-500 text-white rounded-xl font-bold mt-4 shadow-lg shadow-indigo-500/20">
                Coming Soon
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
