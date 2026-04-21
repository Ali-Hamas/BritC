import { supabase } from './supabase';
import { getApiUrl } from './api-config';
import { TeamService } from './team';
import { authClient } from './auth-client';

export interface StoredMessage {
  id?: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: any[];
  action_result?: any;
  sender_id?: string;
  sender_name?: string;
  created_at?: string;
}

const SESSION_KEY = 'britsee_active_session';

function getCurrentUserId(): string | null {
  const session: any = (authClient as any)?.getSession?.();
  return session?.user?.id || null;
}

export const ChatHistoryService = {
  // Get or create a stable session ID for this browser
  getSessionId(): string {
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  },

  // Save a single message.
  // All new chats are personal. The team_id is stamped for aggregate metrics only,
  // but messages remain entirely private via RLS.
  async saveMessage(msg: Omit<StoredMessage, 'session_id'>): Promise<void> {
    const sessionId = this.getSessionId();
    const isLegacyTeamSession = sessionId.startsWith('team_');
    const userId = getCurrentUserId();

    if (isLegacyTeamSession) {
      console.warn('ChatHistoryService: Refusing to save to legacy shared team session. Start a new chat.');
      return;
    }

    const teamCtx = TeamService.getCachedContext();
    const teamId = teamCtx?.team?.id || null;

    try {
      await supabase.from('chat_history').insert({
        session_id: sessionId,
        role: msg.role,
        content: msg.content,
        attachments: msg.attachments || null,
        action_result: msg.action_result || null,
        user_id: userId,
        team_id: teamId, // For owner insights/metrics (no raw read access)
      });
    } catch (err) {
      console.warn('ChatHistoryService: Failed to save message to Supabase', err);
    }
  },

  // Load all messages for the current session.
  async loadMessages(): Promise<StoredMessage[]> {
    const sessionId = this.getSessionId();
    const isLegacyTeamSession = sessionId.startsWith('team_');

    if (isLegacyTeamSession) {
      // Legacy read-only fallback for old shared rooms
      try {
        const resp = await fetch(getApiUrl(`/team/messages/${sessionId}`));
        if (resp.ok) {
          const data = await resp.json();
          if (data.success && Array.isArray(data.messages)) {
            return data.messages.map((m: any) => ({
              ...m,
              content: m.content ?? m.text ?? '',
              created_at: m.created_at || new Date().toISOString(),
            }));
          }
        }
      } catch (err) {
        console.warn('ChatHistoryService: Legacy team load failed', err);
      }
      return [];
    }

    // Personal session — Supabase direct
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (!error && data) return data;
    } catch (err) {
      console.warn('ChatHistoryService: Supabase history load failed', err);
    }
    return [];
  },

  // Clear all messages for the current session
  async clearMessages(): Promise<void> {
    try {
      const sessionId = this.getSessionId();
      await supabase.from('chat_history').delete().eq('session_id', sessionId);
    } catch (err) {
      console.warn('ChatHistoryService: Failed to clear messages', err);
    }
  },

  // Start a new session
  startNewSession(sessionId?: string): string {
    const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(SESSION_KEY, id);
    return id;
  },

  // @deprecated - Legacy functionality
  async registerTeamSession(_sessionId: string, _pin: string, _title: string): Promise<{ success: boolean; mode?: 'database' | 'memory' }> {
    console.warn('registerTeamSession is deprecated in the new team model.');
    return { success: false };
  },

  // @deprecated - Legacy functionality
  async findSessionByPin(_pin: string): Promise<{ sessionId: string; title: string; mode?: 'database' | 'memory' } | null> {
    console.warn('findSessionByPin is deprecated in the new team model.');
    return null;
  },
};
