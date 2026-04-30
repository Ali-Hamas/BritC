/**
 * AdminPanel — full responsive moderator dashboard.
 *
 * Tabs:
 *   - Overview  → headline counters + recent activity
 *   - Users     → search, promote/demote, delete
 *   - Teams     → member counts, owner email, delete
 *   - Admins    → list of platform admins, revoke
 *
 * Access:
 *   - Hardcoded GLOBAL_MODERATOR_EMAILS = "superadmin" (immune to demotion)
 *   - Anyone in the app_admins table = "admin" (can be demoted)
 *   - All others get the bounce screen.
 *
 * Responsive: cards on mobile, table on lg+. No horizontal scroll.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Shield, Users, Briefcase, Trash2, Loader2, AlertTriangle, RefreshCw,
  Search, ShieldCheck, ShieldOff, ShieldPlus, BarChart3, Crown, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TeamService, type Team } from '../../lib/team';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface AdminRow {
  user_id: string;
  granted_by: string | null;
  granted_at: string;
}

type Tab = 'overview' | 'users' | 'teams' | 'admins';

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminPanel = () => {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<TeamWithCount[]>([]);
  const [adminRows, setAdminRows] = useState<AdminRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  const isModerator = TeamService.isGlobalModerator();

  const showToast = (kind: 'ok' | 'err', msg: string) => {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Data load ──────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: userRows, error: userErr }, { data: teamRows, error: teamErr }, adminList] =
        await Promise.all([
          supabase.from('user').select('id, email, name, createdAt').order('createdAt', { ascending: false }),
          supabase.from('teams').select('*').order('created_at', { ascending: false }),
          TeamService.listAdmins().catch(() => [] as AdminRow[]),
        ]);
      if (userErr) throw new Error(`Users: ${userErr.message}`);
      if (teamErr) throw new Error(`Teams: ${teamErr.message}`);

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
      setAdminRows(adminList);
      await TeamService.refreshAdminCache();
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

  // ─── Derived ────────────────────────────────────────────────────────────
  const adminIdSet = useMemo(() => new Set(adminRows.map(a => a.user_id)), [adminRows]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.email || '').toLowerCase().includes(q) ||
      (u.name || '').toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  }, [users, search]);

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(t =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.owner_email || '').toLowerCase().includes(q) ||
      (t.pin || '').toLowerCase().includes(q)
    );
  }, [teams, search]);

  const adminUsers = useMemo(
    () => users.filter(u => adminIdSet.has(u.id) || TeamService.isSuperAdmin(u.email)),
    [users, adminIdSet]
  );

  // ─── Actions ────────────────────────────────────────────────────────────
  const handleDeleteUser = async (u: UserRow) => {
    if (TeamService.isSuperAdmin(u.email)) {
      showToast('err', 'Cannot delete a superadmin account.');
      return;
    }
    if (!window.confirm(
      `Delete user "${u.email}"?\n\nThis cascades: their team memberships, owned teams, sessions, credentials, admin grant — all removed. This cannot be undone.`
    )) return;
    setBusyId(u.id);
    try {
      const steps: Array<[string, any]> = [
        ['app_admins',   supabase.from('app_admins').delete().eq('user_id', u.id)],
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
      showToast('ok', `Deleted ${u.email}`);
      await load();
    } catch (err: any) {
      showToast('err', 'Delete failed: ' + (err?.message || 'unknown'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteTeam = async (t: TeamWithCount) => {
    if (!window.confirm(
      `Delete team "${t.title || 'Untitled'}"?\n\nMemberships and team memory will be removed. The members themselves stay.`
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
      showToast('ok', `Deleted team ${t.title || 'Untitled'}`);
      await load();
    } catch (err: any) {
      showToast('err', 'Delete failed: ' + (err?.message || 'unknown'));
    } finally {
      setBusyId(null);
    }
  };

  const handlePromote = async (u: UserRow) => {
    setBusyId(u.id);
    try {
      await TeamService.promoteAdmin(u.id);
      showToast('ok', `${u.email} is now an admin.`);
      await load();
    } catch (err: any) {
      showToast('err', 'Promote failed: ' + (err?.message || 'unknown'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDemote = async (u: UserRow) => {
    if (TeamService.isSuperAdmin(u.email)) {
      showToast('err', 'Cannot demote a superadmin.');
      return;
    }
    if (!window.confirm(`Revoke admin access from ${u.email}?`)) return;
    setBusyId(u.id);
    try {
      await TeamService.demoteAdmin(u.id);
      showToast('ok', `${u.email} is no longer an admin.`);
      await load();
    } catch (err: any) {
      showToast('err', 'Demote failed: ' + (err?.message || 'unknown'));
    } finally {
      setBusyId(null);
    }
  };

  // ─── Bounce screen ──────────────────────────────────────────────────────
  if (!isModerator) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4 p-8 bg-rose-500/5 border border-rose-500/20 rounded-3xl">
          <Shield size={40} className="text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Admin Access Only</h2>
          <p className="text-slate-400 text-sm">
            This dashboard is restricted to platform administrators.
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

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-32 scrollbar-thin">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-7">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
              <Shield className="text-amber-400 flex-shrink-0" size={26} />
              Admin Dashboard
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Platform-wide control · {users.length} users · {teams.length} teams · {adminUsers.length} admins
            </p>
          </div>
          <button
            onClick={load}
            className="self-start sm:self-auto flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs sm:text-sm font-medium text-slate-300"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${
            toast.kind === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {toast.kind === 'ok' ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
            <span className="flex-1">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-sm text-rose-300">
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#0d1126] border border-white/5 rounded-xl overflow-x-auto scrollbar-none">
          {([
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users',    label: 'Users',    icon: Users      },
            { id: 'teams',    label: 'Teams',    icon: Briefcase  },
            { id: 'admins',   label: 'Admins',   icon: Crown      },
          ] as { id: Tab; label: string; icon: typeof BarChart3 }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                tab === id
                  ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
              {id === 'users' && <span className="text-[10px] opacity-60">{users.length}</span>}
              {id === 'teams' && <span className="text-[10px] opacity-60">{teams.length}</span>}
              {id === 'admins' && <span className="text-[10px] opacity-60">{adminUsers.length}</span>}
            </button>
          ))}
        </div>

        {/* Search bar (hidden on overview) */}
        {tab !== 'overview' && tab !== 'admins' && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'users' ? 'Search users by email, name or id…' : 'Search teams by title, owner or PIN…'}
              className="w-full pl-9 pr-9 py-2.5 bg-[#0d1126] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* ── Overview ───────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-5 sm:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard icon={Users} label="Users" value={users.length} accent="indigo" />
              <StatCard icon={Briefcase} label="Teams" value={teams.length} accent="emerald" />
              <StatCard icon={Crown} label="Admins" value={adminUsers.length} accent="amber" />
              <StatCard
                icon={BarChart3}
                label="Avg Members / Team"
                value={teams.length ? Math.round(teams.reduce((a, t) => a + t.member_count, 0) / teams.length) : 0}
                accent="purple"
              />
            </div>

            <section className="bg-[#151520] border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
              <h2 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-widest mb-4">
                Latest Signups
              </h2>
              <div className="divide-y divide-white/5">
                {users.slice(0, 5).map(u => (
                  <div key={u.id} className="py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-300 font-bold text-sm flex-shrink-0">
                      {(u.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{u.email}</p>
                      <p className="text-[11px] text-slate-500">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    {(adminIdSet.has(u.id) || TeamService.isSuperAdmin(u.email)) && (
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-2 py-0.5">
                        ADMIN
                      </span>
                    )}
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-slate-500 text-sm italic py-4 text-center">No users yet.</p>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ── Users ──────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <section className="bg-[#151520] border border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden">
            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <p className="text-slate-500 text-sm italic py-8 text-center px-4">No users match.</p>
              ) : (
                filteredUsers.map(u => {
                  const isAdmin = adminIdSet.has(u.id);
                  const isSuper = TeamService.isSuperAdmin(u.email);
                  return (
                    <div key={u.id} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-300 font-bold flex-shrink-0">
                          {(u.email || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-white text-sm truncate">{u.email}</p>
                            {isSuper && <Badge label="SUPER" tone="amber" />}
                            {isAdmin && !isSuper && <Badge label="ADMIN" tone="amber" />}
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{u.id}</p>
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            {u.name ? `${u.name} · ` : ''}
                            {u.createdAt ? `Joined ${new Date(u.createdAt).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!isSuper && (isAdmin ? (
                          <ActionBtn
                            tone="slate"
                            icon={ShieldOff}
                            label="Revoke"
                            busy={busyId === u.id}
                            onClick={() => handleDemote(u)}
                          />
                        ) : (
                          <ActionBtn
                            tone="amber"
                            icon={ShieldPlus}
                            label="Make Admin"
                            busy={busyId === u.id}
                            onClick={() => handlePromote(u)}
                          />
                        ))}
                        {!isSuper && (
                          <ActionBtn
                            tone="rose"
                            icon={Trash2}
                            label="Delete"
                            busy={busyId === u.id}
                            onClick={() => handleDeleteUser(u)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block">
              <table className="w-full text-sm">
                <thead className="bg-[#0d1126] text-slate-400 text-[11px] uppercase tracking-widest">
                  <tr>
                    <th className="text-left px-6 py-3 font-bold">User</th>
                    <th className="text-left px-6 py-3 font-bold">User ID</th>
                    <th className="text-left px-6 py-3 font-bold">Joined</th>
                    <th className="text-right px-6 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map(u => {
                    const isAdmin = adminIdSet.has(u.id);
                    const isSuper = TeamService.isSuperAdmin(u.email);
                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02]">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-300 font-bold flex-shrink-0">
                              {(u.email || '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{u.email}</span>
                                {isSuper && <Badge label="SUPER" tone="amber" />}
                                {isAdmin && !isSuper && <Badge label="ADMIN" tone="amber" />}
                              </div>
                              <span className="text-xs text-slate-500">{u.name || '—'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-[11px] text-slate-500 font-mono truncate max-w-[160px]">{u.id}</td>
                        <td className="px-6 py-3 text-xs text-slate-400">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            {!isSuper && (isAdmin ? (
                              <ActionBtn
                                tone="slate"
                                icon={ShieldOff}
                                label="Revoke"
                                busy={busyId === u.id}
                                onClick={() => handleDemote(u)}
                              />
                            ) : (
                              <ActionBtn
                                tone="amber"
                                icon={ShieldPlus}
                                label="Promote"
                                busy={busyId === u.id}
                                onClick={() => handlePromote(u)}
                              />
                            ))}
                            {!isSuper && (
                              <ActionBtn
                                tone="rose"
                                icon={Trash2}
                                label="Delete"
                                busy={busyId === u.id}
                                onClick={() => handleDeleteUser(u)}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500 text-sm italic">
                        No users match.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Teams ──────────────────────────────────────────────────── */}
        {tab === 'teams' && (
          <section className="bg-[#151520] border border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden">
            <div className="lg:hidden divide-y divide-white/5">
              {filteredTeams.length === 0 ? (
                <p className="text-slate-500 text-sm italic py-8 text-center px-4">No teams match.</p>
              ) : (
                filteredTeams.map(t => (
                  <div key={t.id} className="p-4 space-y-2">
                    <p className="font-medium text-white text-sm truncate">{t.title || 'Untitled Team'}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Owner: <span className="font-mono text-slate-300">{t.owner_email || t.owner_id}</span>
                    </p>
                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      <span className="bg-white/5 text-slate-300 rounded-md px-2 py-0.5">
                        {t.member_count} member{t.member_count === 1 ? '' : 's'}
                      </span>
                      <span className="bg-indigo-500/10 text-indigo-300 rounded-md px-2 py-0.5 font-mono">
                        PIN {t.pin}
                      </span>
                      <span className="text-slate-500">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div className="pt-2">
                      <ActionBtn
                        tone="rose"
                        icon={Trash2}
                        label="Delete Team"
                        busy={busyId === t.id}
                        onClick={() => handleDeleteTeam(t)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden lg:block">
              <table className="w-full text-sm">
                <thead className="bg-[#0d1126] text-slate-400 text-[11px] uppercase tracking-widest">
                  <tr>
                    <th className="text-left px-6 py-3 font-bold">Team</th>
                    <th className="text-left px-6 py-3 font-bold">Owner</th>
                    <th className="text-left px-6 py-3 font-bold">Members</th>
                    <th className="text-left px-6 py-3 font-bold">PIN</th>
                    <th className="text-left px-6 py-3 font-bold">Created</th>
                    <th className="text-right px-6 py-3 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTeams.map(t => (
                    <tr key={t.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-3">
                        <p className="text-white font-medium truncate max-w-[220px]">{t.title || 'Untitled'}</p>
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-300 font-mono truncate max-w-[200px]">
                        {t.owner_email || t.owner_id}
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-300">{t.member_count}</td>
                      <td className="px-6 py-3 text-xs text-indigo-300 font-mono">{t.pin}</td>
                      <td className="px-6 py-3 text-xs text-slate-400">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <ActionBtn
                          tone="rose"
                          icon={Trash2}
                          label="Delete"
                          busy={busyId === t.id}
                          onClick={() => handleDeleteTeam(t)}
                        />
                      </td>
                    </tr>
                  ))}
                  {filteredTeams.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-500 text-sm italic">
                        No teams match.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Admins ─────────────────────────────────────────────────── */}
        {tab === 'admins' && (
          <section className="bg-[#151520] border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-amber-200">
              <Crown size={14} className="mt-0.5 flex-shrink-0" />
              <p>
                Superadmins are hardcoded and cannot be revoked. Promoted admins can be revoked at any time
                from the <span className="font-bold">Users</span> tab.
              </p>
            </div>

            <div className="divide-y divide-white/5">
              {adminUsers.length === 0 ? (
                <p className="text-slate-500 text-sm italic py-6 text-center">No admins yet.</p>
              ) : (
                adminUsers.map(u => {
                  const isSuper = TeamService.isSuperAdmin(u.email);
                  const grant = adminRows.find(r => r.user_id === u.id);
                  return (
                    <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="min-w-0 flex-1 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-300 flex-shrink-0">
                          {isSuper ? <Crown size={14} /> : <ShieldCheck size={14} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{u.email}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {isSuper ? 'Hardcoded superadmin' : (
                              grant
                                ? `Promoted ${new Date(grant.granted_at).toLocaleDateString()}`
                                : 'Active admin'
                            )}
                          </p>
                        </div>
                      </div>
                      {!isSuper && (
                        <ActionBtn
                          tone="slate"
                          icon={ShieldOff}
                          label="Revoke"
                          busy={busyId === u.id}
                          onClick={() => handleDemote(u)}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

const StatCard = ({
  icon: Icon, label, value, accent,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  accent: 'indigo' | 'emerald' | 'amber' | 'purple';
}) => {
  const tones: Record<string, string> = {
    indigo:  'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    amber:   'text-amber-300 bg-amber-500/10 border-amber-500/20',
    purple:  'text-purple-300 bg-purple-500/10 border-purple-500/20',
  };
  return (
    <div className="p-4 sm:p-5 bg-[#151520] border border-white/5 rounded-2xl">
      <div className={`inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 px-2 py-0.5 rounded-md border ${tones[accent]}`}>
        <Icon size={12} /> {label}
      </div>
      <div className="text-2xl sm:text-3xl font-black text-white">{value}</div>
    </div>
  );
};

const Badge = ({ label, tone }: { label: string; tone: 'amber' | 'emerald' | 'rose' }) => {
  const tones: Record<string, string> = {
    amber:   'text-amber-300 bg-amber-500/10 border-amber-500/30',
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    rose:    'text-rose-300 bg-rose-500/10 border-rose-500/30',
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-widest border rounded-md px-1.5 py-0.5 ${tones[tone]}`}>
      {label}
    </span>
  );
};

const ActionBtn = ({
  tone, icon: Icon, label, busy, onClick,
}: {
  tone: 'rose' | 'amber' | 'slate';
  icon: typeof Trash2;
  label: string;
  busy?: boolean;
  onClick: () => void;
}) => {
  const tones: Record<string, string> = {
    rose:  'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300',
    amber: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300',
    slate: 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300',
  };
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border disabled:opacity-50 transition-colors ${tones[tone]}`}
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
      <span>{label}</span>
    </button>
  );
};
