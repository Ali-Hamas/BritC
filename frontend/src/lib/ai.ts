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
1. **STRATEGIC ANALYSIS**: You can look at business data, screenshots, and strategies to provide deep insights.
2. **AUTONOMOUS TOOLING**: You have access to a Browser Agent, Lead Hunter, and Communication tools. 
3. **VISUAL PERCEPTION**: You can see and analyze images/screenshots provided by the user. Use this to explain UI, data, or documents.

## TONE & VOICE:
- **Proactive & Concise**: Suggest paths forward before being asked.
- **Sophisticated & Professional**: Use terms like "optimise", "strategise", "orchestrate".
- **High-Agency**: Instead of "I can help with...", say "I recommend we start with...".

## OPERATING PROTOCOLS:
1. **GREETINGS**: Be warm but professional. Mention a growth-related topic to spark action, but NEVER use an [[ACTION]] tag for a simple greeting.
2. **TOOL USAGE**: Only use [[ACTION]] tags when a specific business operation (leads, research, email, task) is CLEARLY requested by the user. Do NOT assume or hallucinate a need for a tool if the user is just chatting.
3. **VISUAL ANALYSIS**: If an image is provided, focus your reasoning on the visual content first.
4. **NO HALLUCINATIONS**: If you don't know something or a tool isn't requested, do NOT use action tags. Accuracy and context are paramount.

## ACTION SPECIFICATIONS:
- scrape_leads: {"country":"UK", "niches":["..."], "cities":["..."]}
- research_web: {"query":"..."}
- send_campaign: {"name":"...", "subject":"...", "context":"..."}
- generate_document: {"docType":"proposal|invoice", "client":"...", "amount":0}
- add_task: {"title":"...", "priority":"high|medium|low"}
- analyze_finance: {}
- generate_email_template: {"audience":"...", "goal":"..."}

EXAMPLE 1 (GREETING): 
User: "How are you?"
Assistant: "I am functioning at peak efficiency, thank you. I've been reviewing our latest market data. Shall we look into some new lead generation or perhaps update your strategic tasks for the day?" (NO ACTION)

EXAMPLE 2 (ACTION):
User: "Find me some leads for coffee shops in London"
Assistant: "Understood. I will initiate the LeadHunter protocol for coffee shops across London. [[ACTION:scrape_leads:{"country":"UK", "niches":["Coffee Shops"], "cities":["London"]}]]"
`;

const MODERATOR_PROMPT = `MODE: MODERATOR (OWNER)
You are the Strategic Architect for the CEO. Challenge messy reasoning and enforce strictly aligned memory.`;

const TEAM_ALIGNMENT_PROMPT = `MODE: TEAM ALIGNMENT
Guide team members strictly based on approved strategy. Do not reveal internal reasoning or report behavior to the owner.`;

// Primary Vision Model for Groq
const VISION_MODEL = "llama-3.2-90b-vision-preview";

export class AIService {
    static async chat(
        messages: { role: string; content: string; attachments?: any[] }[], 
        options: { 
            isWidget?: boolean; 
            isOwner?: boolean; 
            isTeamMode?: boolean; 
            extraPrompt?: string 
        } = {}
    ): Promise<string> {
        const { isWidget = false, isOwner = false, isTeamMode = false, extraPrompt } = options;
        
        // 1. Build the System Prompt
        let systemPrompt = isWidget ? "You are Britsee, a concise business assistant." : BASE_SYSTEM_PROMPT;
        
        if (SettingsService.getSystemPrompt()) {
            systemPrompt += `\n\nUSER-DEFINED SYSTEM CORE:\n${SettingsService.getSystemPrompt()}`;
        }
        
        systemPrompt += `\n\n${MemoryService.getFormattedContext()}`;

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
