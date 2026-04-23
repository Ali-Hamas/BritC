/**
 * LLMService — unified chat interface with multi-provider fallback.
 *
 * Order:
 *   1. Groq (primary — fast, free, proxied via /api/groq)
 *   2. OpenRouter (fallback — free open-source models, direct CORS call)
 *
 * If Groq rate-limits, errors out, or is unreachable, the request is retried
 * against OpenRouter so the user never sees an outage.
 *
 * OpenAI-compatible message shape for both providers.
 */
import { SettingsService } from './settings';
import type { GroqMessage } from './groq';
import { GroqService } from './groq';

export type LLMMessage = GroqMessage;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

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
    } catch (err) {
      if (!shouldFallback(err)) throw err;

      // Fallback: OpenRouter (only if a key is configured)
      const openRouterKey = SettingsService.getOpenRouterApiKey();
      if (!openRouterKey) throw err;

      console.warn('[LLM] Groq failed, falling back to OpenRouter:', (err as Error).message);
      try {
        return await callOpenRouter(messages);
      } catch (frErr) {
        console.error('[LLM] OpenRouter fallback also failed:', frErr);
        // Surface the original Groq error — it's the one the user actually hit first.
        throw err;
      }
    }
  },
};
