import { supabase } from './supabase';
import { authClient } from './auth-client';

/**
 * Team model (post-refactor):
 * - A "team" has one owner and a 6-digit PIN.
 * - Other authenticated users link themselves to the team with the PIN.
 * - Each member's chats stay private (RLS on chat_history, keyed by user_id).
 * - The AI is guided by the owner's team_memory blocks.
 *
 * GLOBAL MODERATOR: britsyncuk@gmail.com is the platform-wide moderator.
 * When this user signs in we auto-treat them as owner and their team_memory
 * flows into every member's private chat as the "moderator insight" layer.
 */

export const GLOBAL_MODERATOR_EMAIL = 'britsyncuk@gmail.com';
export const GLOBAL_MODERATOR_EMAILS = [
  'britsyncuk@gmail.com',
  'kamranalivyond@gmail.com',
];

const UID_CACHE_KEY = 'britsync_uid_cache';
const EMAIL_CACHE_KEY = 'britsync_email_cache';

export interface Team {
  id: string;
  owner_id: string;
  pin: string;
  title: string | null;
  created_at?: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: 'owner' | 'member';
  display_name: string | null;
  joined_at?: string;
}

export interface MyTeamContext {
  team: Team | null;
  role: 'owner' | 'member' | null;
  displayName: string | null;
}

const LOCAL_CACHE_KEY = 'britsync_team_cache_v2';
const ACTIVE_TEAM_KEY = 'britsync_active_team_id';
const ADMIN_LIST_CACHE_KEY = 'britsync_admin_list_cache';

function getCurrentUserId(): string | null {
  // Better-Auth's getSession() is async and returns a Promise — calling it
  // synchronously here used to return undefined and silently break the
  // Team panel. We now rely on a cached id that App.tsx writes after
  // useSession() resolves. See TeamService.setCurrentIdentity.
  try {
    const cached = localStorage.getItem(UID_CACHE_KEY);
    if (cached) return cached;
  } catch {}
  // Last-resort probe — some better-auth builds expose a sync getter.
  const probe: any = (authClient as any)?.getSession?.();
  if (probe && !(probe instanceof Promise)) {
    return probe?.user?.id || null;
  }
  return null;
}

function getCurrentEmail(): string | null {
  try {
    return localStorage.getItem(EMAIL_CACHE_KEY);
  } catch {
    return null;
  }
}

function cache(ctx: MyTeamContext | null) {
  try {
    if (ctx) localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(ctx));
    else localStorage.removeItem(LOCAL_CACHE_KEY);
  } catch {}
}

function readCache(): MyTeamContext | null {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    return raw ? (JSON.parse(raw) as MyTeamContext) : null;
  } catch {
    return null;
  }
}

function randomPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const TeamService = {
  /**
   * Called from App.tsx after useSession() resolves so sync callers
   * (TeamService._uid, ActivityService, etc.) can see the current id & email.
   * Pass null on sign-out.
   */
  setCurrentIdentity(userId: string | null, email: string | null): void {
    try {
      if (userId) localStorage.setItem(UID_CACHE_KEY, userId);
      else localStorage.removeItem(UID_CACHE_KEY);
      if (email) localStorage.setItem(EMAIL_CACHE_KEY, email.toLowerCase());
      else localStorage.removeItem(EMAIL_CACHE_KEY);
    } catch {}
  },

  /**
   * True iff the signed-in user is a platform admin.
   * - Hardcoded GLOBAL_MODERATOR_EMAILS = "superadmins" (immune to demotion)
   * - Plus any user_id present in the cached app_admins list.
   *
   * Sync — backed by localStorage cache. Call refreshAdminCache() once at app
   * boot (and after every promote/demote) to keep the cache fresh.
   */
  isGlobalModerator(): boolean {
    const email = getCurrentEmail();
    if (email) {
      const lower = email.toLowerCase();
      if (GLOBAL_MODERATOR_EMAILS.some(e => e.toLowerCase() === lower)) return true;
    }
    const uid = getCurrentUserId();
    if (uid) {
      try {
        const raw = localStorage.getItem(ADMIN_LIST_CACHE_KEY);
        if (raw) {
          const ids = JSON.parse(raw) as string[];
          if (Array.isArray(ids) && ids.includes(uid)) return true;
        }
      } catch {}
    }
    return false;
  },

  /** True iff this user is a hardcoded superadmin (cannot be demoted). */
  isSuperAdmin(email?: string | null): boolean {
    const e = (email ?? getCurrentEmail() ?? '').toLowerCase();
    if (!e) return false;
    return GLOBAL_MODERATOR_EMAILS.some(x => x.toLowerCase() === e);
  },

  /** Pull the latest admin list from Supabase and cache the user_ids. */
  async refreshAdminCache(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('app_admins')
        .select('user_id');
      if (error) {
        console.warn('[TeamService] refreshAdminCache failed:', error.message);
        return [];
      }
      const ids = (data || []).map((r: any) => r.user_id).filter(Boolean);
      try { localStorage.setItem(ADMIN_LIST_CACHE_KEY, JSON.stringify(ids)); } catch {}
      return ids;
    } catch (err) {
      console.warn('[TeamService] refreshAdminCache exception:', err);
      return [];
    }
  },

  /** List of {user_id, granted_at, granted_by} rows. */
  async listAdmins(): Promise<{ user_id: string; granted_by: string | null; granted_at: string }[]> {
    const { data, error } = await supabase
      .from('app_admins')
      .select('*')
      .order('granted_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as any[];
  },

  /** Promote a user to admin. No-op if already admin. */
  async promoteAdmin(userId: string): Promise<void> {
    const grantedBy = getCurrentUserId();
    const { error } = await supabase
      .from('app_admins')
      .upsert({ user_id: userId, granted_by: grantedBy }, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
    await this.refreshAdminCache();
  },

  /** Demote (revoke) a user. Cannot demote a hardcoded superadmin. */
  async demoteAdmin(userId: string): Promise<void> {
    const { error } = await supabase
      .from('app_admins')
      .delete()
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    await this.refreshAdminCache();
  },

  /** Best-effort synchronous cache read — used by non-async call sites that just need to know the role. */
  getCachedContext(): MyTeamContext | null {
    return readCache();
  },

  /**
   * Read the currently active team id from localStorage. Used to pick which
   * team is "current" when the user owns or belongs to several.
   */
  getActiveTeamId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_TEAM_KEY);
    } catch {
      return null;
    }
  },

  setActiveTeamId(teamId: string | null): void {
    try {
      if (teamId) localStorage.setItem(ACTIVE_TEAM_KEY, teamId);
      else localStorage.removeItem(ACTIVE_TEAM_KEY);
    } catch {}
  },

  /**
   * Return every team the user is involved in, as either owner or member.
   * Includes role + displayName per team. Used by the team switcher UI.
   */
  async getMyTeams(userId: string): Promise<Array<{ team: Team; role: 'owner' | 'member'; displayName: string | null }>> {
    if (!userId) return [];
    const out: Array<{ team: Team; role: 'owner' | 'member'; displayName: string | null }> = [];

    const { data: ownedTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true });
    if (ownedTeams) {
      for (const t of ownedTeams as Team[]) {
        out.push({ team: t, role: 'owner', displayName: 'Owner' });
      }
    }

    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id, role, display_name')
      .eq('user_id', userId);
    if (memberships && memberships.length > 0) {
      const ownedIds = new Set(out.map(o => o.team.id));
      const memberOnly = (memberships as any[]).filter(m => m.role !== 'owner' && !ownedIds.has(m.team_id));
      if (memberOnly.length > 0) {
        const { data: memberTeams } = await supabase
          .from('teams')
          .select('*')
          .in('id', memberOnly.map(m => m.team_id));
        if (memberTeams) {
          for (const m of memberOnly) {
            const t = (memberTeams as Team[]).find(x => x.id === m.team_id);
            if (t) out.push({ team: t, role: 'member', displayName: m.display_name || 'Member' });
          }
        }
      }
    }

    return out;
  },

  /**
   * Load the team the current user belongs to (as owner or member).
   * Returns null if no team yet.
   *
   * If the user has multiple teams, returns the active one (per
   * `getActiveTeamId()`); falls back to the first team found.
   *
   * Special case: if the signed-in user is the GLOBAL_MODERATOR_EMAIL and
   * has no team, we auto-provision one so the moderator seat is always live.
   */
  async getMyTeam(userId: string): Promise<MyTeamContext> {
    if (!userId) {
      const empty: MyTeamContext = { team: null, role: null, displayName: null };
      cache(empty);
      return empty;
    }

    const all = await this.getMyTeams(userId);

    if (all.length > 0) {
      const activeId = this.getActiveTeamId();
      const picked = (activeId && all.find(t => t.team.id === activeId)) || all[0];
      if (!activeId) this.setActiveTeamId(picked.team.id);
      const ctx: MyTeamContext = {
        team: picked.team,
        role: picked.role,
        displayName: picked.displayName,
      };
      cache(ctx);
      return ctx;
    }

    // No team. If this is the global moderator, auto-create one.
    if (this.isGlobalModerator()) {
      try {
        const team = await this.createTeam(userId, 'BritSync Moderator HQ');
        const ctx: MyTeamContext = { team, role: 'owner', displayName: 'Moderator' };
        cache(ctx);
        return ctx;
      } catch (err) {
        console.warn('[TeamService] moderator auto-provision failed:', err);
      }
    }

    const empty: MyTeamContext = { team: null, role: null, displayName: null };
    cache(empty);
    return empty;
  },

  /** Creates a team for the given user. A user may own multiple teams. */
  async createTeam(userId: string, title: string): Promise<Team> {
    if (!userId) throw new Error('Not signed in');
    const pin = randomPin();
    const { data, error } = await supabase
      .from('teams')
      .insert([{ owner_id: userId, pin, title: title || 'My Team' }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    const team = data as Team;

    // Bootstrap owner membership client-side (replaces the old DB trigger).
    // Ignore the error if it already exists — owner row is idempotent.
    await supabase
      .from('team_members')
      .upsert(
        [{ team_id: team.id, user_id: userId, role: 'owner', display_name: 'Owner' }],
        { onConflict: 'team_id,user_id' }
      );

    // Newly-created team becomes the active one immediately.
    this.setActiveTeamId(team.id);
    cache({ team, role: 'owner', displayName: 'Owner' });
    return team;
  },

  /**
   * Member flow — links current user to the team identified by PIN.
   * Previously this called a plpgsql RPC; we now do the lookup + insert
   * client-side so the schema stays SQL-Editor-friendly (no function bodies).
   * RLS still protects the tables:
   *   - `teams` has a public-select-by-pin policy scoped to a single row
   *   - `team_members` allows self-insert only when a matching team exists
   */
  async joinTeamByPin(pin: string, displayName: string): Promise<string> {
    if (!pin) throw new Error('PIN required');
    const userId = getCurrentUserId();
    if (!userId) throw new Error('Not signed in');

    const { data: team, error: lookupErr } = await supabase
      .from('teams')
      .select('id')
      .eq('pin', pin)
      .maybeSingle();
    if (lookupErr) throw new Error(lookupErr.message);
    if (!team) throw new Error('Invalid PIN');

    const { error: insertErr } = await supabase
      .from('team_members')
      .upsert(
        [{
          team_id: (team as any).id,
          user_id: userId,
          role: 'member',
          display_name: displayName || 'Member',
        }],
        { onConflict: 'team_id,user_id' }
      );
    if (insertErr) throw new Error(insertErr.message);

    return (team as any).id as string;
  },

  /** Owner-only: list members of a team. Members see only themselves via RLS. */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    if (!teamId) return [];
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });
    if (error) {
      console.warn('[TeamService] getTeamMembers failed:', error.message);
      return [];
    }
    return (data || []) as TeamMember[];
  },

  /** Rotate the team PIN. Owner only. Old PIN stops working immediately. */
  async rotatePin(teamId: string): Promise<string> {
    const newPin = randomPin();
    const { error } = await supabase
      .from('teams')
      .update({ pin: newPin })
      .eq('id', teamId);
    if (error) throw new Error(error.message);
    return newPin;
  },

  /** Owner removes a member. Owner cannot remove themselves this way. */
  async removeMember(teamId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('role', 'member');
    if (error) throw new Error(error.message);
  },

  /** Current user leaves their team (members only). */
  async leaveTeam(userId: string, teamId: string): Promise<void> {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('role', 'member');
    if (error) throw new Error(error.message);
    cache({ team: null, role: null, displayName: null });
  },

  /** Cache helper used by non-React code paths (e.g. chatHistory). */
  getRoleFromCache(): 'owner' | 'member' | null {
    return readCache()?.role || null;
  },

  /** Legacy compatibility shim. Older code called this synchronously. */
  isOwner(): boolean {
    return readCache()?.role === 'owner';
  },

  /** Legacy compatibility shim. Older code read `{ id, name, role }`. */
  getCurrentMember(): { id: string; name: string; role: 'owner' | 'member' } | null {
    const ctx = readCache();
    if (!ctx?.team) return null;
    return {
      id: `${ctx.team.id}:${ctx.role}`,
      name: ctx.displayName || (ctx.role === 'owner' ? 'Owner' : 'Member'),
      role: ctx.role!,
    };
  },

  _uid: getCurrentUserId,

  // ── Legacy compatibility (old TeamSettings UI, not used in nav) ──
  getMembers(): Array<{ id: string; name: string; email: string; role: string; status: string }> {
    return [];
  },
  async inviteMember(_email: string, _role: string): Promise<void> {
    throw new Error('inviteMember is no longer supported. Share your team PIN instead.');
  },
  getOwnerPlan(): 'free' | 'pro' {
    return 'pro';
  },
  setMockUser(_id: string): void {
    // no-op — real auth used now
  },
};
