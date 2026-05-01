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
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      <span className="text-sm font-mono font-bold text-white">
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
      className="w-full accent-indigo-500"
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
    <div className="glass-card p-5 space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sliders size={14} className="text-indigo-400" /> Scenario Simulator
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20">
            {FINANCE_STYLE_LABELS[style]} preset
          </span>
        </h3>
        {dirty && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition-colors"
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500 -mt-2">
        Drag the sliders to model what-if scenarios. Numbers stay in your head — nothing is saved.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Slider
          label="Revenue change"
          value={inputs.revenuePct}
          min={-50}
          max={200}
          suffix="%"
          onChange={n => setInputs(s => ({ ...s, revenuePct: n }))}
        />
        <Slider
          label="Expense change"
          value={inputs.expensePct}
          min={-50}
          max={200}
          suffix="%"
          onChange={n => setInputs(s => ({ ...s, expensePct: n }))}
        />
        <Slider
          label="New hires"
          value={inputs.newHeadcount}
          min={0}
          max={10}
          suffix={inputs.newHeadcount === 1 ? ' person' : ' people'}
          onChange={n => setInputs(s => ({ ...s, newHeadcount: n }))}
        />
        <Slider
          label="Salary per hire (£/mo)"
          value={inputs.salaryPerHire}
          min={1500}
          max={10000}
          step={500}
          suffix=""
          onChange={n => setInputs(s => ({ ...s, salaryPerHire: n }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
        <div className="h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickFormatter={v => '£' + (v / 1000).toFixed(0) + 'k'}
              />
              <Tooltip
                contentStyle={{ background: '#0a0b14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                formatter={(v) => '£' + Math.round(v as number).toLocaleString('en-GB')}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="baseProfit" name="Baseline profit" fill="#475569" radius={[4, 4, 0, 0]} />
              <Bar dataKey="scenarioProfit" name="Scenario profit" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {baseForecast && scenarioForecast && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {baseForecast.map((b, i) => {
            const s = scenarioForecast[i];
            const baseProfit = b.predictedRevenue - b.predictedExpense;
            const scenProfit = s.predictedRevenue - s.predictedExpense;
            const days = [30, 60, 90][i];
            return (
              <div key={b.point} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {days}-day projection
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Baseline</span>
                    <span className="text-slate-300 font-mono">{gbp(baseProfit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Scenario</span>
                    <span className={`font-mono font-bold ${scenProfit >= baseProfit ? 'text-emerald-300' : 'text-rose-300'}`}>
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
        <p className="text-[11px] text-slate-500 italic">
          Profit shift vs baseline: {profitDeltaPct > 0 ? '+' : ''}{profitDeltaPct}%
        </p>
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
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-lg font-black text-white tracking-tight">{gbp(scenarioValue)}</span>
        {!flat && (
          <span className={`text-[11px] font-semibold flex items-center gap-1 ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {gbp(Math.abs(delta))}
          </span>
        )}
      </div>
      <div className="text-[11px] text-slate-500 mt-1">
        Baseline {gbp(baseValue)}
      </div>
    </div>
  );
};





