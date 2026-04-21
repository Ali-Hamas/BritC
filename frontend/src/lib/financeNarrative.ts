import { AIService } from './ai';
import type { FinanceKpis, ForecastPoint, Anomaly, CategoryBreakdown } from './financeAnalytics';

/**
 * AI narrative wrapper. Receives pre-computed numbers; never asked to
 * predict or invent them. Returns 3-4 short paragraphs of plain English
 * commentary with a mandatory "not financial advice" closer.
 */

const NARRATIVE_SYSTEM_PROMPT = `You are a finance analyst writing for a UK small-business owner.

STRICT RULES:
1. You will be given pre-calculated numbers in a JSON summary.
2. NEVER invent, predict, change, or round any number. Use only the numbers provided.
3. If a number is missing, say so plainly rather than guessing.
4. Do NOT give tax, legal, investment, or regulated financial advice.
5. Write 3-4 short paragraphs in plain British English.
6. Explain what the numbers IMPLY about the business (trend, health, concentration risk, etc.).
7. End with ONE concrete, non-regulated operational suggestion (e.g. "review ad spend" — not "restructure your tax").
8. Use £ for all money. Never use $.
9. Do not use markdown headings, lists, or emoji. Plain paragraphs only.`;

export interface FinanceSummaryPayload {
  kpis: FinanceKpis;
  forecasts?: ForecastPoint[] | null;
  anomalies?: Anomaly[];
  topCategories?: CategoryBreakdown[];
  businessName?: string;
  industry?: string;
  entryCount: number;
}

export const FinanceNarrativeService = {
  async generate(summary: FinanceSummaryPayload): Promise<string> {
    if (summary.entryCount === 0) {
      return 'No finance entries yet. Add some revenue and expense entries to see AI commentary here.';
    }

    const payload = {
      business: summary.businessName || 'this business',
      industry: summary.industry || 'unspecified',
      entryCount: summary.entryCount,
      last30Days: {
        revenueGBP: summary.kpis.last30Revenue,
        expenseGBP: summary.kpis.last30Expense,
        profitGBP: summary.kpis.last30Profit,
        marginPct: summary.kpis.marginPct,
        revenueChangeVsPrior30DaysPct: summary.kpis.revenueChangePct,
        runwayDays: summary.kpis.runwayDays,
      },
      forecastGBP: summary.forecasts
        ? summary.forecasts.map(f => ({
            horizon: f.point,
            predictedRevenue: f.predictedRevenue,
            predictedExpense: f.predictedExpense,
          }))
        : 'insufficient data (needs at least 7 days of entries)',
      topExpenseCategoriesLast30Days: (summary.topCategories || []).map(c => ({
        category: c.category,
        amountGBP: Math.round(c.amount),
        sharePct: Math.round(c.pct * 10) / 10,
      })),
      flaggedAnomalies: (summary.anomalies || []).slice(0, 5).map(a => ({
        date: a.date,
        category: a.category,
        amountGBP: a.amount,
        reason: a.reason,
      })),
    };

    const user = `Here are the pre-calculated numbers for ${payload.business}:

${JSON.stringify(payload, null, 2)}

Write the 3-4 paragraph commentary now. Finish with: "This is an AI estimate, not financial advice."`;

    const response = await AIService.chat(
      [
        { role: 'system', content: NARRATIVE_SYSTEM_PROMPT },
        { role: 'user', content: user },
      ],
      { isWidget: false }
    );

    // Safety net: ensure the disclaimer is always present.
    if (!/not financial advice/i.test(response)) {
      return response.trim() + '\n\nThis is an AI estimate, not financial advice.';
    }
    return response.trim();
  },
};
