import React, { useState, useCallback, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  Sparkles, 
  BarChart2, 
  Users, 
  Clock, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';
import { SenderService } from '../../lib/sender';
import type { BusinessProfile } from '../../lib/profiles';
import { AIService } from '../../lib/ai';

interface SenderViewProps {
  profile: BusinessProfile | null;
}

export const SenderView: React.FC<SenderViewProps> = ({ profile }) => {
  const [campaign, setCampaign] = useState({
    campaignName: '',
    subject: '',
    htmlContent: '',
    senderName: profile?.businessName || '',
    recipients: [] as string[]
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const data = await SenderService.getCampaigns();
        if (mounted) {
          setCampaigns(data);
          setIsOffline(false);
        }
      } catch {
        if (mounted) setIsOffline(true);
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  const handleGenerateTemplate = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Write a high-converting cold email for my business: ${profile?.businessName}. 
      Industry: ${profile?.industry}. 
      Target: Potential clients found via scraping.
      Goal: Book a discovery call.
      Tone: Professional but friendly.
      
      Include a subject line and body.`;
      
      const response = await AIService.chat([{ role: 'user', content: prompt }]);
      setCampaign(prev => ({
        ...prev,
        htmlContent: response,
        subject: `Partnership Inquiry from ${profile?.businessName}`
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      await SenderService.launchCampaign(campaign);
      alert('Campaign launched successfully!');
      loadCampaigns();
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Email Sender</h1>
          <p className="text-slate-400 mt-1 text-sm">Automated outreach campaigns & real-time analytics.</p>
        </div>
        
        <div className="flex gap-4">
           <div className="bg-slate-900/50 border border-white/5 rounded-xl px-4 py-2 flex items-center gap-2">
              <Users size={16} className="text-slate-500" />
              <span className="text-sm font-semibold text-white">1,240</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Leads</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/40 rounded-2xl border border-white/5 p-6">
            <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <Mail size={20} />
                  </div>
                  <h3 className="font-semibold text-white">Create Outreach Campaign</h3>
               </div>
               <button 
                onClick={handleGenerateTemplate}
                disabled={isGenerating}
                className="flex items-center gap-2 text-[10px] font-bold text-amber-400 uppercase tracking-widest hover:text-white transition-colors"
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                ⚡ AI Generate Template
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Campaign Name</label>
                <input 
                  type="text" 
                  value={campaign.campaignName}
                  onChange={(e) => setCampaign(prev => ({...prev, campaignName: e.target.value}))}
                  placeholder="e.g. Q1 Partnership Outreach"
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-slate-300 outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Subject</label>
                <input 
                  type="text" 
                  value={campaign.subject}
                  onChange={(e) => setCampaign(prev => ({...prev, subject: e.target.value}))}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-slate-300 outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Body</label>
                <textarea 
                  rows={8}
                  value={campaign.htmlContent}
                  onChange={(e) => setCampaign(prev => ({...prev, htmlContent: e.target.value}))}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-slate-300 outline-none focus:border-indigo-500/50 font-mono text-sm leading-relaxed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recipients (emails, comma separated)</label>
                <input 
                  type="text" 
                  value={campaign.recipients.join(', ')}
                  onChange={(e) => setCampaign(prev => ({...prev, recipients: e.target.value.split(',').map(s => s.trim())}))}
                  placeholder="e.g. hello@company.com, info@agency.co.uk"
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-slate-300 outline-none focus:border-indigo-500/50"
                />
              </div>

              <button 
                onClick={handleLaunch}
                disabled={isLaunching || !campaign.campaignName || campaign.recipients.length === 0}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isLaunching ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                Launch Campaign
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart2 size={20} className="text-indigo-400" />
              <h3 className="font-semibold text-white">Campaign Stats</h3>
            </div>
            
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Open Rate</p>
                     <p className="text-xl font-bold text-white">24.8%</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Click Rate</p>
                     <p className="text-xl font-bold text-white">8.2%</p>
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                     <span className="text-slate-400">Total Sent</span>
                     <span className="text-white font-medium">8,420</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-indigo-500 w-[70%]" />
                  </div>
                  <div className="flex justify-between text-xs">
                     <span className="text-slate-400">Total Bounced</span>
                     <span className="text-slate-500">42</span>
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
             <div className="flex items-center gap-3 mb-4">
                <Clock size={16} className="text-slate-500" />
                <h4 className="text-sm font-semibold text-white">Recent Activity</h4>
             </div>
             <div className="space-y-4">
                {campaigns.length > 0 ? campaigns.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex gap-3">
                     <div className="mt-1">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                     </div>
                     <p className="text-[11px] text-slate-400 leading-tight">
                        <span className="text-white font-medium">Campaign "{c.name || 'Untitled'}"</span> {c.status || 'processed'}.
                     </p>
                  </div>
                )) : isOffline ? (
                  <div className="text-center py-4 bg-white/5 rounded-lg border border-dashed border-white/10">
                    <p className="text-[10px] text-slate-500 italic">Sender service offline</p>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-white/5 rounded-lg border border-dashed border-white/10">
                    <p className="text-[10px] text-slate-500 italic">No recent activity detected.</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
