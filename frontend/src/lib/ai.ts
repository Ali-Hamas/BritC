import { GroqService } from './groq';
import type { GroqMessage } from './groq';
import { SettingsService } from './settings';
import { MemoryService } from './memory';

/**
 * BritSee Cognitive Architecture
 * - Moderator Mode: Cognitive Interface for Owner (Challenges & Structures intent)
 * - Team Mode: Alignment Engine using Strategic Memory (Guided but private)
 * - Individual Mode: Personal AI Assistant (Standard)
 */

const BASE_SYSTEM_PROMPT = `You are Britsee (Business Revenue Intel & Growth Companion), a high-tier Strategic AI Assistant. 

## YOUR IDENTITY:
You are not a simple chatbot; you are a reasoning partner. You are proactive, decisive, and dedicated to business growth. You speak refined British English.

## CORE CAPABILITIES:
1. **STRATEGIC ANALYSIS**: You analyze live business pulse (finance, ops) to provide deep, data-driven insights.
2. **AUTONOMOUS TOOLING**: You have access to a Browser Agent, Lead Hunter, and Communication tools. 
3. **OPERATIONAL EXCELLENCE**: You detect bottlenecks and suggest immediate "what-if" scenarios for growth.

## TONE & VOICE:
- **Proactive & Concise**: Suggest paths forward before being asked. If you see underperforming KPIs in the context, mention them.
- **Sophisticated & Professional**: Use terms like "optimise", "strategise", "orchestrate".
- **High-Agency**: Instead of "I can help with...", say "I recommend we start with...".

## OPERATING PROTOCOLS:
1. **PROACTIVE GROWTH**: Always relate the conversation back to the business's current goals and financial health.
2. **TOOL USAGE**: Only use [[ACTION]] tags when a specific business operation (leads, research, email, task) is CLEARLY requested or required to fix a bottleneck.
3. **DATA AWARENESS**: Use the provided [BUSINESS PULSE] and [BOTTLENECKS] to ground your advice in reality.

## ACTION SPECIFICATIONS:
- scrape_leads: {"country":"UK", "niches":["..."], "cities":["..."]}
- research_web: {"query":"..."}
- send_campaign: {"name":"...", "subject":"...", "context":"..."}
- generate_document: {"docType":"proposal|invoice|pitch_deck", "client":"...", "amount":0}
- add_task: {"title":"...", "priority":"high|medium|low"}
- analyze_finance: {}
- generate_email_template: {"audience":"...", "goal":"..."}
`;

const MODERATOR_PROMPT = `MODE: MODERATOR (OWNER)
You are the Strategic Architect for the CEO. Challenge messy reasoning and enforce strictly aligned growth protocols.`;

const TEAM_ALIGNMENT_PROMPT = `MODE: TEAM ALIGNMENT
Guide team members strictly based on approved strategy and live business pulse. Do not reveal internal owner reasoning.`;

// Primary Vision Model for Groq
const VISION_MODEL = "llama-3.2-90b-vision-preview";

export class AIService {
    static async chat(
        messages: { role: string; content: string; attachments?: any[] }[], 
        options: { 
            isWidget?: boolean; 
            isOwner?: boolean; 
            isTeamMode?: boolean; 
            extraPrompt?: string;
            businessPulse?: string;
            bottlenecks?: string;
        } = {}
    ): Promise<string> {
        const { 
            isWidget = false, 
            isOwner = false, 
            isTeamMode = false, 
            extraPrompt,
            businessPulse,
            bottlenecks
        } = options;
        
        // 1. Build the System Prompt
        let systemPrompt = isWidget ? "You are Britsee, a concise business assistant." : BASE_SYSTEM_PROMPT;

        if (SettingsService.getSystemPrompt()) {
            systemPrompt += `\n\nUSER-DEFINED SYSTEM CORE:\n${SettingsService.getSystemPrompt()}`;
        }

        // Pull fresh moderator/team memory from Supabase before each response so
        // members always respond under the latest directives set by the moderator.
        // Non-blocking if it fails — we still have the local cache as fallback.
        try { await MemoryService.autoRefresh(); } catch {}

        // Inject Strategic Memory (moderator directives injected here for team members)
        systemPrompt += `\n\n${MemoryService.getFormattedContext()}`;

        // Inject Live Business Data
        if (businessPulse) {
            systemPrompt += `\n\n${businessPulse}`;
        }
        if (bottlenecks) {
            systemPrompt += `\n\n### DETECTED BOTTLENECKS\n${bottlenecks}`;
        }

        if (isOwner && !isTeamMode) systemPrompt += `\n\n${MODERATOR_PROMPT}`;
        else if (isTeamMode) systemPrompt += `\n\n${TEAM_ALIGNMENT_PROMPT}`;

        if (extraPrompt) systemPrompt += `\n\n${extraPrompt}`;

        const apiKey = SettingsService.getGroqApiKey();
        let model = SettingsService.getGroqModel();

        if (!apiKey) return "⚠️ Groq API key is missing. Please add it in Settings.";

        // 2. Multimodal Processing
        const allMessagesHasImages = messages.some(m => m.attachments?.some(a => a.type?.startsWith('image/')));
        if (allMessagesHasImages) {
            const visionModels = ['llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision'];
            if (!visionModels.includes(model)) {
                model = VISION_MODEL;
            }
        }

        // 3. Build messages for Groq
        try {
            const groqMessages: GroqMessage[] = [{ role: 'system', content: systemPrompt }];

            for (const m of messages) {
                const imageAttachments = m.attachments?.filter(a => a.type?.startsWith('image/'));
                
                if (imageAttachments && imageAttachments.length > 0) {
                    const contentParts: any[] = [{ type: 'text', text: m.content || "Analyze this image." }];
                    
                    for (const img of imageAttachments) {
                        const url = img.previewUrl || img.url;
                        if (url) {
                            contentParts.push({
                                type: 'image_url',
                                image_url: { url }
                            });
                        }
                    }

                    groqMessages.push({ role: m.role as any, content: contentParts });
                } else {
                    groqMessages.push({ role: m.role as any, content: m.content || "" });
                }
            }

            return await GroqService.chat(groqMessages, model, apiKey);
        } catch (error: any) {
            console.error('BritC Engine Error:', error);
            const errMsg = error.message || '';
            if (errMsg.includes('does not support image input') || errMsg.includes('clipboard') || errMsg.includes('MODEL_DOES_NOT_SUPPORT_VISION')) {
                return 'Error: Your selected model does not support image processing. To analyze images, please switch to a vision model in Settings (e.g., llama-3.2-90b-vision-preview).';
            }
            if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
                return 'Error: Cannot connect to AI service. Please ensure your Groq API key is valid and you have an internet connection.';
            }
            return `⚠️ AI Error: ${errMsg || "Failed to connect to context engine."}`;
        }
    }

    // Specialized helpers
    static async generateText(prompt: string, isOwner = false): Promise<string> {
        return AIService.chat([{ role: 'user', content: prompt }], { isOwner });
    }

    static async analyzeFinancialScenario(prompt: string): Promise<string> {
        return AIService.generateText(prompt, true);
    }

    static async generateInvestmentStrategy(prompt: string): Promise<string> {
        return AIService.generateText(prompt, true);
    }
}
