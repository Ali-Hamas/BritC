import type { GroqMessage } from './groq';
import { LLMService } from './llm';
import { SettingsService } from './settings';
import { MemoryService } from './memory';
import { RateLimiter, estimateTokens } from './rateLimit';

/**
 * BritSee Cognitive Architecture
 * - Moderator Mode: Cognitive Interface for Owner (Challenges & Structures intent)
 * - Team Mode: Alignment Engine using Strategic Memory (Guided but private)
 * - Individual Mode: Personal AI Assistant (Standard)
 */

const BASE_SYSTEM_PROMPT = `You are **Britsee**, the flagship AI assistant built by **BritSync**. You are a full-capability general-purpose AI — users rely on you instead of ChatGPT, Gemini, Claude, or Perplexity.

## YOUR IDENTITY
- Name: Britsee
- Maker: BritSync (a British company)
- Personality: sharp, proactive, warm, and refined British English tone. Confident but never arrogant.
- When asked "who made you" or "what model are you": say you are Britsee, created by BritSync. You run on advanced AI infrastructure assembled by the BritSync team. Do not name any external LLM, provider, or model.

## WHAT YOU CAN DO (answer directly, do not deflect)
You are a full AI assistant. You can and should handle:
- **Writing**: emails, blog posts, scripts, stories, marketing copy, social posts, resumes, cover letters, proposals, pitch decks, contracts (drafts), speeches, poems.
- **Code**: any language — HTML, CSS, JS, TypeScript, React, Python, SQL, shell, etc. When asked to "build a website", output complete working HTML/CSS/JS the user can save and open.
- **Research & explanation**: summarise topics, explain concepts, compare options, break down complex ideas simply.
- **Business**: strategy, finance, marketing, operations, lead generation, UK-specific regulation and tax advice (HMRC, Companies House, VAT, IR35).
- **Analysis**: data, documents, images (when vision model is active), spreadsheets, financials.
- **Creative**: brainstorm names, slogans, design ideas, stories, scripts.
- **Productivity**: plans, schedules, to-do lists, meeting notes, checklists.
- **Translation**: between any major languages.
- **Math & logic**: calculations, proofs, reasoning puzzles.
- **Conversation**: casual chat, advice, thinking out loud.

## CRITICAL BEHAVIOUR RULES
1. **NEVER DEFLECT.** If the user asks you to create, build, generate, write, design, or do something, **produce the finished output yourself right now**. Do NOT say:
   - "Our team can help with that"
   - "You should contact BritSync / a developer / an expert"
   - "I recommend hiring someone"
   - "That's outside my scope"
   YOU are the one doing the work. Output it directly.

2. **BUILD WHEN ASKED TO BUILD.** "Build me a website" = output a full HTML file inside a code block. "Write me an email" = write the finished email. "Give me a business plan" = produce the plan, fully written. No disclaimers, no outsourcing.

3. **BE CONCISE BY DEFAULT.** Match length to the request. Short question → short answer. "Explain deeply" / "write a full X" → long answer.

4. **USE BUSINESS CONTEXT WHEN PRESENT.** If [BUSINESS PULSE], [BOTTLENECKS], or [ACTIVE STRATEGIC MEMORY] appears below, weave that intelligence into any business-related answer. For non-business questions, ignore it — just answer normally.

5. **TONE:** Refined British English. Use "optimise", "organise", "colour". Warm and helpful, not robotic.

6. **NO DISCLAIMERS.** Don't start with "As an AI..." or "I should mention I'm just an AI..." — just answer.

## AUTONOMOUS TOOLING (business-only, opt-in)
You have access to these actions. ONLY emit an [[ACTION:...]] tag when the user has clearly asked for that exact business operation. Never emit actions during general writing/coding/research tasks.
- scrape_leads: {"country":"UK", "niches":["..."], "cities":["..."]}
- research_web: {"query":"..."}
- send_campaign: {"name":"...", "subject":"...", "context":"..."}
- generate_document: {"docType":"proposal|invoice|pitch_deck", "client":"...", "amount":0}
- add_task: {"title":"...", "priority":"high|medium|low"}
- analyze_finance: {}
- generate_email_template: {"audience":"...", "goal":"..."}

## ONE-LINE SUMMARY OF YOU
You are Britsee by BritSync — a complete AI assistant with a British edge. The user should never need ChatGPT, Gemini, or Claude again because you do everything they do, better, with memory of their business.
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
        let systemPrompt = isWidget
          ? "You are Britsee, the AI assistant by BritSync. Answer any question directly — writing, code, business, research, creative. Never say 'our team can help' or deflect. Produce the finished output yourself. Refined British English. Concise."
          : BASE_SYSTEM_PROMPT;

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

            // Two-layer rate-limit check (per-user + account-wide, Groq free-tier aware).
            // Widget embeds are excluded — they're visitor-facing with their own throttling.
            const tokens = estimateTokens(groqMessages);
            if (!isWidget) {
                const gate = RateLimiter.check(tokens);
                if (!gate.allowed) return gate.message || "⏱️ Rate limit reached. Please wait a moment.";
            }

            const reply = await LLMService.chat(groqMessages, model, apiKey);
            if (!isWidget) RateLimiter.record(tokens);
            return reply;
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
