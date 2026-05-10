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
      <div className="flex flex-col items-center justify-center h-96 gap-4 bg-slate-50 font-sans">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin shadow-sm" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Neural intelligence sync...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 sm:px-6 py-6 bg-slate-50 min-h-full font-sans text-slate-900">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <Zap className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
            Intelligence Hub
          </h1>
          <p className="text-slate-500 font-medium mt-1 text-sm lg:text-base">Unified performance insights for <strong className="text-slate-900">{profile?.business_name || 'your business'}</strong>.</p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-2xl w-fit shadow-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span className="text-[10px] lg:text-xs font-black text-slate-900 uppercase tracking-widest">AI Pulse: Optimal</span>
        </div>
      </header>

      {/* BritC Proactive Alerts */}
      <div className="bg-blue-600 rounded-[24px] p-4 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden group shadow-xl shadow-blue-600/20 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-700" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 border border-white/30 shadow-lg">
            <Zap className="w-6 h-6 lg:w-8 lg:h-8 text-white animate-pulse" />
          </div>
          <div>
            <h4 className="text-base lg:text-xl font-black tracking-tight">Proactive Opportunity Detected</h4>
            <p className="text-sm lg:text-base text-blue-50 font-medium opacity-90 mt-1">Local service demand is up 18%. Launch a campaign now for maximum impact.</p>
          </div>
        </div>
        <button className="w-full sm:w-auto px-8 py-3 bg-white text-blue-700 hover:bg-blue-50 text-sm font-black uppercase tracking-wider rounded-xl transition-all shadow-lg relative z-10 whitespace-nowrap active:scale-95">
          Execute Strategy
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title="Total Leads" 
          value={stats?.totalLeads || 0} 
          icon={<Search className="w-5 h-5 text-blue-600" />} 
          trend="+12%" 
          positive={true}
        />
        <StatCard 
          title="Active Campaigns" 
          value={stats?.activeCampaigns || 0} 
          icon={<Mail className="w-5 h-5 text-red-600" />} 
          trend="+5%" 
          positive={true}
        />
        <StatCard 
          title="Strategic Docs" 
          value={stats?.documentsCreated || 0} 
          icon={<FileText className="w-5 h-5 text-orange-500" />} 
          trend="+28%" 
          positive={true}
        />
        <StatCard 
          title="Revenue (Est)" 
          value={`£${(stats?.revenueForecast || 0).toLocaleString()}`} 
          icon={<BarChart2 className="w-5 h-5 text-blue-700" />} 
          trend="+8.2%" 
          positive={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 sm:p-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-10 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Growth Velocity Funnel
            </h3>
            <div className="h-64 flex items-end justify-around px-2 lg:px-8 gap-4">
              {[
                { label: 'Leads', value: stats?.totalLeads || 10, color: 'bg-blue-600' },
                { label: 'Outreach', value: (stats?.activeCampaigns || 1) * 10, color: 'bg-red-600' },
                { label: 'Converted', value: (stats?.documentsCreated || 5) * 5, color: 'bg-orange-500' },
                { label: 'Forecast', value: 80, color: 'bg-blue-800' },
              ].map((bar) => (
                <div key={bar.label} className="flex flex-col items-center gap-4 w-full max-w-[64px] group">
                  <div className="w-full relative">
                    <div 
                      className={`w-full ${bar.color} rounded-t-2xl opacity-5 transition-all group-hover:opacity-10`}
                      style={{ height: '200px' }}
                    />
                    <div 
                      className={`absolute bottom-0 w-full ${bar.color} rounded-t-2xl shadow-xl transition-all duration-700 ease-out group-hover:scale-x-105`}
                      style={{ height: `${Math.min(bar.value, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight text-center">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 hover:border-emerald-200 transition-all group">
              <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Lead Alpha Score</h4>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-slate-900 tracking-tighter">8.4</span>
                <span className="text-xs text-emerald-600 mb-1.5 font-bold uppercase">+1.2 vs week</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">AI-weighted industry match and validity score.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 hover:border-blue-200 transition-all group">
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Win Probability</h4>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-slate-900 tracking-tighter">{stats?.conversionRate || 0}%</span>
                <span className="text-xs text-blue-600 mb-1.5 font-bold uppercase">+0.4% trend</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">Real-time conversion ratio across all active channels.</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 sm:p-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" />
              Strategic Recommendations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {opportunities.map((opp, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-white transition-all cursor-pointer group shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-[13px] font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">{opp.title}</h4>
                    <span className="text-[9px] font-black text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">{opp.impact}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{opp.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Recent Activity */}
        <div className="space-y-6 sm:space-y-8">
           <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 sm:p-8 flex flex-col h-full">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Operational Audit
            </h3>
            <div className="space-y-8 flex-1 relative">
              {activity.length > 0 ? activity.map((event) => (
                <div key={event.id} className="relative pl-6 pb-8 last:pb-0 border-l border-slate-100 group">
                  <div className="absolute left-[-5px] top-1 w-[9px] h-[9px] rounded-full bg-blue-600 border-2 border-white shadow-sm group-hover:scale-125 group-hover:bg-red-600 transition-all" />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{event.type}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tabular-nums">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <h4 className="text-[13px] font-black text-slate-900 group-hover:text-blue-600 transition-colors">{event.title}</h4>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">{event.description}</p>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <Target className="w-10 h-10 text-slate-300 mb-4 opacity-30" />
                  <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em]">Zero signal detected</p>
                </div>
              )}
            </div>
            <button 
              onClick={async () => {
                const report = await MetricsService.generateWeeklyReport(profile, stats, activity);
                alert("AI Business Pulse Report:\n\n" + report);
              }}
              className="mt-10 w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-black uppercase tracking-[0.15em] text-white transition-all flex items-center justify-center gap-2 group shadow-xl shadow-blue-600/20 active:scale-95"
            >
              <Zap className="w-4 h-4 group-hover:animate-pulse" />
              Generate Neural Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, trend, positive }: { title: string, value: string | number, icon: React.ReactNode, trend: string, positive: boolean }) => (
  <div className="bg-white border border-slate-200 rounded-[24px] p-6 group hover:border-blue-300 hover:shadow-md transition-all shadow-sm">
    <div className="flex items-start justify-between mb-5">
      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 group-hover:scale-110 group-hover:bg-white group-hover:shadow-sm transition-all duration-500">
        {icon}
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-md uppercase shadow-sm border ${positive ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-red-700 bg-red-50 border-red-100'}`}>
        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {trend}
      </div>
    </div>
    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{title}</p>
    <h4 className="text-2xl font-black text-slate-900 mt-1 tabular-nums tracking-tight">{value}</h4>
  </div>
);
