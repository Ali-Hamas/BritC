/**
 * Deterministic finance math — pure functions only.
 * LLMs never generate numbers. These functions do.
 */

export interface FinanceEntry {
  id?: string;
  user_id?: string;
  entry_date: string; // YYYY-MM-DD
  type: 'revenue' | 'expense';
  category: string;
  amount: number;
  note?: string | null;
  created_at?: string;
}

export interface ForecastPoint {
  point: string; // YYYY-MM-DD
  predictedRevenue: number;
  predictedExpense: number;
  confidenceLow: number;
  confidenceHigh: number;
}

export interface DailyAggregate {
  day: string; // YYYY-MM-DD
  revenue: number;
  expense: number;
}

export interface MonthlyAggregate {
  month: string; // YYYY-MM (e.g. "2026-03")
  label: string; // "Mar 2026"
  revenue: number;
  expense: number;
  profit: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  pct: number;
}

export interface Anomaly {
  entryId: string;
  date: string;
  category: string;
  amount: number;
  reason: string;
}

const MIN_POINTS_FOR_FORECAST = 7;

// ─── Helpers ─────────────────────────────────────────────────────────────

const MS_PER_DAY = 86400000;

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseISO(s: string): Date {
  const d = new Date(s + 'T00:00:00Z');
  return d;
}

function diffDays(a: string, b: string): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / MS_PER_DAY);
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// ─── Aggregations ────────────────────────────────────────────────────────

/**
 * Aggregates entries into a dense daily series between earliest and latest
 * date, filling gaps with zeros so regression sees an even timeline.
 */
export function dailyAggregate(entries: FinanceEntry[]): DailyAggregate[] {
  if (!entries.length) return [];
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const start = sorted[0].entry_date;
  const end = sorted[sorted.length - 1].entry_date;
  const span = diffDays(end, start);

  const map = new Map<string, DailyAggregate>();
  for (let i = 0; i <= span; i++) {
    const d = new Date(parseISO(start).getTime() + i * MS_PER_DAY);
    const iso = toISODate(d);
    map.set(iso, { day: iso, revenue: 0, expense: 0 });
  }
  for (const e of entries) {
    const slot = map.get(e.entry_date);
    if (!slot) continue;
    if (e.type === 'revenue') slot.revenue += Number(e.amount) || 0;
    else slot.expense += Number(e.amount) || 0;
  }
  return Array.from(map.values());
}

export function monthlyAggregate(entries: FinanceEntry[]): MonthlyAggregate[] {
  const buckets = new Map<string, MonthlyAggregate>();
  for (const e of entries) {
    const key = monthKey(e.entry_date);
    if (!buckets.has(key)) {
      buckets.set(key, { month: key, label: monthLabel(key), revenue: 0, expense: 0, profit: 0 });
    }
    const b = buckets.get(key)!;
    const amt = Number(e.amount) || 0;
    if (e.type === 'revenue') b.revenue += amt;
    else b.expense += amt;
    b.profit = b.revenue - b.expense;
  }
  return Array.from(buckets.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export function expenseByCategory(
  entries: FinanceEntry[],
  withinLastDays?: number
): CategoryBreakdown[] {
  const cutoff = withinLastDays
    ? toISODate(new Date(Date.now() - withinLastDays * MS_PER_DAY))
    : null;

  const totals = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== 'expense') continue;
    if (cutoff && e.entry_date < cutoff) continue;
    totals.set(e.category, (totals.get(e.category) || 0) + (Number(e.amount) || 0));
  }
  const total = Array.from(totals.values()).reduce((s, v) => s + v, 0);
  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      pct: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

// ─── Linear regression ──────────────────────────────────────────────────

interface RegressionResult {
  slope: number;
  intercept: number;
  residualStdErr: number;
  n: number;
}

function linearRegression(ys: number[]): RegressionResult {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0, residualStdErr: 0, n };
  const xs = ys.map((_, i) => i);
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    ssRes += (ys[i] - predicted) ** 2;
  }
  const residualStdErr = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;
  return { slope, intercept, residualStdErr, n };
}

/**
 * Project forward 30/60/90 days from a daily-aggregated series.
 * Returns null if fewer than MIN_POINTS_FOR_FORECAST points are available.
 */
export function forecast(
  daily: DailyAggregate[],
  horizons: number[] = [30, 60, 90]
): ForecastPoint[] | null {
  if (!daily.length || daily.length < MIN_POINTS_FOR_FORECAST) return null;

  const revenueSeries = daily.map(d => d.revenue);
  const expenseSeries = daily.map(d => d.expense);
  const revReg = linearRegression(revenueSeries);
  const expReg = linearRegression(expenseSeries);

  const lastDate = parseISO(daily[daily.length - 1].day);
  const lastX = daily.length - 1;

  return horizons.map(h => {
    const x = lastX + h;
    const pRev = Math.max(0, revReg.slope * x + revReg.intercept) * 1; // per-day projection
    const pExp = Math.max(0, expReg.slope * x + expReg.intercept) * 1;
    // Sum the projection across the horizon days by trapezoid approximation:
    // (current per-day + projected per-day) / 2 * horizon
    const currentRev = Math.max(0, revReg.slope * lastX + revReg.intercept);
    const currentExp = Math.max(0, expReg.slope * lastX + expReg.intercept);
    const totalRev = ((currentRev + pRev) / 2) * h;
    const totalExp = ((currentExp + pExp) / 2) * h;
    const band = (revReg.residualStdErr + expReg.residualStdErr) * Math.sqrt(h);
    const future = new Date(lastDate.getTime() + h * MS_PER_DAY);
    return {
      point: toISODate(future),
      predictedRevenue: Math.round(totalRev),
      predictedExpense: Math.round(totalExp),
      confidenceLow: Math.round(Math.max(0, totalRev - totalExp - band)),
      confidenceHigh: Math.round(totalRev - totalExp + band),
    };
  });
}

export function canForecast(entries: FinanceEntry[]): boolean {
  return dailyAggregate(entries).length >= MIN_POINTS_FOR_FORECAST;
}

// ─── Anomaly detection ──────────────────────────────────────────────────

/**
 * Flags entries whose amount is more than 2 standard deviations from the
 * mean for that category over the past `lookbackDays`.
 */
export function detectAnomalies(entries: FinanceEntry[], lookbackDays = 90): Anomaly[] {
  const cutoff = toISODate(new Date(Date.now() - lookbackDays * MS_PER_DAY));
  const recent = entries.filter(e => e.entry_date >= cutoff);
  const byCat = new Map<string, FinanceEntry[]>();
  for (const e of recent) {
    const k = `${e.type}::${e.category}`;
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k)!.push(e);
  }
  const out: Anomaly[] = [];
  for (const [, list] of byCat) {
    if (list.length < 4) continue; // need some data to call something "unusual"
    const amounts = list.map(e => Number(e.amount) || 0);
    const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const variance = amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length;
    const std = Math.sqrt(variance);
    if (std === 0) continue;
    for (const e of list) {
      const dev = Math.abs((Number(e.amount) || 0) - mean);
      if (dev > 2 * std && e.id) {
        out.push({
          entryId: e.id,
          date: e.entry_date,
          category: e.category,
          amount: Number(e.amount) || 0,
          reason: `Unusual: £${Math.round(e.amount).toLocaleString()} vs £${Math.round(mean).toLocaleString()} avg for ${e.category}`,
        });
      }
    }
  }
  return out;
}

// ─── KPI summary ────────────────────────────────────────────────────────

export interface FinanceKpis {
  last30Revenue: number;
  last30Expense: number;
  last30Profit: number;
  marginPct: number;
  prev30Revenue: number;
  revenueChangePct: number;
  runwayDays: number | null;
  topCategories: CategoryBreakdown[];
}

export function computeKpis(entries: FinanceEntry[]): FinanceKpis {
  const today = toISODate(new Date());
  const d30 = toISODate(new Date(Date.now() - 30 * MS_PER_DAY));
  const d60 = toISODate(new Date(Date.now() - 60 * MS_PER_DAY));

  let last30Rev = 0;
  let last30Exp = 0;
  let prev30Rev = 0;

  for (const e of entries) {
    const amt = Number(e.amount) || 0;
    if (e.entry_date >= d30 && e.entry_date <= today) {
      if (e.type === 'revenue') last30Rev += amt;
      else last30Exp += amt;
    } else if (e.entry_date >= d60 && e.entry_date < d30) {
      if (e.type === 'revenue') prev30Rev += amt;
    }
  }

  const profit = last30Rev - last30Exp;
  const margin = last30Rev > 0 ? (profit / last30Rev) * 100 : 0;
  const revChange = prev30Rev > 0 ? ((last30Rev - prev30Rev) / prev30Rev) * 100 : 0;
  const dailyBurn = last30Exp / 30;
  const runway = dailyBurn > 0 && profit < 0 ? Math.max(0, Math.floor(Math.abs(profit) / dailyBurn)) : null;

  return {
    last30Revenue: Math.round(last30Rev),
    last30Expense: Math.round(last30Exp),
    last30Profit: Math.round(profit),
    marginPct: Math.round(margin * 10) / 10,
    prev30Revenue: Math.round(prev30Rev),
    revenueChangePct: Math.round(revChange * 10) / 10,
    runwayDays: runway,
    topCategories: expenseByCategory(entries, 30).slice(0, 5),
  };
}
