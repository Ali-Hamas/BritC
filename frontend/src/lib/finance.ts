import { supabase } from './supabase';
import type { FinanceEntry } from './financeAnalytics';
import { monthlyAggregate } from './financeAnalytics';

export type { FinanceEntry } from './financeAnalytics';

/** Legacy shape kept for backwards compatibility with older callers. */
export interface ForecastData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface FinanceGoals {
  user_id: string;
  target_monthly_revenue: number | null;
  target_margin_pct: number | null;
  updated_at?: string;
}

export interface NewEntryInput {
  entry_date: string;
  type: 'revenue' | 'expense';
  category: string;
  amount: number;
  note?: string | null;
}

const TABLE_ENTRIES = 'finance_entries';
const TABLE_GOALS = 'finance_goals';

export const REVENUE_CATEGORIES = [
  'Retainer',
  'One-off Project',
  'Product Sale',
  'Subscription',
  'Consulting',
  'Affiliate',
  'Other Revenue',
];

export const EXPENSE_CATEGORIES = [
  'Salaries',
  'Contractors',
  'Ads',
  'Software',
  'Hosting',
  'Office',
  'Travel',
  'Equipment',
  'Taxes',
  'Other Expense',
];

export const FinanceService = {
  async listEntries(userId: string): Promise<FinanceEntry[]> {
    if (!userId) return [];
    const { data, error } = await supabase
      .from(TABLE_ENTRIES)
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .limit(2000);

    if (error) {
      console.warn('[FinanceService] listEntries failed:', error.message);
      return [];
    }
    return (data || []) as FinanceEntry[];
  },

  async addEntry(userId: string, input: NewEntryInput): Promise<FinanceEntry | null> {
    if (!userId) throw new Error('Not signed in');
    const row = {
      user_id: userId,
      entry_date: input.entry_date,
      type: input.type,
      category: input.category,
      amount: input.amount,
      note: input.note ?? null,
    };
    const { data, error } = await supabase
      .from(TABLE_ENTRIES)
      .insert([row])
      .select()
      .single();
    if (error) {
      console.error('[FinanceService] addEntry failed:', error.message);
      throw new Error(error.message);
    }
    return data as FinanceEntry;
  },

  async bulkAddEntries(userId: string, inputs: NewEntryInput[]): Promise<number> {
    if (!userId) throw new Error('Not signed in');
    if (!inputs.length) return 0;
    const rows = inputs.map(i => ({
      user_id: userId,
      entry_date: i.entry_date,
      type: i.type,
      category: i.category,
      amount: i.amount,
      note: i.note ?? null,
    }));
    const { error, count } = await supabase
      .from(TABLE_ENTRIES)
      .insert(rows, { count: 'exact' });
    if (error) {
      console.error('[FinanceService] bulkAddEntries failed:', error.message);
      throw new Error(error.message);
    }
    return count ?? rows.length;
  },

  async deleteEntry(userId: string, id: string): Promise<boolean> {
    if (!userId || !id) return false;
    const { error } = await supabase
      .from(TABLE_ENTRIES)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      console.warn('[FinanceService] deleteEntry failed:', error.message);
      return false;
    }
    return true;
  },

  async getGoals(userId: string): Promise<FinanceGoals | null> {
    if (!userId) return null;
    const { data, error } = await supabase
      .from(TABLE_GOALS)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.warn('[FinanceService] getGoals failed:', error.message);
      return null;
    }
    return (data as FinanceGoals) || null;
  },

  /**
   * Legacy compatibility: returns actual aggregated monthly history (last 12 months),
   * padded with zeros if empty. Kept so older callers (agent.ts, metrics.ts,
   * IntelligenceView.tsx) continue to work. No longer fabricates demo data.
   */
  async getForecast(_profile?: any, userId?: string): Promise<ForecastData[]> {
    if (!userId) return [];
    const entries = await this.listEntries(userId);
    const agg = monthlyAggregate(entries);
    return agg.slice(-12).map(m => ({
      month: m.label,
      revenue: m.revenue,
      expenses: m.expense,
      profit: m.profit,
    }));
  },

  /** Legacy compatibility stub — growth opportunities now live in narrative. */
  async getGrowthOpportunities(_profile?: any): Promise<{ title: string; description: string; impact: string }[]> {
    return [];
  },

  async saveGoals(userId: string, goals: Partial<FinanceGoals>): Promise<FinanceGoals | null> {
    if (!userId) throw new Error('Not signed in');
    const row = {
      user_id: userId,
      target_monthly_revenue: goals.target_monthly_revenue ?? null,
      target_margin_pct: goals.target_margin_pct ?? null,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from(TABLE_GOALS)
      .upsert(row, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) {
      console.error('[FinanceService] saveGoals failed:', error.message);
      throw new Error(error.message);
    }
    return data as FinanceGoals;
  },
};
