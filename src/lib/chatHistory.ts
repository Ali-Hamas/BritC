import { supabase } from './supabase';

export interface StoredMessage {
  id?: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: any[];
  action_result?: any;
  created_at?: string;
}

const SESSION_KEY = 'britsee_active_session';
<<<<<<< HEAD
const LOCAL_API_URL = '/api/team';
=======
const LOCAL_API_URL = 'http://localhost:5003/api/team';
>>>>>>> 7de6b300f9a9d0c1ba5aab975697e2a53e67fe9c

export const ChatHistoryService = {
  // Get or create a stable session ID for this browser
  getSessionId(): string {
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  },

  // Save a single message to Supabase (and local memory for team sessions)
  async saveMessage(msg: Omit<StoredMessage, 'session_id'>): Promise<void> {
    const sessionId = this.getSessionId();
    
    // 1. Save to Supabase
    try {
      await supabase.from('chat_history').insert({
        session_id: sessionId,
        role: msg.role,
        content: msg.content,
        attachments: msg.attachments || null,
        action_result: msg.action_result || null,
      });
    } catch (err) {
      console.warn('ChatHistoryService: Failed to save message to Supabase', err);
    }

    // 2. If it's a team session, sync to local server's memory bank
    if (sessionId.startsWith('team_')) {
      try {
        await fetch(`${LOCAL_API_URL}/messages/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            message: msg
          })
        });
      } catch (err) {
        console.warn('ChatHistoryService: Local memory sync failed', err);
      }
    }
  },

  // Load all messages for the current session
  async loadMessages(): Promise<StoredMessage[]> {
    const sessionId = this.getSessionId();
    let messages: StoredMessage[] = [];

    // 1. Try Supabase
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('ChatHistoryService: Supabase history load failed, trying local fallback...', err);
    }

    // 2. Fallback to Local Server Memory bank (Crucial for Team collaboration without DB)
    try {
<<<<<<< HEAD
      const resp = await fetch(`/api/team/messages/${sessionId}`);
=======
      const resp = await fetch(`http://localhost:5003/api/team/messages/${sessionId}`);
>>>>>>> 7de6b300f9a9d0c1ba5aab975697e2a53e67fe9c
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.messages) {
          return data.messages.map((m: any) => ({
            ...m,
            created_at: m.created_at || new Date().toISOString()
          }));
        }
      }
    } catch (err) {
      console.warn('ChatHistoryService: Local history load failed', err);
    }

    return messages;
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
    const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_KEY, id);
    return id;
  },

  // Register a new team session
  async registerTeamSession(sessionId: string, pin: string, title: string): Promise<{ success: boolean; mode?: 'database' | 'memory' }> {
    // 1. Try Supabase first
    try {
      const { error } = await supabase
        .from('team_sessions')
        .insert([{ session_id: sessionId, pin, title }]);
      
      if (!error) return { success: true, mode: 'database' };
      console.warn('ChatHistoryService: Supabase registry failed, trying local fallback...', error);
    } catch (err) {
      console.warn('ChatHistoryService: Supabase unavailable, trying local fallback...', err);
    }

    // 2. Fallback to Local Server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const resp = await fetch(`${LOCAL_API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, pin, title }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (resp.ok) {
        return await resp.json();
      }
      return { success: false };
    } catch (err) {
      console.error('ChatHistoryService: Local fallback also failed', err);
      return { success: false };
    }
  },

  // Find a session ID by its PIN
  async findSessionByPin(pin: string): Promise<{ sessionId: string; title: string; mode?: 'database' | 'memory' } | null> {
    // 1. Try Supabase (Main)
    try {
      const { data, error } = await supabase
        .from('team_sessions')
        .select('session_id, title')
        .eq('pin', pin)
        .single();
      
      if (!error && data) {
        return { sessionId: data.session_id, title: data.title, mode: 'database' };
      }
      console.warn('ChatHistoryService: PIN not found in Supabase, trying local fallback...');
    } catch (err) {
      console.warn('ChatHistoryService: Supabase lookup failed, trying local fallback...', err);
    }

    // 2. Fallback to Local Server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const resp = await fetch(`${LOCAL_API_URL}/resolve/${pin}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        return { 
          sessionId: data.sessionId, 
          title: data.title, 
          mode: data.mode 
        };
      }
      return null;
    } catch (err) {
      console.error('ChatHistoryService: Local resolve failed', err);
      return null;
    }
  },
};
