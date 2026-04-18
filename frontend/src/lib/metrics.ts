import { LeadHunterService } from './leadhunter';
import { SenderService } from './sender';
import { DocumentService } from './documents';
import { WorkflowService } from './workflow';
import { FinanceService } from './finance';
import { AIService } from './ai';

export interface BusinessStats {
  totalLeads: number;
  activeCampaigns: number;
  documentsCreated: number;
  tasksCompleted: number;
  revenueForecast: number;
  conversionRate: number;
}

export interface ActivityEvent {
  id: string;
  type: 'lead' | 'campaign' | 'document' | 'task' | 'finance';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

export const MetricsService = {
  async getStats(profile: any): Promise<BusinessStats> {
    try {
      const leads = await LeadHunterService.getHistory().catch(() => []);
      const campaigns = await SenderService.getCampaigns().catch(() => []);
      const docs = DocumentService.getAllDocuments();
      const workflowStats = WorkflowService.getStats();
      let forecast: any[] = [];
      try {
        forecast = await FinanceService.getForecast(profile);
      } catch (e) {
        forecast = [{ revenue: 0 }];
      }

      const totalLeadsCount = Array.isArray(leads) ? leads.reduce((sum, job) => sum + (job.leadsFound || 0), 0) : 0;
      const conversionRate = totalLeadsCount > 0 ? (docs.length / totalLeadsCount) * 100 : 0;

      return {
        totalLeads: totalLeadsCount,
        activeCampaigns: Array.isArray(campaigns) ? campaigns.length : 0,
        documentsCreated: docs.length,
        tasksCompleted: workflowStats.done,
        revenueForecast: forecast[0]?.revenue || 0,
        conversionRate: Math.round(conversionRate * 10) / 10
      };
    } catch (error) {
      // Metrics gathering often hits partial failures when services are offline - handled silently
      return {
        totalLeads: 0,
        activeCampaigns: 0,
        documentsCreated: 0,
        tasksCompleted: 0,
        revenueForecast: 0,
        conversionRate: 0
      };
    }
  },

  async getRecentActivity(): Promise<ActivityEvent[]> {
    try {
      const leads = await LeadHunterService.getHistory().catch(() => []);
      const docs = DocumentService.getAllDocuments();
      const tasks = WorkflowService.getTasks();

      const activity: ActivityEvent[] = [];

      // Map leads
      if (Array.isArray(leads)) {
        leads.slice(0, 5).forEach(job => {
          activity.push({
            id: job.jobId,
            type: 'lead',
            title: 'New Leads Found',
            description: `Found ${job.leadsFound || 0} leads in ${job.status} job.`,
            timestamp: new Date().toISOString(),
            status: job.status
          });
        });
      }
      
      // Map documents
      docs.slice(0, 5).forEach(doc => {
        activity.push({
          id: doc.id,
          type: 'document',
          title: `Document: ${doc.title}`,
          description: `${doc.type.toUpperCase()} created for ${doc.recipient}.`,
          timestamp: doc.createdAt,
          status: doc.status
        });
      });

      // Map tasks
      tasks.slice(0, 5).forEach(task => {
        activity.push({
          id: task.id,
          type: 'task',
          title: task.title,
          description: `Task marked as ${task.status}.`,
          timestamp: task.createdAt,
          status: task.status
        });
      });

      return activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
    } catch (e) {
      return [];
    }
  },

  async generateWeeklyReport(profile: any, stats: BusinessStats | null, activity: ActivityEvent[]): Promise<string> {
    if (!stats) return "No data available to generate a report.";
    
    const prompt = `As BritC, generate a concise, high-impact Weekly Business Pulse report for ${profile?.business_name || 'this business'}.
    
    Current Stats:
    - Total Leads: ${stats.totalLeads}
    - Active Campaigns: ${stats.activeCampaigns}
    - Documents Created: ${stats.documentsCreated}
    - Revenue Forecast: £${stats.revenueForecast}
    - Conversion Rate: ${stats.conversionRate}%
    
    Recent Activities:
    ${activity.map(a => `- ${a.title}: ${a.description}`).join('\n')}
    
    Provide:
    1. A 2-sentence summary of overall health.
    2. One key performance win.
    3. One critical area for improvement.
    4. A "Proactive Tip" for next week.
    
    Use a professional, encouraging British tone. Keep it under 200 words.`;

    return await AIService.chat([{ role: 'user', content: prompt }]);
  }
};
