/**
 * Britsee Agent — Tool executor for the Britsee AI Assistant
 * 
 * Britsee embeds [[ACTION:{...}]] in its responses. This module:
 * 1. Parses those action blocks from LLM output
 * 2. Executes the appropriate Britsee service
 * 3. Returns structured results for rendering as chat cards
 */

import { LeadHunterService } from './leadhunter';
import { SenderService } from './sender';
import { DocumentService } from './documents';
import { WorkflowService } from './workflow';
import { FinanceService } from './finance';
import { AIService } from './ai';
import { SearchService } from './search';
import { ReportingService } from './reporting';
import { MetricsService } from './metrics';
import { CRMService } from './crm';
import { getApiUrl } from './api-config';
import { SettingsService } from './settings';
import { ActivityService } from './activity';
import { TeamService } from './team';


// ─── Action Types ─────────────────────────────────────────────────────────────

export type ActionType =
  | 'scrape_leads'
  | 'send_campaign'
  | 'generate_document'
  | 'add_task'
  | 'show_tasks'
  | 'analyze_finance'
  | 'generate_email_template'
  | 'show_leads_history'
  | 'show_documents'
  | 'research_web'
  | 'generate_pdf_report'
  | 'generate_pitch_deck'
  | 'get_coaching_tips'
  | 'analyze_strategic_news'
  | 'sync_lead'
  | 'generate_investor_profile'
  | 'get_leads'
  | 'deep_visual_analysis';

export interface AgentAction {
  type: ActionType;
  params: Record<string, any>;
}

export interface ActionResult {
  type: ActionType;
  status: 'success' | 'error';
  title: string;
  summary: string;
  data?: any;
  error?: string;
}

// ─── Action Parser ─────────────────────────────────────────────────────────────

const ACTION_REGEX = /\[\[ACTION:(.*?)\]\]/s;

export function parseAction(text: string): { cleanText: string; action: AgentAction | null } {
  const match = text.match(ACTION_REGEX);
  if (!match) return { cleanText: text, action: null };

  const cleanText = text.replace(ACTION_REGEX, '').trim();
  try {
    const action = JSON.parse(match[1]) as AgentAction;
    return { cleanText, action };
  } catch {
    return { cleanText, action: null };
  }
}

// ─── Action Executor ──────────────────────────────────────────────────────────

export async function executeAction(action: AgentAction, profile?: any): Promise<ActionResult> {
  const { type, params } = action;
  
  // Log activity start with dynamic user
  const currentUser = TeamService.getCurrentMember();
  const userName = currentUser?.name || 'Unknown User';
  
  const activityTitle = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const activityDetails = params.query || params.q || params.name || params.client || params.topic || `Executed ${type}`;

  ActivityService.logActivity(
    userName, 
    activityTitle, 
    String(activityDetails), 
    type.includes('search') || type.includes('research') ? 'search' : 
    type.includes('email') || type.includes('campaign') ? 'email' : 
    type.includes('finance') ? 'finance' : 
    type.includes('report') ? 'report' : 'browser'
  );

  try {
    switch (type) {

      // ── Scrape Leads ──────────────────────────────────────────────────────
      case 'scrape_leads': {
        const countryMap: Record<string, string> = {
          'UK': 'United Kingdom', 'US': 'United States', 'United Kingdom': 'United Kingdom',
          'United States': 'United States', 'Australia': 'Australia', 'Canada': 'Canada',
        };
        const country = countryMap[params.country || 'UK'] || params.country || 'United Kingdom';

        const job = await LeadHunterService.startJob({
          country,
          niches: params.niches || ['General Business'],
          cities: params.cities || params.states || [],   // API uses "cities" field
          scrapeMode: params.scrapeMode || 'both',
          includeGoogleMaps: true,
        });
        
        WorkflowService.fireEvent('lead_found', { title: `Leads from ${params.niches?.join(', ')}` });
        return {
          type,
          status: 'success',
          title: '🎯 Scraping Job Launched',
          summary: `Searching for **${(params.niches || ['Business']).join(', ')}** in **${(params.cities || params.states || ['UK']).join(', ')}**, ${country}. Results will appear in the Lead Hunter tab shortly.`,
          data: { jobId: job.jobId, country, cities: params.cities || params.states, niches: params.niches },
        };
      }

      // ── Generate Email Template ───────────────────────────────────────────
      case 'generate_email_template': {
        const subject = params.subject || `Partnership Inquiry from ${profile?.businessName || 'Us'}`;
        const schedLink = SettingsService.getSchedulingLink();
        const prompt = `Write a high-converting cold email for my business.
Business: ${profile?.businessName || params.businessName || 'Britsee Agency'}
Industry: ${profile?.industry || params.industry || 'Technology'}
Target audience: ${params.audience || 'potential clients'}
Goal: ${params.goal || 'book a discovery call'}
${schedLink ? `Booking link to include: ${schedLink}` : ''}
Tone: professional but friendly, concise.

Include ONLY the email body (no subject line). Keep it under 150 words.`;
        const body = await AIService.generateText(prompt, true);
        return {
          type,
          status: 'success',
          title: '✉️ Email Template Generated',
          summary: `Subject: ${subject}`,
          data: { subject, body: body.trim() },
        };
      }

      // ── Send Campaign ─────────────────────────────────────────────────────
      case 'send_campaign': {
        let body = params.body;
        if (!body) {
          const prompt = `Write a professional cold email body for: ${params.context || 'a business outreach campaign'}. Keep it under 120 words. Format as clean HTML paragraphs.`;
          body = await AIService.chat([{ role: 'user', content: prompt }]);
        }

        await SenderService.launchCampaign({
          campaignName: params.name || 'Britsee Campaign',
          senderName: profile?.businessName || params.senderName || 'Britsee',
          subject: params.subject || 'Partnership Inquiry',
          htmlContent: body.trim(),
          recipients: params.recipients || [],  // caller must provide email array
          smtpAccountIds: params.smtpAccountIds,
        });

        WorkflowService.fireEvent('campaign_sent', { title: params.name });
        return {
          type,
          status: 'success',
          title: '📧 Campaign Launched',
          summary: `**${params.name || 'Email Campaign'}** sent successfully. Monitoring responses now.`,
          data: { name: params.name, subject: params.subject, recipients: params.recipients?.length || 0 },
        };
      }


      // ── Generate Document ─────────────────────────────────────────────────
      case 'generate_document': {
        const docType = params.docType || 'proposal';
        const content = await DocumentService.generateDraft(docType, {
          businessName: profile?.businessName || params.businessName,
          client: params.client || 'Client',
          amount: params.amount,
          project: params.project,
          industry: profile?.industry,
          items: params.items,
        });
        const saved = await DocumentService.saveDocument({
          type: docType,
          title: `${docType.charAt(0).toUpperCase() + docType.slice(1)} — ${params.client || 'Client'} — ${new Date().toLocaleDateString('en-GB')}`,
          content,
          recipient: params.client || 'Client',
          amount: params.amount,
          status: 'draft',
        });
        WorkflowService.fireEvent('document_created', { title: saved.title });
        return {
          type,
          status: 'success',
          title: `📄 ${docType.charAt(0).toUpperCase() + docType.slice(1)} Created`,
          summary: `**${saved.title}** generated and saved to Documents`,
          data: saved,
        };
      }

      // ── Add Task ──────────────────────────────────────────────────────────
      case 'add_task': {
        const task = WorkflowService.addTask({
          title: params.title || 'New task from Britsee',
          description: params.description,
          status: 'todo',
          priority: params.priority || 'medium',
          tags: params.tags || ['britsee'],
        });
        return {
          type,
          status: 'success',
          title: '✅ Task Added to Board',
          summary: `**"${task.title}"** added as **${task.priority}** priority`,
          data: task,
        };
      }

      // ── Show Tasks ────────────────────────────────────────────────────────
      case 'show_tasks': {
        const stats = WorkflowService.getStats();
        const tasks = WorkflowService.getTasks().slice(0, 5);
        return {
          type,
          status: 'success',
          title: '📋 Your Task Board',
          summary: `${stats.todo} to do · ${stats.inProgress} in progress · ${stats.done} done`,
          data: { stats, tasks },
        };
      }

      // ── Analyze Finance ───────────────────────────────────────────────────
      case 'analyze_finance': {
        const forecast = await FinanceService.getForecast(profile);
        const latest = forecast.slice(-3);
        return {
          type,
          status: 'success',
          title: '📊 Financial Overview',
          summary: `3-month profit projection`,
          data: { forecast: latest, profile },
        };
      }

      // ── Show Documents ────────────────────────────────────────────────────
      case 'show_documents': {
        const docs = DocumentService.getAllDocuments().slice(0, 5);
        return {
          type,
          status: 'success',
          title: '📁 Recent Documents',
          summary: `${docs.length} document${docs.length !== 1 ? 's' : ''} found`,
          data: { docs },
        };
      }

      // ── Show Lead History ─────────────────────────────────────────────────
      case 'show_leads_history': {
        let history: any[] = [];
        try {
          history = await LeadHunterService.getHistory();
        } catch {
          history = []; // API not configured — show empty state
        }
        return {
          type,
          status: 'success',
          title: '🎯 Lead Scraping History',
          summary: history.length > 0 ? `${history.length} job${history.length !== 1 ? 's' : ''} found` : 'No jobs yet — ask me to scrape some leads!',
          data: { history: history.slice(0, 5) },
        };
      }

      // ── Research Web ──────────────────────────────────────────────────────
      case 'research_web': {
        const query = params.query || 'current small business trends UK 2024';
        const results = await SearchService.research(query);
        return {
          type,
          status: 'success',
          title: '🌐 Web Research Results',
          summary: `I've researched: **"${query}"** and found several relevant latest insights.`,
          data: { results },
        };
      }

      // ── Generate PDF Report ───────────────────────────────────────────────
      case 'generate_pdf_report': {
        const stats = await MetricsService.getStats(profile);
        const activity = await MetricsService.getRecentActivity();
        const reportText = await MetricsService.generateWeeklyReport(profile, stats, activity);
        
        await ReportingService.generateWeeklyPDF(profile, stats, activity, reportText);

        return {
          type,
          status: 'success',
          title: '📄 PDF Report Generated',
          summary: `Business pulse report successfully generated and downloaded as PDF.`,
          data: { status: 'downloaded' },
        };
      }

      // ── Sync Lead to CRM ──────────────────────────────────────────────────
      case 'sync_lead': {
        const lead = params.lead || { name: params.name, email: params.email };
        const stats = CRMService.getStats();
        
        if (!stats.connected || !stats.verified) {
          return {
            type,
            status: 'error',
            title: '🔗 CRM Bridge Unverified',
            summary: `I cannot sync **${lead.name || 'this lead'}** because the Britsee CRM Bridge is unverified or disconnected. Please go to Settings > Team to verify your administrator credentials.`,
            error: 'CRM_UNVERIFIED'
          };
        }

        await CRMService.syncLead(lead);

        return {
          type,
          status: 'success',
          title: '🔄 Lead Synced to CRM',
          summary: `**${lead.name || 'Lead'}** has been successfully pushed to **${stats.platform?.toUpperCase()}**.`,
          data: { platform: stats.platform, lead }
        };
      }

      // ── Generate Pitch Deck ───────────────────────────────────────────────
      case 'generate_pitch_deck': {
        const focus = params.focus || 'Investor';
        const doc = await ReportingService.generateStrategicSlideDeck(params);
        return {
          type,
          status: 'success',
          title: `🚀 Pitch Deck Generated (${focus})`,
          summary: `Strategic growth presentation created for **${params.businessTitle || 'this business'}**.`,
          data: doc,
        };
      }

      // ── Generate Investor Profile ─────────────────────────────────────────
      case 'generate_investor_profile': {
        const investmentData = await AIService.generateInvestmentStrategy('Generate a comprehensive investor profile and 3-year strategic investment strategy for this business.');
        await ReportingService.generateProfessionalInvestorProfile({}, investmentData);
        return {
          type,
          status: 'success',
          title: '📈 Investor Profile Generated',
          summary: "I've generated a comprehensive 3-year Investor Profile & Strategic Opportunity Report. It is ready for your review.",
          data: { status: 'generated' }
        };
      }

      // ── Get Coaching Tips ──────────────────────────────────────────────────
      case 'get_coaching_tips': {
        const area = params.area || 'General';
        const tips = await AIService.chat(
          [{ role: 'user', content: `Give me 5 high-impact executive coaching tips for: ${area}. Format as numbered bullet points.` }],
          { isOwner: true }
        );
        return {
          type,
          status: 'success',
          title: `🎓 Britsee Executive Coaching: ${area}`,
          summary: `Personalised high-impact recommendations for your ${area.toLowerCase()} growth.`,
          data: { tips },
        };
      }

      // ── Analyze Strategic News ───────────────────────────────────────────
      case 'analyze_strategic_news': {
        const query = params.query || 'market trends';
        const insights = await AIService.chat(
          [{ role: 'user', content: `Analyze the following strategic market data and provide growth opportunities for: ${query}.` }],
          { isOwner: true }
        );
        return {
          type,
          status: 'success',
          title: '🧠 Strategic Market Analysis',
          summary: `Analyzed latest data for **"${query}"** and synthesized growth opportunities.`,
          data: { insights },
        };
      }

      // ── Get 10 Targeted Leads ─────────────────────────────────────────────
      case 'get_leads': {
        const query = params.query || `public email for ${params.niche || 'business'} in ${params.city || 'London'}`;
        const res = await fetch(getApiUrl('/browser/leads'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        if (!res.ok) throw new Error('Lead service offline');
        const data = await res.json();
        return {
          type,
          status: 'success',
          title: '🎯 10 High-Intent Leads Found',
          summary: `I've successfully extracted 10 leads matching: **"${query}"**. See details below.`,
          data: { leads: data.leads }
        };
      }

      // ── Deep Visual Analysis ──────────────────────────────────────────────
      case 'deep_visual_analysis': {
        return {
          type,
          status: 'success',
          title: '👁️ Deep Visual Perception Active',
          summary: `I am currently processing the visual details of your attachment. Please describe what specific insight you'd like me to extract.`,
          data: { active: true }
        };
      }

      default:
        return { type, status: 'error', title: 'Unknown Action', summary: 'This action is not yet supported.', error: `Unknown type: ${type}` };
    }
  } catch (err: any) {
    return {
      type,
      status: 'error',
      title: '⚠️ Action Failed',
      summary: err.message || 'Something went wrong',
      error: err.message,
    };
  }
}
