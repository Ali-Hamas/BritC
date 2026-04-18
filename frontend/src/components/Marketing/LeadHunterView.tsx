import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  MapPin,
  Target,
  Play,
  History,
  Activity,
  Download
} from 'lucide-react';
import { LeadHunterService } from '../../lib/leadhunter';
import type { ScraperJob } from '../../lib/leadhunter';
import type { BusinessProfile } from '../../lib/profiles';

interface LeadHunterViewProps {
  profile: BusinessProfile | null;
}

export const LeadHunterView: React.FC<LeadHunterViewProps> = ({ profile }) => {
  const [activeJobs, setActiveJobs] = useState<ScraperJob[]>([]);
  const [history, setHistory] = useState<ScraperJob[]>([]);
  const [config, setConfig] = useState({
    country: 'USA',
    cities: '',
    niches: ''
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countries, setCountries] = useState<string[]>(['USA', 'United Kingdom', 'Canada']);
  const [isHistoryOffline, setIsHistoryOffline] = useState(false);

  const isDemo = !LeadHunterService.getApiKey();

  const loadCountries = useCallback(async () => {
    if (isDemo) return;
    try {
      const data = await LeadHunterService.getCountries();
      setCountries(data);
    } catch (e: unknown) {
       console.warn('LeadHunter: Failed to load countries', e);
    }
  }, [isDemo]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await LeadHunterService.getHistory();
      setHistory(data);
      setIsHistoryOffline(false);
    } catch (e: unknown) { 
      setIsHistoryOffline(true);
      console.warn('LeadHunter: Failed to load history', e);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    loadCountries();
  }, [loadHistory, loadCountries]);

  const handleDownload = async (job: ScraperJob) => {
    if (job.jobId.startsWith('demo_')) {
      const cities = config.cities.split(',').map(c => c.trim()).filter(Boolean);
      const niches = config.niches.split(',').map(n => n.trim()).filter(Boolean);
      
      let demoContent = "Company Name,Email,Niche,City\n";
      cities.forEach(c => {
        niches.forEach(n => {
          demoContent += `Demo ${n},info@${n.toLowerCase().replace(/\s+/g, '')}.co.uk,${n},${c}\n`;
        });
      });
      demoContent += "...and many more leads.";
      
      const blob = new Blob([demoContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `demo_leads_${job.jobId}.csv`;
      a.click();
      return;
    }

    try {
      const content = await LeadHunterService.downloadLeads(job.jobId);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_${job.jobId}.txt`;
      a.click();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to download leads.';
      setErrorMessage(msg);
    }
  };

  const handleStartJob = async () => {
    if (!config.cities.trim() || !config.niches.trim()) {
      setErrorMessage('Please enter at least one city and one niche.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const cities = config.cities.split(',').map(c => c.trim()).filter(Boolean);
      const niches = config.niches.split(',').map(n => n.trim()).filter(Boolean);

      if (isDemo) {
        // Simulated Demo Job
        const demoResult: ScraperJob = {
          jobId: 'demo_' + Date.now(),
          status: 'running',
          leadsFound: 0
        };
        setActiveJobs(prev => [...prev, demoResult]);
        
        // Auto-complete demo job after 10 seconds
        setTimeout(() => {
          setActiveJobs(prev => prev.filter(j => j.jobId !== demoResult.jobId));
          setHistory(prev => [{ ...demoResult, status: 'completed', leadsFound: 42 }, ...prev]);
        }, 10000);
      } else {
        const result = await LeadHunterService.startJob({
          country: config.country,
          cities,
          niches
        });
        setActiveJobs(prev => [...prev, result]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to start scraping job.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <header>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Lead Hunter</h1>
        <p className="text-slate-400 mt-1 text-sm lg:text-base">Precision business discovery powered by LeadHunter.uk</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 w-fit">
                <Search size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">New Prospecting Job</h3>
                {isDemo && (
                   <p className="text-[10px] text-amber-500/60 italic">Add API key in Settings for real leads</p>
                )}
              </div>
              {isDemo && (
                <span className="sm:ml-auto text-[10px] font-bold bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg uppercase tracking-wider w-fit">
                  Demo Mode
                </span>
              )}
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-3">
                <Activity size={14} />
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Target Country</label>
                <select
                  value={config.country}
                  onChange={(e) => setConfig({ ...config, country: e.target.value })}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-slate-300 outline-none focus:border-indigo-500/40 transition-all"
                >
                  <option value="">Select Country</option>
                  {countries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Cities (Comma Separated)</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    type="text"
                    value={config.cities}
                    onChange={(e) => setConfig({ ...config, cities: e.target.value })}
                    placeholder="e.g. London, Manchester"
                    className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-slate-300 outline-none focus:border-indigo-500/40 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Business Niches / Keywords</label>
              <div className="relative">
                <Target size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="text"
                  value={config.niches}
                  onChange={(e) => setConfig({ ...config, niches: e.target.value })}
                  placeholder="e.g. Coffee Shops, Tech Agencies"
                  className="w-full bg-black/40 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-slate-300 outline-none focus:border-indigo-500/40 transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleStartJob}
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 hover:scale-[1.01] active:scale-95"
            >
              {loading ? <Activity size={20} className="animate-spin" /> : <Play size={20} />}
              Launch Scraper
            </button>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                <History size={20} />
              </div>
              <h3 className="font-semibold text-white">Scraping History</h3>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm italic">
                {isHistoryOffline ? (
                  <div className="flex flex-col items-center gap-2">
                    <Activity size={24} className="opacity-20 mb-2" />
                    <p>LeadHunter service is currently unreachable.</p>
                    <p className="text-[10px] uppercase font-bold text-amber-500/50">History sync paused</p>
                  </div>
                ) : "No historical data found."}
              </div>
            ) : (
              <div className="space-y-4">
                {history.map(job => (
                  <div key={job.jobId} className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-wrap gap-4 justify-between items-center group hover:bg-white/[0.08] transition-all">
                    <div>
                      <p className="text-white font-medium text-sm">Job #{job.jobId.substring(0, 8)}</p>
                      <p className="text-slate-500 text-xs">Leads: {job.leadsFound || 0}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-auto">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${job.status === 'completed' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'
                        }`}>
                        {job.status}
                      </span>
                      {job.status === 'completed' && (
                        <button
                          onClick={() => handleDownload(job)}
                          className="p-2 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-lg transition-all"
                          title="Download Leads"
                        >
                          <Download size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600/10 to-transparent rounded-2xl border border-indigo-500/20 p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full -mr-8 -mt-8" />
            <h3 className="text-sm font-semibold text-indigo-300 mb-2 relative z-10">AI Prospecting Suggestion</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-4 relative z-10">
              Based on your {profile?.industry || 'Business'} background, I recommend targeting **Interior Design Firms** in high-growth cities to maximize partnership conversions.
            </p>
            <button className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-white transition-colors relative z-10">
              Auto-configure Job
            </button>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Live Status</h3>
            {activeJobs.length === 0 ? (
              <p className="text-slate-500 text-xs italic">No active jobs. Start a scraper to see live progress.</p>
            ) : (
              <div className="space-y-4">
                {activeJobs.map(job => (
                  <div key={job.jobId} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                    <Activity size={14} className="text-indigo-400 animate-pulse" />
                    <span className="text-xs text-white">Job {job.jobId.substring(0, 5)}...</span>
                    <span className="text-[10px] text-slate-500 ml-auto font-medium">Running</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

};
