/**
 * AdminPanel — minimal v1 moderator dashboard.
 *
 * Gated to britsyncuk@gmail.com via TeamService.isGlobalModerator().
 * Everyone else gets a bounce screen. The gate is client-side; Supabase RLS
 * on the listed tables is already permissive for anon, so the moderator's
 * browser can read everything. For v1 this is acceptable — real server-side
 * enforcement comes with the RBAC refactor in v2.
 */

import { useEffect, useState } from 'react';
import { Shield, Users, Briefcase, Trash2, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TeamService, type Team } from '../../lib/team';

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

interface TeamWithCount extends Team {
  member_count: number;
  owner_email: string | null;
}

export const AdminPanel = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<TeamWithCount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isModerator = TeamService.isGlobalModerator();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // Users — Better-Auth uses the "user" table (lowercase, singular).
      const { data: userRows, error: userErr } = await supabase
        .from('user')
        .select('id, email, name, createdAt')
        .order('createdAt', { ascending: false });
      if (userErr) throw new Error(`Users: ${userErr.message}`);

      // Teams
      const { data: teamRows, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });
      if (teamErr) throw new Error(`Teams: ${teamErr.message}`);

      // Member counts + owner emails
      const enriched: TeamWithCount[] = [];
      for (const t of (teamRows || []) as Team[]) {
        const { count } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', t.id);
        const owner = (userRows || []).find((u: any) => u.id === t.owner_id);
        enriched.push({
          ...t,
          member_count: count ?? 0,
          owner_email: owner?.email ?? null,
        });
      }

      setUsers((userRows || []) as UserRow[]);
      setTeams(enriched);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isModerator) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModerator]);

  const handleDeleteUser = async (u: UserRow) => {
    if (!window.confirm(
      `Delete user "${u.email}"?\n\nThis cascades: all their team memberships, owned teams, sessions and credentials will be removed. This cannot be undone.`
    )) return;
    setBusyId(u.id);
    try {
      // Order matters: child rows first, user last.
      const steps: Array<[string, any]> = [
        ['team_members', supabase.from('team_members').delete().eq('user_id', u.id)],
        ['teams',        supabase.from('teams').delete().eq('owner_id', u.id)],
        ['session',      supabase.from('session').delete().eq('userId', u.id)],
        ['account',      supabase.from('account').delete().eq('userId', u.id)],
        ['user',         supabase.from('user').delete().eq('id', u.id)],
      ];
      for (const [table, q] of steps) {
        const { error: e } = await q;
        if (e) throw new Error(`${table}: ${e.message}`);
      }
      await load();
    } catch (err: any) {
      alert('Delete failed: ' + (err?.message || 'unknown'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteTeam = async (t: TeamWithCount) => {
    if (!window.confirm(
      `Delete team "${t.title || 'Untitled'}"?\n\nAll memberships and team memory will be removed. Members themselves are NOT deleted.`
    )) return;
    setBusyId(t.id);
    try {
      const steps: Array<[string, any]> = [
        ['team_memory',  supabase.from('team_memory').delete().eq('team_id', t.id)],
        ['team_members', supabase.from('team_members').delete().eq('team_id', t.id)],
        ['teams',        supabase.from('teams').delete().eq('id', t.id)],
      ];
      for (const [table, q] of steps) {
        const { error: e } = await q;
        if (e) throw new Error(`${table}: ${e.message}`);
      }
      await load();
    } catch (err: any) {
      alert('Delete failed: ' + (err?.message || 'unknown'));
    } finally {
      setBusyId(null);
    }
  };

  // ── Gate ──
  if (!isModerator) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4 p-8 bg-rose-500/5 border border-rose-500/20 rounded-3xl">
          <Shield size={40} className="text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Moderator Access Only</h2>
          <p className="text-slate-400 text-sm">
            The admin dashboard is restricted to the platform moderator.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-6 py-6 sm:py-8 pb-32 scrollbar-thin">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Shield className="text-amber-400" size={28} />
              Admin Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Platform-wide control. Visible only to the global moderator.
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-slate-300"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-sm text-rose-300">
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 bg-[#151520] border border-white/5 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
              <Users size={14} /> Users
            </div>
            <div className="text-3xl font-black text-white">{users.length}</div>
          </div>
          <div className="p-5 bg-[#151520] border border-white/5 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">
              <Briefcase size={14} /> Teams
            </div>
            <div className="text-3xl font-black text-white">{teams.length}</div>
          </div>
        </div>

        {/* Users */}
        <section className="bg-[#151520] border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4">Users ({users.length})</h2>
          {users.length === 0 ? (
            <p className="text-slate-500 text-sm italic py-6 text-center">No users.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {users.map(u => (
                <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-200 text-sm truncate">{u.email}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">{u.id}</p>
                    <p className="text-[10px] text-slate-600">
                      Created {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      {u.name ? ` · ${u.name}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteUser(u)}
                    disabled={busyId === u.id}
                    className="shrink-0 flex items-center gap-2 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-bold disabled:opacity-50"
                  >
                    {busyId === u.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Teams */}
        <section className="bg-[#151520] border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4">Teams ({teams.length})</h2>
          {teams.length === 0 ? (
            <p className="text-slate-500 text-sm italic py-6 text-center">No teams.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {teams.map(t => (
                <div key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-200 text-sm truncate">{t.title || 'Untitled Team'}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Owner: <span className="font-mono">{t.owner_email || t.owner_id}</span>
                      {' · '}
                      {t.member_count} member{t.member_count === 1 ? '' : 's'}
                      {' · PIN '}
                      <span className="font-mono text-indigo-300">{t.pin}</span>
                    </p>
                    <p className="text-[10px] text-slate-600">
                      Created {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteTeam(t)}
                    disabled={busyId === t.id}
                    className="shrink-0 flex items-center gap-2 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-bold disabled:opacity-50"
                  >
                    {busyId === t.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Delete Team
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
