import React from 'react';
import { Sliders, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import type { FinanceEntry } from '../../lib/finance';
import {
  monthlyAggregate, dailyAggregate, forecast, computeKpis,
} from '../../lib/financeAnalytics';
import type { MonthlyAggregate, ForecastPoint, FinanceKpis } from '../../lib/financeAnalytics';
import {
  getFinanceStyle,
  getScenarioDefaults,
  FINANCE_STYLE_LABELS,
} from '../../lib/financeStyle';

const gbp = (n: number | null | undefined) =>
  n == null ? '—' : '£' + Math.round(n).toLocaleString('en-GB');

interface ScenarioInputs {
  revenuePct: number;       // -50..+200
  expensePct: number;       // -50..+200
  newHeadcount: number;     // 0..10
  salaryPerHire: number;    // GBP/month
}


function applyScenario(entries: FinanceEntry[], s: ScenarioInputs): FinanceEntry[] {
  const revMul = 1 + s.revenuePct / 100;
  const expMul = 1 + s.expensePct / 100;
  const adjusted = entries.map(e => ({
    ...e,
    amount: (Number(e.amount) || 0) * (e.type === 'revenue' ? revMul : expMul),
  }));

  const monthlyHeadcountCost = s.newHeadcount * s.salaryPerHire;
  if (monthlyHeadcountCost > 0) {
    // Inject a synthetic Salaries expense for each of the most recent 6 months
    // so the trend line picks up the recurring cost without polluting reality.
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 15);
      adjusted.push({
        entry_date: d.toISOString().slice(0, 10),
        type: 'expense',
        category: 'Salaries',
        amount: monthlyHeadcountCost,
      });
    }
  }
  return adjusted;
}

function deltaPct(scenarioVal: number, baseVal: number): number {
  if (baseVal === 0) return scenarioVal === 0 ? 0 : 100;
  return Math.round(((scenarioVal - baseVal) / Math.abs(baseVal)) * 1000) / 10;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (n: number) => void;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step = 1, suffix = '', onChange }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <span className="text-sm font-black font-mono text-slate-900">
        {value > 0 ? '+' : ''}{value}{suffix}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 shadow-inner border border-slate-200"
    />
  </div>
);

export const ScenarioSimulator: React.FC<{ entries: FinanceEntry[]; userId?: string }> = ({ entries, userId }) => {
  const style = React.useMemo(() => getFinanceStyle(userId), [userId]);
  const styleDefaults = React.useMemo<ScenarioInputs>(() => getScenarioDefaults(style), [style]);
  const [inputs, setInputs] = React.useState<ScenarioInputs>(styleDefaults);

  const baseMonthly: MonthlyAggregate[] = React.useMemo(
    () => monthlyAggregate(entries).slice(-6),
    [entries]
  );
  const baseKpis: FinanceKpis = React.useMemo(() => computeKpis(entries), [entries]);
  const baseForecast: ForecastPoint[] | null = React.useMemo(
    () => forecast(dailyAggregate(entries)),
    [entries]
  );

  const scenarioEntries = React.useMemo(() => applyScenario(entries, inputs), [entries, inputs]);
  const scenarioMonthly: MonthlyAggregate[] = React.useMemo(
    () => monthlyAggregate(scenarioEntries).slice(-6),
    [scenarioEntries]
  );
  const scenarioKpis: FinanceKpis = React.useMemo(() => computeKpis(scenarioEntries), [scenarioEntries]);
  const scenarioForecast: ForecastPoint[] | null = React.useMemo(
    () => forecast(dailyAggregate(scenarioEntries)),
    [scenarioEntries]
  );

  const chartData = React.useMemo(() => {
    const baseByMonth = new Map(baseMonthly.map(m => [m.month, m]));
    return scenarioMonthly.map(s => {
      const b = baseByMonth.get(s.month);
      return {
        label: s.label,
        baseProfit: b ? Math.round(b.profit) : 0,
        scenarioProfit: Math.round(s.profit),
      };
    });
  }, [baseMonthly, scenarioMonthly]);

  const dirty =
    inputs.revenuePct !== styleDefaults.revenuePct ||
    inputs.expensePct !== styleDefaults.expensePct ||
    inputs.newHeadcount !== styleDefaults.newHeadcount ||
    inputs.salaryPerHire !== styleDefaults.salaryPerHire;
  const profitDeltaPct = deltaPct(scenarioKpis.last30Profit, baseKpis.last30Profit);
  const reset = () => setInputs(styleDefaults);

  return (
    <div className="bg-white border border-slate-200 rounded-[24px] p-5 sm:p-8 space-y-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl shadow-sm"><Sliders size={18} className="text-blue-600" /></div>
          <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">Scenario Simulator</h3>
          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-orange-50 text-orange-600 border border-orange-200 shadow-sm">
            {FINANCE_STYLE_LABELS[style]} Configuration
          </span>
        </div>
        {dirty && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all shadow-sm active:scale-95"
          >
            <RotateCcw size={12} /> Reset System
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
        Simulate strategic pivots by modulating financial vectors. Model your potential workspace outcome without altering persistent ledger records.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
        <Slider
          label="Revenue Acceleration"
          value={inputs.revenuePct}
          min={-50}
          max={200}
          suffix="%"
          onChange={n => setInputs(s => ({ ...s, revenuePct: n }))}
        />
        <Slider
          label="Expense Scaling"
          value={inputs.expensePct}
          min={-50}
          max={200}
          suffix="%"
          onChange={n => setInputs(s => ({ ...s, expensePct: n }))}
        />
        <Slider
          label="Headcount Expansion"
          value={inputs.newHeadcount}
          min={0}
          max={10}
          suffix={inputs.newHeadcount === 1 ? ' unit' : ' units'}
          onChange={n => setInputs(s => ({ ...s, newHeadcount: n }))}
        />
        <Slider
          label="Unit Unit Cost (£/mo)"
          value={inputs.salaryPerHire}
          min={1500}
          max={10000}
          step={500}
          suffix=""
          onChange={n => setInputs(s => ({ ...s, salaryPerHire: n }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ResultTile
          label="Projected 30d Profit"
          baseValue={baseKpis.last30Profit}
          scenarioValue={scenarioKpis.last30Profit}
        />
        <ResultTile
          label="Projected 30d Revenue"
          baseValue={baseKpis.last30Revenue}
          scenarioValue={scenarioKpis.last30Revenue}
        />
        <ResultTile
          label="Projected 30d Expense"
          baseValue={baseKpis.last30Expense}
          scenarioValue={scenarioKpis.last30Expense}
          inverse
        />
      </div>

      {chartData.length > 0 && (
        <div className="h-64 sm:h-72 md:h-80 bg-slate-50/50 p-4 rounded-3xl border border-slate-100 shadow-inner">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} fontWeight={800} axisLine={false} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                fontWeight={800}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => '£' + (v / 1000).toFixed(0) + 'k'}
              />
              <Tooltip
                cursor={{fill: '#f1f5f9'}}
                contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, fontSize: 12, fontWeight: 700, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                formatter={(v) => '£' + Math.round(v as number).toLocaleString('en-GB')}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 20 }} />
              <Bar dataKey="baseProfit" name="Base Delta" fill="#94a3b8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="scenarioProfit" name="Scenario Delta" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {baseForecast && scenarioForecast && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {baseForecast.map((b, i) => {
            const s = scenarioForecast[i];
            const baseProfit = b.predictedRevenue - b.predictedExpense;
            const scenProfit = s.predictedRevenue - s.predictedExpense;
            const days = [30, 60, 90][i];
            return (
              <div key={b.point} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-blue-300 transition-all">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mb-3">
                  <span>{days}-Day Delta</span>
                  <div className={`w-2 h-2 rounded-full ${scenProfit >= baseProfit ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-tight">Base</span>
                    <span className="text-slate-900 font-black font-mono">{gbp(baseProfit)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-slate-900 font-black text-xs uppercase tracking-tight">Scenario</span>
                    <span className={`text-lg font-black font-mono tracking-tight ${scenProfit >= baseProfit ? 'text-blue-600' : 'text-red-600'}`}>
                      {gbp(scenProfit)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dirty && (
        <div className="flex items-center justify-center p-3 bg-blue-50 border border-blue-100 rounded-xl shadow-sm">
          <p className="text-[11px] text-blue-700 font-black uppercase tracking-widest">
            Net Profit variance vs baseline: {profitDeltaPct > 0 ? '+' : ''}{profitDeltaPct}%
          </p>
        </div>
      )}
    </div>
  );
};

const ResultTile: React.FC<{
  label: string;
  baseValue: number;
  scenarioValue: number;
  inverse?: boolean;
}> = ({ label, baseValue, scenarioValue, inverse }) => {
  const delta = scenarioValue - baseValue;
  const positive = inverse ? delta < 0 : delta > 0;
  const flat = delta === 0;
  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm group hover:border-blue-200 transition-all">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{label}</div>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xl font-black text-slate-900 tracking-tight font-mono">{gbp(scenarioValue)}</span>
          {!flat && (
            <div className={`flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm border ${positive ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-red-700 bg-red-50 border-red-100'}`}>
              {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {gbp(Math.abs(delta))}
            </div>
          )}
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">
          Base Signal: {gbp(baseValue)}
        </div>
      </div>
    </div>
  );
};
