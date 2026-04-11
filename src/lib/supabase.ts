/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Supabase client - falls back gracefully if env vars are not set
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tracks whether Supabase is reachable. Used by the UI to show "Local Mode" badge.
export let isSupabaseOnline = false;

// Run a lightweight connectivity check on startup without blocking the app.
(async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      signal: controller.signal,
      headers: { apikey: supabaseAnonKey }
    });
    clearTimeout(timeoutId);
    isSupabaseOnline = res.ok || res.status === 401; // 401 = server up, just unauthorized
  } catch (_) {
    isSupabaseOnline = false;
    console.warn('[BritSee] Supabase unreachable — running in local mode. Chat history will be stored locally only.');
  }
})();
