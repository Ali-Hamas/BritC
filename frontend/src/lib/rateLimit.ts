/**
 * Two-layer rate limiter tuned for Groq free tier (llama-3.3-70b-versatile).
 *
 * Groq free-tier hard caps (account-wide, not per-user):
 *   RPM  = 30 requests/min
 *   RPD  = 1,000 requests/day
 *   TPM  = 12,000 tokens/min
 *   TPD  = 100,000 tokens/day
 *
 * Our budgets leave ~15-20% headroom under each cap so we trip our own limiter
 * before Groq does. That way the OpenRouter fallback handles overflow cleanly
 * instead of users getting raw 429s.
 *
 *   Account-wide (shared across all users on the same browser install):
 *     25 req/min, 800 req/day, 10,000 tok/min, 85,000 tok/day
 *
 *   Per-user (fairness — one spammer shouldn't hog the shared budget):
 *     10 req/min, 100 req/day
 *
 * NOTE: LocalStorage-based, so it's not a security boundary — a determined
 * user can clear it. Move to a server-side Redis/Supabase counter once real
 * abuse shows up.
 */
import { TeamService } from './team';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Account-wide (shared budget)
const ACCOUNT_RPM = 25;
const ACCOUNT_RPD = 800;
const ACCOUNT_TPM = 10_000;
const ACCOUNT_TPD = 85_000;

// Per-user (fairness)
const USER_RPM = 10;
const USER_RPD = 100;

const ACCOUNT_KEY = 'britsee_rl_account';
const USER_KEY_PREFIX = 'britsee_rl_user_';

type Event = { t: number; tok: number };
type State = { events: Event[] };

function loadState(key: string): State {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { events: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.events)) return { events: parsed.events };
    return { events: [] };
  } catch {
    return { events: [] };
  }
}

function saveState(key: string, state: State): void {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch { /* quota full — ignore */ }
}

function prune(state: State, now: number): State {
  // Keep only the last 24h of events — anything older is irrelevant.
  return { events: state.events.filter(e => now - e.t < DAY) };
}

function countSince(events: Event[], now: number, windowMs: number): { reqs: number; tokens: number } {
  let reqs = 0;
  let tokens = 0;
  for (const e of events) {
    if (now - e.t < windowMs) {
      reqs++;
      tokens += e.tok;
    }
  }
  return { reqs, tokens };
}

/**
 * Rough token estimate — Groq uses the Llama tokenizer which averages ~4 chars/token
 * for English. Good enough for budget accounting; we're not billing on this.
 */
export function estimateTokens(messages: Array<{ content: unknown }>): number {
  let chars = 0;
  for (const m of messages) {
    const c = m.content;
    if (typeof c === 'string') {
      chars += c.length;
    } else if (Array.isArray(c)) {
      // OpenAI multimodal shape: [{type:'text',text:'...'}, {type:'image_url',...}]
      for (const part of c) {
        if (typeof part?.text === 'string') chars += part.text.length;
        if (part?.type === 'image_url') chars += 800 * 4; // rough: vision input ~800 tok per image
      }
    }
  }
  // Reserve ~500 tokens headroom for the expected reply so we don't over-commit.
  return Math.ceil(chars / 4) + 500;
}

export interface RateCheck {
  allowed: boolean;
  retryAfterMs?: number;
  message?: string;
  scope?: 'user' | 'account';
}

function accountKey(): string { return ACCOUNT_KEY; }
function userKey(uid: string | null): string { return `${USER_KEY_PREFIX}${uid || 'anon'}`; }

function formatWait(ms: number): string {
  const secs = Math.ceil(ms / 1000);
  if (secs < 60) return `${secs} second${secs === 1 ? '' : 's'}`;
  const mins = Math.ceil(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
  const hrs = Math.ceil(mins / 60);
  return `${hrs} hour${hrs === 1 ? '' : 's'}`;
}

export const RateLimiter = {
  /**
   * Check whether the current user may send a request that will consume
   * approximately `estimatedTokens`. Checks per-user first (fairness), then
   * account-wide (hard cap).
   */
  check(estimatedTokens: number): RateCheck {
    const now = Date.now();
    const uid = TeamService._uid?.() ?? null;

    // ── Per-user layer ──
    const userState = prune(loadState(userKey(uid)), now);
    const userMin = countSince(userState.events, now, MINUTE);
    const userDay = countSince(userState.events, now, DAY);

    if (userMin.reqs >= USER_RPM) {
      const oldest = userState.events.filter(e => now - e.t < MINUTE).sort((a, b) => a.t - b.t)[0];
      const retryAfterMs = Math.max(0, MINUTE - (now - oldest.t));
      return {
        allowed: false,
        retryAfterMs,
        scope: 'user',
        message: `⏱️ You're sending messages too quickly. Please wait ${formatWait(retryAfterMs)}.`,
      };
    }
    if (userDay.reqs >= USER_RPD) {
      return {
        allowed: false,
        scope: 'user',
        message: `⏱️ You've hit your daily message limit (${USER_RPD}). Try again tomorrow.`,
      };
    }

    // ── Account-wide layer ──
    const accState = prune(loadState(accountKey()), now);
    const accMin = countSince(accState.events, now, MINUTE);
    const accDay = countSince(accState.events, now, DAY);

    if (accMin.reqs >= ACCOUNT_RPM) {
      const oldest = accState.events.filter(e => now - e.t < MINUTE).sort((a, b) => a.t - b.t)[0];
      const retryAfterMs = Math.max(0, MINUTE - (now - oldest.t));
      return {
        allowed: false,
        retryAfterMs,
        scope: 'account',
        message: `⏱️ Britsee is handling a lot of traffic right now. Please wait ${formatWait(retryAfterMs)}.`,
      };
    }
    if (accMin.tokens + estimatedTokens > ACCOUNT_TPM) {
      return {
        allowed: false,
        scope: 'account',
        message: `⏱️ The AI engine is at capacity (token limit). Please wait ~1 minute and try a shorter message.`,
      };
    }
    if (accDay.reqs >= ACCOUNT_RPD) {
      return {
        allowed: false,
        scope: 'account',
        message: `⏱️ Britsee has reached its daily request limit. Service will resume tomorrow.`,
      };
    }
    if (accDay.tokens + estimatedTokens > ACCOUNT_TPD) {
      return {
        allowed: false,
        scope: 'account',
        message: `⏱️ Britsee has reached its daily token budget. Service will resume tomorrow.`,
      };
    }

    return { allowed: true };
  },

  /** Record a successful request against both per-user and account counters. */
  record(estimatedTokens: number): void {
    const now = Date.now();
    const uid = TeamService._uid?.() ?? null;
    const event: Event = { t: now, tok: estimatedTokens };

    const userState = prune(loadState(userKey(uid)), now);
    userState.events.push(event);
    saveState(userKey(uid), userState);

    const accState = prune(loadState(accountKey()), now);
    accState.events.push(event);
    saveState(accountKey(), accState);
  },
};
