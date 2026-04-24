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
  Info,
  Trash2,
} from 'lucide-react';
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
import { EntryForm } from './EntryForm';
import { CsvImport } from './CsvImport';
import { exportFinancePdf } from './FinanceExportPdf';
import { useSession } from '../../lib/auth-client';

const PIE_COLORS = ['#6366f1', '#f97316', '#ec4899', '#10b981', '#eab308', '#94a3b8'];

const gbp = (n: number | null | undefined) =>
  n == null ? '—' : '£' + Math.round(n).toLocaleString('en-GB');

const KpiTile: React.FC<{
  label: string;
  value: string;
  delta?: string;
  deltaDir?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}> = ({ label, value, delta, deltaDir, icon }) => (
  <div className="glass-card p-5 flex flex-col gap-2 min-h-[110px]">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      <div className="text-slate-500">{icon}</div>
    </div>
    <div className="text-2xl font-black text-white tracking-tight">{value}</div>
    {delta && (
      <div
        className={`text-[11px] font-semibold flex items-center gap-1 ${
          deltaDir === 'up'
            ? 'text-emerald-400'
            : deltaDir === 'down'
            ? 'text-rose-400'
            : 'text-slate-400'
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
  const [narrative, setNarrative] = React.useState('');
  const [narrLoading, setNarrLoading] = React.useState(false);
  const [narrError, setNarrError] = React.useState('');

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
      <div className="glass-card p-8 text-center text-slate-400">
        Please sign in to use Finance Intelligence.
      </div>
    );
  }

  const hasData = entries.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 px-4 sm:px-6 py-6 overflow-y-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white flex items-center gap-2">
            <PoundSterling className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-400 shrink-0" />
            Finance Intelligence
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Real numbers from your entries · GBP · {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/30"
          >
            <Plus size={14} /> Add entry
          </button>
          <button
            onClick={() => setShowCsv(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-sm font-semibold hover:bg-white/10"
          >
            <FileSpreadsheet size={14} /> CSV Import
          </button>
          <button
            onClick={handleExportPdf}
            disabled={!hasData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
          >
            <FileDown size={14} /> Export PDF
          </button>
        </div>
      </header>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {!hasData && !loading && (
        <div className="glass-card p-8 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">No finance entries yet</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Add revenue and expenses manually or import a CSV. Once you have at least 7 days
            of data, you'll see deterministic forecasts and AI commentary here.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold"
            >
              Add your first entry
            </button>
            <button
              onClick={() => setShowCsv(true)}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-sm font-semibold"
            >
              Try sample CSV
            </button>
          </div>
        </div>
      )}

      {/* Charts */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Revenue vs expenses</h3>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">Last 12 months</span>
            </div>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer>
                <BarChart data={monthly}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      background: '#0a0b14',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: any) => gbp(Number(v))}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-white mb-4">Expenses by category (90d)</h3>
            {categories.length ? (
              <div className="h-64 sm:h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={categories.slice(0, 6)}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {categories.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#0a0b14',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: any, _n: any, e: any) => [gbp(Number(v)), e?.payload?.category]}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-slate-500 text-sm text-center py-8">No expenses in the last 90 days.</div>
            )}
          </div>
        </div>
      )}

      {/* Forecast panel */}
      {hasData && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={14} className="text-indigo-400" /> 30/60/90-day projection
            </h3>
            <span className="text-[10px] text-amber-400/90 uppercase tracking-widest flex items-center gap-1">
              <Info size={10} /> AI estimate
            </span>
          </div>
          {forecastPoints ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {forecastPoints.map(f => (
                <div key={f.point} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    By {new Date(f.point).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </div>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Revenue</span>
                      <span className="text-emerald-300 font-mono">{gbp(f.predictedRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Expense</span>
                      <span className="text-rose-300 font-mono">{gbp(f.predictedExpense)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-white/5">
                      <span className="text-slate-300 font-semibold">Profit</span>
                      <span className="text-white font-mono font-bold">
                        {gbp(f.predictedRevenue - f.predictedExpense)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-sm text-center py-6">
              Add at least 7 days of entries to enable forecasts.
            </div>
          )}
        </div>
      )}

      {/* AI commentary */}
      {hasData && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles size={14} className="text-fuchsia-400" /> AI commentary
            </h3>
            <button
              onClick={generateNarrative}
              disabled={narrLoading}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/20 disabled:opacity-60 flex items-center gap-2"
            >
              {narrLoading ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
              {narrative ? 'Regenerate' : 'Generate'}
            </button>
          </div>
          {narrError && (
            <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-3">
              {narrError}
            </div>
          )}
          {narrative ? (
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{narrative}</div>
          ) : (
            <p className="text-slate-500 text-sm">
              Click "Generate" to get a plain-English read of your numbers.
            </p>
          )}
        </div>
      )}

      {/* Entries list */}
      {hasData && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Recent Entries</h3>
            <span className="text-[11px] text-slate-500">
              {anomalies.length > 0 && (
                <span className="text-amber-400">{anomalies.length} unusual</span>
              )}
            </span>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto -mx-5">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="text-slate-500 text-[10px] uppercase tracking-widest border-b border-white/5">
                <tr>
                  <th className="text-left px-5 py-2 font-semibold">Date</th>
                  <th className="text-left px-3 py-2 font-semibold">Type</th>
                  <th className="text-left px-3 py-2 font-semibold">Category</th>
                  <th className="text-right px-3 py-2 font-semibold">Amount</th>
                  <th className="text-left px-3 py-2 font-semibold">Note</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 50).map(e => {
                  const flag = e.id ? anomalyMap.get(e.id) : undefined;
                  return (
                    <tr
                      key={e.id}
                      className={`border-b border-white/[0.03] ${
                        flag ? 'bg-amber-500/[0.04]' : ''
                      }`}
                    >
                      <td className="px-5 py-2 text-slate-300 font-mono">{e.entry_date}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            e.type === 'revenue' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {e.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        <div className="flex items-center gap-2">
                          {e.category}
                          {flag && (
                            <span
                              title={flag.reason}
                              className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20"
                            >
                              <AlertTriangle size={9} /> unusual
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-200 font-mono">
                        {gbp(e.amount)}
                      </td>
                      <td className="px-3 py-2 text-slate-500 truncate max-w-[200px]">{e.note || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-slate-600 hover:text-rose-400 transition p-1"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {entries.slice(0, 50).map(e => {
              const flag = e.id ? anomalyMap.get(e.id) : undefined;
              return (
                <div
                  key={e.id}
                  className={`p-4 rounded-xl border border-white/5 space-y-3 ${
                    flag ? 'bg-amber-500/5 border-amber-500/10' : 'bg-white/[0.02]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                        {e.entry_date}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                            e.type === 'revenue' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {e.type}
                        </span>
                        <span className="text-sm font-bold text-white">{e.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-white font-mono">{gbp(e.amount)}</div>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-slate-500 hover:text-rose-400 mt-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {e.note && (
                    <div className="text-xs text-slate-400 italic border-t border-white/5 pt-2">
                      {e.note}
                    </div>
                  )}
                  {flag && (
                    <div className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-1.5 rounded-lg border border-amber-500/10 flex items-center gap-2">
                      <AlertTriangle size={12} /> {flag.reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {entries.length > 50 && (
            <div className="text-center text-[11px] text-slate-500 pt-3">
              Showing 50 most recent of {entries.length} entries.
            </div>
          )}
        </div>
      )}

      {loading && !hasData && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-indigo-400" size={24} />
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
    </div>
  );
};

export default FinanceDashboard;
