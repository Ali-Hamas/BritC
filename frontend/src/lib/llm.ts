/**
 * LLMService — unified chat interface with multi-provider fallback.
 *
 * Order:
 *   1. Groq (primary — fast, free, proxied via /api/groq)
 *   2. OpenRouter (fallback — free open-source models, direct CORS call)
 *   3. Cerebras Cloud (fallback — extremely fast, 1M tokens/day free)
 *   4. Google Gemini (final fallback — 1,500 req/day free)
 *
 * If a provider rate-limits, errors out, or is unreachable, the request is
 * retried against the next provider so the user never sees an outage.
 */
import { SettingsService } from './settings';
import type { GroqMessage } from './groq';
import { GroqService } from './groq';

export type LLMMessage = GroqMessage;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const CEREBRAS_URL = 'https://api.cerebras.ai/v1/chat/completions';
const CEREBRAS_FALLBACK_MODEL = 'llama3.1-8b';

// Errors we should fall back on (rate limit, auth, server, network).
// 4xx client errors other than 429/401/403 probably mean bad request — don't mask them.
function shouldFallback(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('model_does_not_support_vision')) return false; // user must pick different model
  return (
    msg.includes('rate limit') ||
    msg.includes('429') ||
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('quota') ||
    msg.includes('capacity') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('timeout')
  );
}

async function callOpenRouter(messages: LLMMessage[]): Promise<string> {
  const apiKey = SettingsService.getOpenRouterApiKey();
  if (!apiKey) throw new Error('OpenRouter API key is missing.');

  const model = SettingsService.getOpenRouterModel();

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Britsee',
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const err = await res.json();
      errorMessage = err.error?.message || err.message || errorMessage;
    } catch { /* ignore */ }
    throw new Error(`OpenRouter API Error (${res.status}): ${errorMessage}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response from OpenRouter.';
}

/**
 * Convert OpenAI-style messages to Gemini's `contents` format.
 * Gemini uses `user` / `model` roles and merges system prompts as a leading
 * user turn (Gemini supports `systemInstruction` separately, but this keeps
 * the contract simple and provider-agnostic).
 */
function toGeminiContents(messages: LLMMessage[]): {
  systemInstruction?: { parts: { text: string }[] };
  contents: { role: 'user' | 'model'; parts: { text: string }[] }[];
} {
  const systemParts: string[] = [];
  const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

  for (const m of messages) {
    const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    if (m.role === 'system') {
      systemParts.push(text);
    } else if (m.role === 'assistant') {
      contents.push({ role: 'model', parts: [{ text }] });
    } else {
      contents.push({ role: 'user', parts: [{ text }] });
    }
  }

  return {
    systemInstruction: systemParts.length
      ? { parts: [{ text: systemParts.join('\n\n') }] }
      : undefined,
    contents,
  };
}

async function callCerebrasOnce(messages: LLMMessage[], model: string, apiKey: string): Promise<string> {
  const res = await fetch(CEREBRAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    let errorMessage = res.statusText;
    let errorCode = '';
    try {
      const err = await res.json();
      errorMessage = err.message || err.error?.message || errorMessage;
      errorCode = err.code || '';
    } catch { /* ignore */ }
    const e = new Error(`Cerebras API Error (${res.status}): ${errorMessage}`);
    (e as any).cerebrasCode = errorCode;
    (e as any).status = res.status;
    throw e;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response from Cerebras.';
}

async function callCerebras(messages: LLMMessage[]): Promise<string> {
  const apiKey = SettingsService.getCerebrasApiKey();
  if (!apiKey) throw new Error('Cerebras API key is missing.');

  const primaryModel = SettingsService.getCerebrasModel();

  try {
    return await callCerebrasOnce(messages, primaryModel, apiKey);
  } catch (err) {
    // If the big model is queued (high traffic), drop to llama3.1-8b which is always-on
    const code = (err as any).cerebrasCode;
    const status = (err as any).status;
    const isQueueOrCapacity = code === 'queue_exceeded' || status === 429 || status === 503;
    if (isQueueOrCapacity && primaryModel !== CEREBRAS_FALLBACK_MODEL) {
      console.warn('[LLM] Cerebras primary model queued, retrying on llama3.1-8b...');
      return await callCerebrasOnce(messages, CEREBRAS_FALLBACK_MODEL, apiKey);
    }
    throw err;
  }
}

async function callGemini(messages: LLMMessage[]): Promise<string> {
  const apiKey = SettingsService.getGeminiApiKey();
  if (!apiKey) throw new Error('Gemini API key is missing.');

  const model = SettingsService.getGeminiModel();
  const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;

  const body = toGeminiContents(messages);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const err = await res.json();
      errorMessage = err.error?.message || err.message || errorMessage;
    } catch { /* ignore */ }
    throw new Error(`Gemini API Error (${res.status}): ${errorMessage}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
  return text || 'No response from Gemini.';
}

export const LLMService = {
  /**
   * Send a chat completion request with automatic Groq → OpenRouter fallback.
   * @param messages OpenAI-compatible message array (system + user + assistant)
   * @param model    Groq model id (OpenRouter uses its own configured model)
   * @param groqKey  Groq API key
   */
  async chat(messages: LLMMessage[], model: string, groqKey: string): Promise<string> {
    // Primary: Groq
    try {
      return await GroqService.chat(messages, model, groqKey);
    } catch (groqErr) {
      if (!shouldFallback(groqErr)) throw groqErr;
      console.warn('[LLM] Groq failed:', (groqErr as Error).message);

      // Fallback 1: OpenRouter (only if a key is configured)
      const openRouterKey = SettingsService.getOpenRouterApiKey();
      if (openRouterKey) {
        try {
          console.warn('[LLM] Falling back to OpenRouter...');
          return await callOpenRouter(messages);
        } catch (orErr) {
          if (!shouldFallback(orErr)) throw orErr;
          console.warn('[LLM] OpenRouter also failed:', (orErr as Error).message);
        }
      }

      // Fallback 2: Cerebras Cloud (bundled key — always available)
      const cerebrasKey = SettingsService.getCerebrasApiKey();
      if (cerebrasKey) {
        try {
          console.warn('[LLM] Falling back to Cerebras...');
          return await callCerebras(messages);
        } catch (cerErr) {
          if (!shouldFallback(cerErr)) throw cerErr;
          console.warn('[LLM] Cerebras also failed:', (cerErr as Error).message);
        }
      }

      // Fallback 3: Google Gemini (only if user provided a working key)
      const geminiKey = SettingsService.getGeminiApiKey();
      if (geminiKey) {
        try {
          console.warn('[LLM] Falling back to Gemini...');
          return await callGemini(messages);
        } catch (gemErr) {
          console.error('[LLM] Gemini fallback also failed:', gemErr);
        }
      }

      // All providers exhausted — surface the original Groq error
      throw groqErr;
    }
  },
};
