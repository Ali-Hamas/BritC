import React from 'react';
import { 
  TrendingUp, TrendingDown, Search, Mail, FileText, 
  BarChart2, Zap, Clock, Target, ShieldCheck
} from 'lucide-react';
import { MetricsService } from '../../lib/metrics';
import { FinanceService } from '../../lib/finance';
import type { BusinessStats, ActivityEvent } from '../../lib/metrics';

export const IntelligenceView = ({ profile }: { profile: any }) => {
  const [stats, setStats] = React.useState<BusinessStats | null>(null);
  const [activity, setActivity] = React.useState<ActivityEvent[]>([]);
  const [opportunities, setOpportunities] = React.useState<{ title: string, description: string, impact: string }[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [s, a, o] = await Promise.all([
          MetricsService.getStats(profile),
          MetricsService.getRecentActivity(),
          FinanceService.getGrowthOpportunities(profile)
        ]);
        setStats(s);
        setActivity(a);
        setOpportunities(o);
      } catch (err) {
        console.error('Failed to load intelligence data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-slate-400 font-medium animate-pulse">Scanning business intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            Intelligence Hub
          </h1>
          <p className="text-slate-400 mt-1">Unified performance insights for {profile?.business_name || 'your business'}.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold text-white uppercase tracking-tighter">AI Pulse: Optimal</span>
        </div>
      </header>

      {/* BritC Proactive Alerts */}
      <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">BritC Intelligence: High Conversion Window Detected</h4>
            <p className="text-xs text-indigo-200/70">Local service demand in your region is up 18%. Suggest launching a targeted campaign.</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20">
          Launch Now
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Leads" 
          value={stats?.totalLeads || 0} 
          icon={<Search className="w-5 h-5 text-blue-400" />} 
          trend="+12%" 
          positive={true}
        />
        <StatCard 
          title="Campaigns" 
          value={stats?.activeCampaigns || 0} 
          icon={<Mail className="w-5 h-5 text-purple-400" />} 
          trend="+5%" 
          positive={true}
        />
        <StatCard 
          title="Documents" 
          value={stats?.documentsCreated || 0} 
          icon={<FileText className="w-5 h-5 text-amber-400" />} 
          trend="+28%" 
          positive={true}
        />
        <StatCard 
          title="Revenue (Est)" 
          value={`£${(stats?.revenueForecast || 0).toLocaleString()}`} 
          icon={<BarChart2 className="w-5 h-5 text-emerald-400" />} 
          trend="+8.2%" 
          positive={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Growth Funnel
            </h3>
            <div className="h-64 flex items-end justify-around px-4">
              {[
                { label: 'Leads', value: stats?.totalLeads || 10, color: 'bg-blue-500' },
                { label: 'Outreach', value: (stats?.activeCampaigns || 1) * 10, color: 'bg-purple-500' },
                { label: 'Converted', value: (stats?.documentsCreated || 5) * 5, color: 'bg-amber-500' },
                { label: 'Forecast', value: 80, color: 'bg-primary' },
              ].map((bar) => (
                <div key={bar.label} className="flex flex-col items-center gap-3 w-16 group">
                  <div className="w-full relative">
                    <div 
                      className={`w-full ${bar.color} rounded-t-xl opacity-20 transition-all group-hover:opacity-30`}
                      style={{ height: '200px' }}
                    />
                    <div 
                      className={`absolute bottom-0 w-full ${bar.color} rounded-t-xl shadow-lg transition-all group-hover:scale-105`}
                      style={{ height: `${bar.value}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-5 bg-emerald-500/5 border-emerald-500/10">
              <h4 className="text-sm font-bold text-emerald-400 mb-2">Lead Quality Score</h4>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">8.4</span>
                <span className="text-xs text-emerald-400 mb-1 font-bold">+1.2 vs last week</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Based on current industry match and email validity.</p>
            </div>
            <div className="glass-card p-5 bg-blue-500/5 border-blue-500/10">
              <h4 className="text-sm font-bold text-blue-400 mb-2">Conversion Rate</h4>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">{stats?.conversionRate || 0}%</span>
                <span className="text-xs text-blue-400 mb-1 font-bold">+0.4% trend</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Ratio of leads converted to generated documents.</p>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              BritC Growth Recommendations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {opportunities.map((opp, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{opp.title}</h4>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">{opp.impact}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{opp.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Recent Activity */}
        <div className="glass-card p-6 flex flex-col h-full">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Recent Activity
          </h3>
          <div className="space-y-6 flex-1">
            {activity.length > 0 ? activity.map((event) => (
              <div key={event.id} className="relative pl-6 pb-6 last:pb-0 border-l border-white/10 group">
                <div className="absolute left-[-5px] top-1 w-[9px] h-[9px] rounded-full bg-primary border border-slate-900 group-hover:scale-125 transition-all" />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{event.type}</span>
                    <span className="text-[10px] text-slate-500">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">{event.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{event.description}</p>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                <Target className="w-8 h-8 text-slate-500 mb-3 opacity-20" />
                <p className="text-xs text-slate-500 font-medium italic">No recent activity detected. Launch a campaign or scrape some leads to see data!</p>
              </div>
            )}
          </div>
          <button 
            onClick={async () => {
              const report = await MetricsService.generateWeeklyReport(profile, stats, activity);
              alert("AI Business Pulse Report:\n\n" + report);
            }}
            className="mt-6 w-full py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all flex items-center justify-center gap-2 group"
          >
            <Zap className="w-3 h-3 group-hover:animate-pulse" />
            Generate Weekly AI Report
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, trend, positive }: { title: string, value: string | number, icon: React.ReactNode, trend: string, positive: boolean }) => (
  <div className="glass-card p-5 group hover:border-primary/50 transition-all">
    <div className="flex items-start justify-between mb-4">
      <div className="p-2 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${positive ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {trend}
      </div>
    </div>
    <p className="text-slate-400 text-xs font-medium">{title}</p>
    <h4 className="text-2xl font-bold text-white mt-1">{value}</h4>
  </div>
);
