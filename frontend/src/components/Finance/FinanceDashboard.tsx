import React from 'react';
import {
  PoundSterling,
  TrendingUp,
  TrendingDown,
  Target,
  Plus,
  FileSpreadsheet,
  FileDown,
  Sparkles,
  Loader2,
  AlertTriangle,
  Trash2,
  BarChart3,
  CheckCircle,
  Mail,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GrowthService, type GrowthInsight } from '../../lib/growth';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { FinanceService } from '../../lib/finance';
import type { FinanceEntry } from '../../lib/finance';
import {
  computeKpis,
  monthlyAggregate,
  expenseByCategory,
  forecast,
  detectAnomalies,
  dailyAggregate,
} from '../../lib/financeAnalytics';
import type {
  FinanceKpis,
  ForecastPoint,
  MonthlyAggregate,
  CategoryBreakdown,
  Anomaly,
} from '../../lib/financeAnalytics';
import { FinanceNarrativeService } from '../../lib/financeNarrative';
import { ScenarioSimulator } from './ScenarioSimulator';
import { EntryForm } from './EntryForm';
import { CsvImport } from './CsvImport';
import { ReportScheduleModal } from './ReportScheduleModal';
import { exportFinancePdf } from './FinanceExportPdf';
import { useSession } from '../../lib/auth-client';

const PIE_COLORS = ['#2563eb', '#dc2626', '#f97316', '#3b82f6', '#ef4444', '#94a3b8'];

const gbp = (n: number | null | undefined) =>
  n == null ? '—' : '£' + Math.round(n).toLocaleString('en-GB');

const KpiTile: React.FC<{
  label: string;
  value: string;
  delta?: string;
  deltaDir?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}> = ({ label, value, delta, deltaDir, icon }) => (
  <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-5 flex flex-col gap-2 min-h-[110px] hover:shadow-md transition-all group hover:border-blue-200">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      <div className="text-slate-400 group-hover:text-blue-500 transition-colors">{icon}</div>
    </div>
    <div className="text-2xl font-black text-slate-900 tracking-tight">{value}</div>
    {delta && (
      <div
        className={`text-[11px] font-bold flex items-center gap-1 ${
          deltaDir === 'up'
            ? 'text-emerald-600'
            : deltaDir === 'down'
            ? 'text-red-600'
            : 'text-slate-500'
        }`}
      >
        {deltaDir === 'up' && <TrendingUp size={12} />}
        {deltaDir === 'down' && <TrendingDown size={12} />}
        {delta}
      </div>
    )}
  </div>
);

export const FinanceDashboard: React.FC<{ profile: any }> = ({ profile }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id || '';

  const [entries, setEntries] = React.useState<FinanceEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [showCsv, setShowCsv] = React.useState(false);
  const [showSchedule, setShowSchedule] = React.useState(false);
  const [narrative, setNarrative] = React.useState('');
  const [narrLoading, setNarrLoading] = React.useState(false);
  const [narrError, setNarrError] = React.useState('');
  const [pulseText, setPulseText] = React.useState('');
  const [insights, setInsights] = React.useState<GrowthInsight[]>([]);

  const refresh = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const list = await FinanceService.listEntries(userId);
      setEntries(list);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const [pulse, bns] = await Promise.all([
          GrowthService.getBusinessPulse(profile, userId),
          GrowthService.detectBottlenecks(profile, userId),
        ]);
        if (cancelled) return;
        setPulseText(pulse);
        setInsights(bns);
      } catch {
        /* non-fatal */
      }
    })();
    return () => { cancelled = true; };
  }, [userId, profile, entries.length]);

  // Derived numbers (pure, deterministic)
  const kpis: FinanceKpis = React.useMemo(() => computeKpis(entries), [entries]);
  const monthly: MonthlyAggregate[] = React.useMemo(() => monthlyAggregate(entries).slice(-12), [entries]);
  const categories: CategoryBreakdown[] = React.useMemo(() => expenseByCategory(entries, 90), [entries]);

  const forecastPoints: ForecastPoint[] | null = React.useMemo(
    () => forecast(dailyAggregate(entries)),
    [entries]
  );

  const anomalies: Anomaly[] = React.useMemo(() => detectAnomalies(entries), [entries]);
  const anomalyMap = React.useMemo(() => {
    const m = new Map<string, Anomaly>();
    for (const a of anomalies) m.set(a.entryId, a);
    return m;
  }, [anomalies]);

  const generateNarrative = async () => {
    setNarrLoading(true);
    setNarrError('');
    try {
      const text = await FinanceNarrativeService.generate({
        kpis,
        forecasts: forecastPoints,
        anomalies,
        topCategories: kpis.topCategories,
        businessName: profile?.businessName || profile?.business_name,
        industry: profile?.industry,
        entryCount: entries.length,
      });
      setNarrative(text);
    } catch (err: any) {
      setNarrError(err?.message || 'AI commentary failed. Check your Groq API key in Settings.');
    } finally {
      setNarrLoading(false);
    }
  };

  const handleExportPdf = async () => {
    await exportFinancePdf({
      businessName: profile?.businessName || profile?.business_name,
      industry: profile?.industry,
      kpis,
      forecasts: forecastPoints,
      topCategories: kpis.topCategories,
      narrative: narrative || undefined,
    });
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm('Delete this entry?')) return;
    await FinanceService.deleteEntry(userId, id);
    refresh();
  };

  if (!userId) {
    return (
      <div className="bg-white border border-slate-200 rounded-[24px] p-8 text-center text-slate-500 font-bold">
        Please sign in to use Finance Intelligence.
      </div>
    );
  }

  const hasData = entries.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 px-4 sm:px-6 py-6 overflow-y-auto bg-slate-50 min-h-full font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
            <PoundSterling className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 shrink-0" />
            Finance Intelligence
          </h1>
          <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
            Real numbers from your entries · GBP · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Plus size={14} /> Add entry
          </button>
          <button
            onClick={() => setShowCsv(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-black uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <FileSpreadsheet size={14} className="text-blue-500" /> Import
          </button>
          <button
            onClick={handleExportPdf}
            disabled={!hasData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-black uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <FileDown size={14} className="text-red-500" /> Export
          </button>
          <button
            onClick={() => setShowSchedule(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-black uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <Mail size={14} className="text-orange-500" /> Reports
          </button>
        </div>
      </header>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiTile
          label="Revenue (30d)"
          value={gbp(kpis.last30Revenue)}
          delta={
            kpis.prev30Revenue > 0
              ? `${kpis.revenueChangePct >= 0 ? '+' : ''}${kpis.revenueChangePct}% vs prior 30d`
              : 'No prior 30d data'
          }
          deltaDir={
            kpis.revenueChangePct > 0 ? 'up' : kpis.revenueChangePct < 0 ? 'down' : 'neutral'
          }
          icon={<PoundSterling size={16} />}
        />
        <KpiTile
          label="Expenses (30d)"
          value={gbp(kpis.last30Expense)}
          delta={kpis.topCategories[0] ? `Top: ${kpis.topCategories[0].category}` : undefined}
          icon={<TrendingDown size={16} />}
        />
        <KpiTile
          label="Profit (30d)"
          value={gbp(kpis.last30Profit)}
          delta={`${kpis.marginPct}% margin`}
          deltaDir={kpis.last30Profit > 0 ? 'up' : kpis.last30Profit < 0 ? 'down' : 'neutral'}
          icon={<Target size={16} />}
        />
        <KpiTile
          label="Runway"
          value={kpis.runwayDays == null ? 'Profitable' : `${kpis.runwayDays}d`}
          delta={kpis.runwayDays == null ? 'No burn' : 'At current loss rate'}
          deltaDir={kpis.runwayDays == null ? 'up' : 'down'}
          icon={<AlertTriangle size={16} />}
        />
      </div>

      {/* Live Business Pulse & Growth Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white border border-slate-200 rounded-[24px] p-4 sm:p-6 relative overflow-hidden group hover:shadow-md transition-all hover:border-blue-200 shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all">
            <TrendingUp size={80} className="text-blue-500" />
          </div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
              <BarChart3 className="text-blue-600" size={20} />
            </div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Live Business Pulse</h2>
          </div>
          <div className="space-y-4 relative z-10">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
              <pre className="text-xs text-blue-700 font-bold font-mono whitespace-pre-wrap leading-relaxed">
                {pulseText || 'Calibrating neural pulse...'}
              </pre>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
              This data grounds all team AI interactions in real-time financial signal.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-4 sm:p-6 hover:shadow-md transition-all hover:border-orange-200">
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-orange-50 rounded-lg border border-orange-100 shadow-sm">
              <AlertTriangle className="text-orange-500" size={20} />
            </div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Growth Bottlenecks</h2>
          </div>
          <div className="space-y-3 relative z-10">
            {insights.length > 0 ? insights.map((insight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-4 rounded-2xl border shadow-sm ${
                  insight.type === 'warning' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-sm ${
                    insight.type === 'warning' ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'
                  }`}>
                    {insight.impact} IMPACT
                  </span>
                  <h4 className="text-sm font-black text-slate-900">{insight.title}</h4>
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1.5">{insight.description}</p>
              </motion.div>
            )) : (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <CheckCircle size={24} className="text-emerald-500 mx-auto mb-2 opacity-50" />
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">System stable. No blockers.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {!hasData && !loading && (
        <div className="bg-white border border-slate-200 rounded-[24px] p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <Sparkles className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900">No finance entries yet</h3>
          <p className="text-slate-500 font-medium text-sm max-w-md mx-auto leading-relaxed">
            Add revenue and expenses manually or import a CSV. Once you have at least 7 days
            of data, you'll see deterministic forecasts and AI commentary here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              Add first entry
            </button>
            <button
              onClick={() => setShowCsv(true)}
              className="px-6 py-3 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-black uppercase tracking-wider text-xs shadow-sm active:scale-95 transition-all"
            >
              Try sample CSV
            </button>
          </div>
        </div>
      )}

      {/* Charts */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="md:col-span-2 lg:col-span-2 bg-white border border-slate-200 rounded-[24px] shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Revenue vs Expenses</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Last 12 months</span>
            </div>
            <div className="h-64 sm:h-72 md:h-80">
              <ResponsiveContainer>
                <BarChart data={monthly}>
                  <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} fontWeight={700} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} fontWeight={700} axisLine={false} tickLine={false} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#0f172a',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                    }}
                    formatter={(v: any) => gbp(Number(v))}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 20 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#dc2626" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-4 sm:p-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Expense Breakdown (90d)</h3>
            {categories.length ? (
              <div className="h-64 sm:h-72 md:h-80 flex flex-col">
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={categories.slice(0, 6)}
                        dataKey="amount"
                        nameKey="category"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                      >
                        {categories.slice(0, 6).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="white" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                        }}
                        formatter={(v: any, _n: any, e: any) => [gbp(Number(v)), e?.payload?.category]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {categories.slice(0, 4).map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[10px] font-bold text-slate-600 truncate uppercase tracking-tight">{c.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed p-8">
                <p className="text-slate-400 font-bold text-xs text-center uppercase tracking-widest">No expenses tracked</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Forecast panel */}
      {hasData && (
        <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-100"><TrendingUp size={16} className="text-blue-600" /></div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Growth Projections</h3>
            </div>
            <span className="text-[10px] font-black text-orange-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded-md uppercase tracking-[0.2em] shadow-sm">
              AI Forecast
            </span>
          </div>
          {forecastPoints ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {forecastPoints.map(f => (
                <div key={f.point} className="p-5 rounded-[20px] bg-slate-50 border border-slate-200 hover:border-blue-200 transition-all shadow-sm">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                    <span>Target Date</span>
                    <span className="text-slate-900">{new Date(f.point).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold text-xs uppercase tracking-tight">Revenue</span>
                      <span className="text-slate-900 font-black font-mono">{gbp(f.predictedRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold text-xs uppercase tracking-tight">Expense</span>
                      <span className="text-red-600 font-black font-mono">{gbp(f.predictedExpense)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200">
                      <span className="text-blue-600 font-black text-xs uppercase tracking-widest">Est. Profit</span>
                      <span className="text-blue-700 font-black font-mono text-lg">
                        {gbp(f.predictedRevenue - f.predictedExpense)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-8 text-center">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">7 days of data required for forecast</p>
            </div>
          )}
        </div>
      )}

      {/* Scenario simulator */}
      {hasData && <ScenarioSimulator entries={entries} userId={userId} />}

      {/* AI commentary */}
      {hasData && (
        <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all">
            <Sparkles size={80} className="text-orange-500" />
          </div>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 border border-orange-100 rounded-lg shadow-sm"><Sparkles size={16} className="text-orange-500" /></div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Neural Narrative</h3>
            </div>
            <button
              onClick={generateNarrative}
              disabled={narrLoading}
              className="px-4 py-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black uppercase tracking-wider hover:bg-orange-100 transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {narrLoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
              {narrative ? 'Refresh AI' : 'Analyze Now'}
            </button>
          </div>
          {narrError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold mb-4 shadow-sm flex items-center gap-3">
              <AlertTriangle size={16} /> {narrError}
            </div>
          )}
          {narrative ? (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-slate-700 text-[15px] leading-relaxed font-medium relative z-10 shadow-inner italic">
              {narrative}
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-50 border border-slate-100 border-dashed rounded-2xl">
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Run AI analysis for strategic insights</p>
            </div>
          )}
        </div>
      )}

      {/* Entries list */}
      {hasData && (
        <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest px-1">Ledger Activity</h3>
            {anomalies.length > 0 && (
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md shadow-sm animate-pulse">
                {anomalies.length} Unusual Patterns Found
              </span>
            )}
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto -mx-6">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] border-y border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 font-black">Post Date</th>
                  <th className="text-left px-4 py-3 font-black">Flow</th>
                  <th className="text-left px-4 py-3 font-black">Business Category</th>
                  <th className="text-right px-4 py-3 font-black">Amount (GBP)</th>
                  <th className="text-left px-4 py-3 font-black">Note / Audit</th>
                  <th className="px-6 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {entries.slice(0, 50).map(e => {
                  const flag = e.id ? anomalyMap.get(e.id) : undefined;
                  return (
                    <tr
                      key={e.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        flag ? 'bg-orange-50/30' : ''
                      }`}
                    >
                      <td className="px-6 py-4 text-slate-500 font-bold tabular-nums font-mono text-xs">{e.entry_date}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border shadow-sm ${
                            e.type === 'revenue' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                          }`}
                        >
                          {e.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-900 font-bold text-[13px]">
                        <div className="flex items-center gap-2">
                          {e.category}
                          {flag && (
                            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" title={flag.reason} />
                          )}
                        </div>
                      </td>
                      <td className={`px-4 py-4 text-right font-black font-mono text-[13px] ${e.type === 'revenue' ? 'text-blue-600' : 'text-slate-900'}`}>
                        {gbp(e.amount)}
                      </td>
                      <td className="px-4 py-4 text-slate-500 text-xs truncate max-w-[220px]">{e.note || '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-slate-300 hover:text-red-600 transition p-2 rounded-lg hover:bg-white hover:shadow-sm"
                          title="Delete entry"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-4">
            {entries.slice(0, 50).map(e => {
              const flag = e.id ? anomalyMap.get(e.id) : undefined;
              return (
                <div
                  key={e.id}
                  className={`p-5 rounded-2xl border transition-all shadow-sm ${
                    flag ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest">
                        {e.entry_date}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded shadow-sm border ${
                            e.type === 'revenue' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                          }`}
                        >
                          {e.type}
                        </span>
                        <span className="text-[13px] font-black text-slate-900">{e.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-slate-900 font-mono tracking-tight">{gbp(e.amount)}</div>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-2 text-slate-400 hover:text-red-600 mt-2 bg-slate-50 rounded-lg border border-slate-100 shadow-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {e.note && (
                    <div className="text-[11px] text-slate-500 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-3">
                      {e.note}
                    </div>
                  )}
                  {flag && (
                    <div className="text-[10px] font-bold text-orange-700 bg-orange-100/50 px-3 py-2 rounded-xl border border-orange-200 flex items-start gap-2 mt-3 shadow-inner">
                      <AlertTriangle size={14} className="text-orange-600 shrink-0 mt-0.5" /> 
                      <span className="leading-tight">{flag.reason}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {entries.length > 50 && (
            <div className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pt-6 pb-2">
              Viewing 50 of {entries.length} Ledger Records
            </div>
          )}
        </div>
      )}

      {loading && !hasData && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white border border-slate-200 rounded-[24px] shadow-sm">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Syncing Ledger Activity…</p>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <EntryForm
          userId={userId}
          onClose={() => setShowForm(false)}
          onSaved={refresh}
        />
      )}
      {showCsv && (
        <CsvImport
          userId={userId}
          onClose={() => setShowCsv(false)}
          onImported={() => refresh()}
        />
      )}
      <ReportScheduleModal open={showSchedule} onClose={() => setShowSchedule(false)} />
    </div>
  );
};

export default FinanceDashboard;
