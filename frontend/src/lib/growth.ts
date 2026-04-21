import { FinanceService } from './finance';
import { MetricsService } from './metrics';
import { TeamService } from './team';
import type { BusinessProfile } from './profiles';

export interface GrowthInsight {
  type: 'opportunity' | 'warning' | 'info';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export const GrowthService = {
  /**
   * Generates a "Business Context" string for the AI.
   * This combines financial health, marketing stats, and operational status.
   */
  async getBusinessPulse(profile: BusinessProfile | null, userId: string): Promise<string> {
    if (!userId) return "Business context unavailable (Not signed in).";

    try {
      // 1. Fetch Finance Stats
      const forecast = await FinanceService.getForecast(profile, userId);
      const currentMonth = forecast[forecast.length - 1] || { revenue: 0, expenses: 0, profit: 0 };
      const prevMonth = forecast[forecast.length - 2] || { revenue: 0, expenses: 0, profit: 0 };

      // 2. Fetch Operational Stats
      const stats = await MetricsService.getStats(profile);
      const activity = await MetricsService.getRecentActivity();

      // 3. Build Pulse String
      let pulse = `### BUSINESS PULSE (LIVE DATA)\n\n`;
      
      pulse += `[FINANCE]\n`;
      pulse += `- Current Month Revenue: £${currentMonth.revenue.toLocaleString()}\n`;
      pulse += `- Current Month Profit: £${currentMonth.profit.toLocaleString()}\n`;
      pulse += `- Revenue Trend: ${currentMonth.revenue >= prevMonth.revenue ? '↑' : '↓'} vs last month\n\n`;

      pulse += `[OPERATIONS]\n`;
      pulse += `- Total Leads in Database: ${stats.totalLeads}\n`;
      pulse += `- Active Outreach Campaigns: ${stats.activeCampaigns}\n`;
      pulse += `- Documents Created: ${stats.documentsCreated}\n`;
      pulse += `- Task Completion: ${stats.tasksCompleted} tasks done\n\n`;

      pulse += `[RECENT ACTIVITY]\n`;
      activity.slice(0, 3).forEach(a => {
        pulse += `- ${a.title}: ${a.description} (${new Date(a.timestamp).toLocaleDateString()})\n`;
      });

      return pulse;
    } catch (err) {
      console.warn('[GrowthService] Failed to build pulse:', err);
      return "Business context currently unavailable.";
    }
  },

  /**
   * Detects bottlenecks proactively.
   */
  async detectBottlenecks(profile: BusinessProfile | null, userId: string): Promise<GrowthInsight[]> {
    const stats = await MetricsService.getStats(profile);
    const insights: GrowthInsight[] = [];

    // Bottleneck 1: High Lead count but low campaigns
    if (stats.totalLeads > 100 && stats.activeCampaigns === 0) {
      insights.push({
        type: 'warning',
        title: 'Lead Stagnation',
        description: `We have ${stats.totalLeads} leads but zero active outreach campaigns. Potential revenue is sitting idle.`,
        impact: 'high'
      });
    }

    // Bottleneck 2: Low conversion (Leads vs Docs)
    if (stats.totalLeads > 50 && stats.documentsCreated < 2) {
      insights.push({
        type: 'opportunity',
        title: 'Conversion Optimization',
        description: 'Lead volume is high but proposal volume is low. Consider reviewing the initial outreach script.',
        impact: 'medium'
      });
    }

    return insights;
  }
};
