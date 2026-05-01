// Pure-JS port of selected functions from
// frontend/src/lib/financeAnalytics.ts. Server-side cron jobs use this so
// they don't depend on the React bundle. Keep math identical.

const MS_PER_DAY = 86400000;

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function expenseByCategory(entries, withinLastDays) {
  const cutoff = withinLastDays
    ? toISODate(new Date(Date.now() - withinLastDays * MS_PER_DAY))
    : null;

  const totals = new Map();
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

function detectAnomalies(entries, lookbackDays = 90) {
  const cutoff = toISODate(new Date(Date.now() - lookbackDays * MS_PER_DAY));
  const recent = entries.filter(e => e.entry_date >= cutoff);
  const byCat = new Map();
  for (const e of recent) {
    const k = `${e.type}::${e.category}`;
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k).push(e);
  }
  const out = [];
  for (const list of byCat.values()) {
    if (list.length < 4) continue;
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
        });
      }
    }
  }
  return out;
}

function computeKpis(entries) {
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
  const runway = dailyBurn > 0 && profit < 0
    ? Math.max(0, Math.floor(Math.abs(profit) / dailyBurn))
    : null;

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

module.exports = { computeKpis, expenseByCategory, detectAnomalies };
