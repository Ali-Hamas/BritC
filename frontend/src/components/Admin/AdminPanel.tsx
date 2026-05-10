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
  CheckCircle, Clock, Link as LinkIcon, Copy, Ban, Plus, CreditCard,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { TeamService, type Team } from '../../lib/team';
import { adminListPending, adminDecideUser, adminListReferrals, adminCreateReferral, adminRevokeReferral, type PendingUser, type ReferralToken } from '../../lib/approval';
import { adminListSubscriptions, formatBytes, type AdminSubscriptionRow } from '../../lib/subscription';
import { getApiUrl } from '../../lib/api-config';

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

type Tab = 'overview' | 'users' | 'teams' | 'admins' | 'pending' | 'referrals' | 'subscriptions';

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminPanel = ({ userEmail }: { userEmail?: string }) => {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<TeamWithCount[]>([]);
  const [adminRows, setAdminRows] = useState<AdminRow[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [referralTokens, setReferralTokens] = useState<ReferralToken[]>([]);
  const [showCreateReferral, setShowCreateReferral] = useState(false);
  const [referralNote, setReferralNote] = useState('');
  const [subscriptionRows, setSubscriptionRows] = useState<AdminSubscriptionRow[]>([]);

  // Check moderator status using both the passed email (from session) and the
  // cached email, so we never lose admin access due to a stale localStorage.
  const isModerator = useMemo(() => {
    if (userEmail && TeamService.isGlobalModerator()) return true;
    if (userEmail) {
      const lower = userEmail.toLowerCase();
      if (TeamService.isSuperAdmin(lower)) return true;
    }
    return TeamService.isGlobalModerator();
  }, [userEmail]);

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

      // Batch all team member counts in a single query instead of N sequential queries
      const teamIds = (teamRows || []).map((t: any) => t.id);
      let memberCounts: Record<string, number> = {};
      if (teamIds.length > 0) {
        const { data: counts, error: countErr } = await supabase
          .from('team_members')
          .select('team_id')
          .in('team_id', teamIds)
          .then(r => r);
        if (!countErr && counts) {
          for (const c of counts) {
            memberCounts[c.team_id] = (memberCounts[c.team_id] || 0) + 1;
          }
        }
      }

      const enriched: TeamWithCount[] = (teamRows || []).map((t: Team) => ({
        ...t,
        member_count: memberCounts[t.id] || 0,
        owner_email: (userRows || []).find((u: any) => u.id === t.owner_id)?.email ?? null,
      }));

      setUsers((userRows || []) as UserRow[]);
      setTeams(enriched);
      setAdminRows(adminList);

      // Load pending users, referrals, and subscriptions in parallel
      const [pendingResult, referralsResult, subsResult] = await Promise.allSettled([
        adminListPending(),
        adminListReferrals(),
        adminListSubscriptions(),
      ]);
      if (pendingResult.status === 'fulfilled') setPendingUsers(pendingResult.value);
      if (referralsResult.status === 'fulfilled') setReferralTokens(referralsResult.value);
      if (subsResult.status === 'fulfilled') setSubscriptionRows(subsResult.value);

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

  const planByUserId = useMemo(() => {
    const m: Record<string, 'free' | 'enterprise'> = {};
    for (const s of subscriptionRows) m[s.user_id] = s.plan;
    return m;
  }, [subscriptionRows]);

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

  const handleDecidePending = async (u: PendingUser, decision: 'approved' | 'rejected') => {
    const verb = decision === 'approved' ? 'Approve' : 'Reject';
    if (!window.confirm(`${verb} ${u.email}?`)) return;
    setBusyId(u.user_id);
    try {
      await adminDecideUser(u.user_id, decision);
      showToast('ok', `${u.email} ${decision === 'approved' ? 'approved' : 'rejected'}.`);
      const pending = await adminListPending();
      setPendingUsers(pending);
    } catch (err: any) {
      showToast('err', `${verb} failed: ` + (err?.message || 'unknown'));
    } finally {
      setBusyId(null);
    }
  };

  const handleSetPlan = async (userId: string, email: string, plan: 'free' | 'enterprise') => {
    if (!window.confirm(`Set ${email} to ${plan} plan?`)) return;
    setBusyId(userId);
    try {
      const res = await fetch(getApiUrl('/api/admin/set-plan'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan }),
      });
      if (!res.ok) throw new Error('Failed to update plan');
      showToast('ok', `${email} is now on ${plan} plan.`);
      await load();
    } catch (err: any) {
      showToast('err', 'Plan change failed: ' + (err?.message || 'unknown'));
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
    <div className="h-full overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 pb-32 bg-slate-50 font-sans text-slate-900 scrollbar-thin">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-7">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 flex items-center gap-2 sm:gap-3 tracking-tight">
              <Shield className="text-blue-600 flex-shrink-0" size={26} />
              Admin Dashboard
            </h1>
            <p className="text-slate-500 font-medium text-xs sm:text-sm mt-1">
              Platform-wide control · {users.length} users · {teams.length} teams · {adminUsers.length} admins
            </p>
          </div>
          <button
            onClick={load}
            className="self-start sm:self-auto flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs sm:text-sm font-bold text-slate-700 shadow-sm transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm border shadow-sm ${
            toast.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
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
        <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto scrollbar-none shadow-sm">
          {([
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
            { id: 'pending',  label: 'Pending',  icon: Clock      },
            { id: 'users',    label: 'Users',    icon: Users      },
            { id: 'teams',    label: 'Teams',    icon: Briefcase  },
            { id: 'admins',   label: 'Admins',   icon: Crown      },
            { id: 'referrals', label: 'Referrals', icon: LinkIcon  },
          ] as { id: Tab; label: string; icon: typeof BarChart3 }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-black uppercase tracking-tight whitespace-nowrap transition-all ${
                tab === id
                  ? 'bg-blue-600 text-white shadow-md active:scale-95'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
              {id === 'pending' && pendingUsers.length > 0 && (
                <span className="text-[10px] font-black bg-orange-100 text-orange-600 border border-orange-200 rounded px-1.5 py-0.5 ml-1 shadow-sm">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search bar (hidden on overview) */}
        {tab !== 'overview' && tab !== 'admins' && tab !== 'pending' && (
          <div className="relative group">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'users' ? 'Search users by email, name or id…' : 'Search teams by title, owner or PIN…'}
              className="w-full pl-9 pr-9 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* ── Overview ───────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-5 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard icon={Users} label="Accounts" value={users.length} accent="indigo" />
              <StatCard icon={Briefcase} label="Active Teams" value={teams.length} accent="emerald" />
              <StatCard icon={Shield} label="Privileged" value={adminRows.length} accent="amber" />
              <StatCard icon={Clock} label="Pending" value={pendingUsers.length} accent="purple" />
            </div>

            <section className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">
                Recent Signups
              </h2>
              <div className="divide-y divide-slate-100">
                {users.slice(0, 10).map(u => (
                  <div key={u.id} className="py-4 flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-sm flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                      {(u.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900 font-black truncate">{u.email}</p>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">
                        {u.createdAt ? `Joined ${new Date(u.createdAt).toLocaleDateString()}` : '—'}
                      </p>
                    </div>
                    {(adminIdSet.has(u.id) || TeamService.isSuperAdmin(u.email)) && (
                      <Badge label="ADMIN" tone="amber" />
                    )}
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-slate-500 text-sm italic py-8 text-center px-4">No signal detected.</p>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ── Subscriptions ──────────────────────────────────────────── */}
        {tab === 'subscriptions' && (
          <section className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
                    <CreditCard size={16} className="text-blue-600" />
                    Subscriptions
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-tight">
                    {subscriptionRows.filter(s => s.plan === 'enterprise').length} Enterprise · {subscriptionRows.filter(s => s.plan === 'free').length} Free
                  </p>
                </div>
                <button
                  onClick={load}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors shadow-sm"
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
            </div>

            {subscriptionRows.length === 0 ? (
              <p className="text-slate-500 text-sm italic py-12 text-center">No subscription records found.</p>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="lg:hidden divide-y divide-slate-100">
                  {subscriptionRows.map(s => (
                    <div key={s.user_id} className="p-5 space-y-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="font-black text-slate-900 text-sm truncate">{s.email}</p>
                        <Badge label={s.plan} tone={s.plan === 'enterprise' ? 'emerald' : 'amber'} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        <span className={`px-2 py-0.5 rounded-md border font-black uppercase tracking-widest shadow-sm ${
                          s.subscription_status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          s.subscription_status === 'past_due' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {s.subscription_status}
                        </span>
                        <span className="text-slate-500 font-bold uppercase tracking-tight">{formatBytes(s.storage_used || 0)} used</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                        Source: {s.source} · Joined {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                      </p>
                      <div className="flex gap-2 pt-2">
                        {s.plan !== 'enterprise' && (
                          <ActionBtn tone="emerald" icon={Crown} label="Grant Enterprise" busy={busyId === s.user_id} onClick={() => handleSetPlan(s.user_id, s.email, 'enterprise')} />
                        )}
                        {s.plan !== 'free' && (
                          <ActionBtn tone="slate" icon={ShieldOff} label="Set Free" busy={busyId === s.user_id} onClick={() => handleSetPlan(s.user_id, s.email, 'free')} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-y border-slate-100">
                      <tr>
                        <th className="text-left px-6 py-4">User Identity</th>
                        <th className="text-left px-6 py-4">Current Plan</th>
                        <th className="text-left px-6 py-4">Status</th>
                        <th className="text-left px-6 py-4">Storage</th>
                        <th className="text-left px-6 py-4">Source</th>
                        <th className="text-left px-6 py-4">Joined</th>
                        <th className="text-right px-6 py-4">Management</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {subscriptionRows.map(s => (
                        <tr key={s.user_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black shadow-sm">
                                {(s.email || '?')[0].toUpperCase()}
                              </div>
                              <span className="text-slate-900 font-black truncate max-w-[220px]">{s.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border shadow-sm ${
                              s.plan === 'enterprise'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                              {s.plan.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded border font-black uppercase tracking-widest shadow-sm ${
                              s.subscription_status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              s.subscription_status === 'past_due' ? 'bg-red-50 text-red-700 border-red-200' :
                              s.subscription_status === 'canceled' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                              'bg-orange-50 text-orange-600 border-orange-200'
                            }`}>
                              {s.subscription_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600 font-bold tabular-nums">
                            {formatBytes(s.storage_used || 0)}
                          </td>
                          <td className="px-6 py-4 text-[11px] text-slate-500 font-bold uppercase tracking-tight">{s.source}</td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-bold">
                            {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 justify-end">
                              {s.plan !== 'enterprise' && (
                                <ActionBtn tone="emerald" icon={Crown} label="Upgrade" busy={busyId === s.user_id} onClick={() => handleSetPlan(s.user_id, s.email, 'enterprise')} />
                              )}
                              {s.plan !== 'free' && (
                                <ActionBtn tone="slate" icon={ShieldOff} label="Downgrade" busy={busyId === s.user_id} onClick={() => handleSetPlan(s.user_id, s.email, 'free')} />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {/* ── Pending Approvals ──────────────────────────────────────── */}
        {tab === 'pending' && (
          <section className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 sm:p-8">
            <div className="flex items-center justify-between mb-8 gap-2 flex-wrap">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 uppercase tracking-[0.2em]">
                  <Clock size={16} className="text-orange-500" />
                  Awaiting Oversight
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-bold">Pending signups must be vetted before workspace access.</p>
              </div>
              <button
                onClick={load}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-700 transition-colors shadow-sm"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="py-20 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <CheckCircle size={32} className="text-emerald-500 mx-auto mb-4 opacity-30" />
                <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Zero Pending Items</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingUsers.map(u => (
                  <div key={u.user_id} className="py-5 flex items-center gap-4 flex-wrap sm:flex-nowrap group">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 font-black text-lg shadow-sm group-hover:scale-110 transition-transform">
                      {(u.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900 font-black truncate">{u.email}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                          {u.name ? `${u.name} · ` : ''}Joined {new Date(u.created_at).toLocaleDateString()}
                        </p>
                        <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded border shadow-sm ${
                          u.requested_plan === 'enterprise' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {u.requested_plan || 'free'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-auto">
                      <button
                        onClick={() => handleDecidePending(u, 'rejected')}
                        disabled={busyId === u.user_id}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-black text-red-600 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm active:scale-95"
                      >
                        {busyId === u.user_id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                        REJECT
                      </button>
                      <button
                        onClick={() => handleDecidePending(u, 'approved')}
                        disabled={busyId === u.user_id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                      >
                        {busyId === u.user_id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        APPROVE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Users ──────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <section className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden">
            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <p className="text-slate-500 text-sm italic py-12 text-center px-4">Zero signal detected.</p>
              ) : (
                filteredUsers.map(u => {
                  const isAdmin = adminIdSet.has(u.id);
                  const isSuper = TeamService.isSuperAdmin(u.email);
                  const plan = planByUserId[u.id] || 'free';
                  return (
                    <div key={u.id} className="p-5 space-y-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-lg shadow-sm">
                          {(u.email || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-black text-slate-900 text-sm truncate">{u.email}</p>
                            {isSuper && <Badge label="SUPER" tone="amber" />}
                            {isAdmin && !isSuper && <Badge label="ADMIN" tone="amber" />}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{u.id}</p>
                          <div className="flex items-center gap-2 mt-2">
                             <Badge label={plan === 'enterprise' ? 'ENTERPRISE' : 'FREE'} tone={plan === 'enterprise' ? 'emerald' : 'rose'} />
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Joined {new Date(u.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap pt-1">
                        {plan !== 'enterprise' && (
                          <ActionBtn tone="emerald" icon={Crown} label="Enterprise" busy={busyId === u.id} onClick={() => handleSetPlan(u.id, u.email, 'enterprise')} />
                        )}
                        {plan === 'enterprise' && (
                          <ActionBtn tone="slate" icon={ShieldOff} label="Downgrade" busy={busyId === u.id} onClick={() => handleSetPlan(u.id, u.email, 'free')} />
                        )}
                        {!isSuper && (isAdmin ? (
                          <ActionBtn tone="slate" icon={ShieldOff} label="Revoke" busy={busyId === u.id} onClick={() => handleDemote(u)} />
                        ) : (
                          <ActionBtn tone="amber" icon={ShieldPlus} label="Promote" busy={busyId === u.id} onClick={() => handlePromote(u)} />
                        ))}
                        {!isSuper && (
                          <ActionBtn tone="rose" icon={Trash2} label="Delete" busy={busyId === u.id} onClick={() => handleDeleteUser(u)} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-y border-slate-100">
                  <tr>
                    <th className="text-left px-6 py-4">Operator</th>
                    <th className="text-left px-6 py-4">Status / Plan</th>
                    <th className="text-left px-6 py-4">Internal ID</th>
                    <th className="text-left px-6 py-4">Joined</th>
                    <th className="text-right px-6 py-4">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredUsers.map(u => {
                    const isAdmin = adminIdSet.has(u.id);
                    const isSuper = TeamService.isSuperAdmin(u.email);
                    const plan = planByUserId[u.id] || 'free';
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black shadow-sm">
                              {(u.email || '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-900 font-black">{u.email}</span>
                                {isSuper && <Badge label="SUPER" tone="amber" />}
                                {isAdmin && !isSuper && <Badge label="ADMIN" tone="amber" />}
                              </div>
                              <span className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">{u.name || 'Anonymous User'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge label={plan.toUpperCase()} tone={plan === 'enterprise' ? 'emerald' : 'rose'} />
                        </td>
                        <td className="px-6 py-4 text-[10px] text-slate-400 font-mono truncate max-w-[140px]">{u.id}</td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-bold">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            {plan !== 'enterprise' && (
                              <ActionBtn tone="emerald" icon={Crown} label="Enterprise" busy={busyId === u.id} onClick={() => handleSetPlan(u.id, u.email, 'enterprise')} />
                            )}
                            {plan === 'enterprise' && (
                              <ActionBtn tone="slate" icon={ShieldOff} label="Set Free" busy={busyId === u.id} onClick={() => handleSetPlan(u.id, u.email, 'free')} />
                            )}
                            {!isSuper && (isAdmin ? (
                              <ActionBtn tone="slate" icon={ShieldOff} label="Revoke" busy={busyId === u.id} onClick={() => handleDemote(u)} />
                            ) : (
                              <ActionBtn tone="amber" icon={ShieldPlus} label="Promote" busy={busyId === u.id} onClick={() => handlePromote(u)} />
                            ))}
                            {!isSuper && (
                              <ActionBtn tone="rose" icon={Trash2} label="Delete" busy={busyId === u.id} onClick={() => handleDeleteUser(u)} />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Teams ──────────────────────────────────────────────────── */}
        {tab === 'teams' && (
          <section className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden">
            <div className="lg:hidden divide-y divide-slate-100">
              {filteredTeams.length === 0 ? (
                <p className="text-slate-500 text-sm italic py-12 text-center px-4">Zero signal detected.</p>
              ) : (
                filteredTeams.map(t => (
                  <div key={t.id} className="p-5 space-y-3 hover:bg-slate-50 transition-colors">
                    <p className="font-black text-slate-900 text-sm truncate">{t.title || 'Untitled Workspace'}</p>
                    <p className="text-[11px] text-slate-500 font-bold truncate">
                      Owner: <span className="font-mono text-blue-600">{t.owner_email || t.owner_id}</span>
                    </p>
                    <div className="flex items-center gap-2 flex-wrap text-[10px]">
                      <span className="bg-blue-50 text-blue-700 border border-blue-100 rounded-md px-2 py-0.5 font-black uppercase tracking-widest shadow-sm">
                        {t.member_count} member{t.member_count === 1 ? '' : 's'}
                      </span>
                      <span className="bg-orange-50 text-orange-700 border border-orange-100 rounded-md px-2 py-0.5 font-mono font-black uppercase shadow-sm">
                        PIN {t.pin}
                      </span>
                      <span className="text-slate-400 font-bold uppercase tracking-wider ml-auto">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div className="pt-3">
                      <ActionBtn tone="rose" icon={Trash2} label="Terminate Workspace" busy={busyId === t.id} onClick={() => handleDeleteTeam(t)} />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-y border-slate-100">
                  <tr>
                    <th className="text-left px-6 py-4">Workspace Title</th>
                    <th className="text-left px-6 py-4">Strategy Owner</th>
                    <th className="text-left px-6 py-4">Units</th>
                    <th className="text-left px-6 py-4">Auth PIN</th>
                    <th className="text-left px-6 py-4">Deployed</th>
                    <th className="text-right px-6 py-4">Management</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTeams.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-slate-900 font-black truncate max-w-[220px]">{t.title || 'Untitled'}</p>
                      </td>
                      <td className="px-6 py-4 text-[11px] text-blue-600 font-mono font-black truncate max-w-[200px]">
                        {t.owner_email || t.owner_id}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-700 font-black tabular-nums">{t.member_count}</td>
                      <td className="px-6 py-4 text-xs text-orange-600 font-mono font-black uppercase tracking-widest">{t.pin}</td>
                      <td className="px-6 py-4 text-xs text-slate-400 font-bold">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ActionBtn tone="rose" icon={Trash2} label="Terminate" busy={busyId === t.id} onClick={() => handleDeleteTeam(t)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Admins ─────────────────────────────────────────────────── */}
        {tab === 'admins' && (
          <section className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-4 p-4 bg-orange-50 border border-orange-100 rounded-2xl text-xs text-orange-800 shadow-inner">
              <Crown size={18} className="mt-0.5 flex-shrink-0 text-orange-600" />
              <p className="font-bold leading-relaxed">
                Superadmins are hardcoded into the kernel and cannot be revoked. Promoted admins can be revoked at any time
                from the <span className="font-black underline">Users</span> tab.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {adminUsers.map(u => {
                const isSuper = TeamService.isSuperAdmin(u.email);
                const grant = adminRows.find(r => r.user_id === u.id);
                return (
                  <div key={u.id} className="py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 group">
                    <div className="min-w-0 flex-1 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 shadow-sm group-hover:scale-110 transition-transform">
                        {isSuper ? <Crown size={20} /> : <ShieldCheck size={20} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{u.email}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          {isSuper ? 'Kernel Superadmin' : (
                            grant
                              ? `Elevated ${new Date(grant.granted_at).toLocaleDateString()}`
                              : 'Privileged Account'
                          )}
                        </p>
                      </div>
                    </div>
                    {!isSuper && (
                      <ActionBtn tone="slate" icon={ShieldOff} label="Revoke Privileges" busy={busyId === u.id} onClick={() => handleDemote(u)} />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Referrals ──────────────────────────────────────────────── */}
        {tab === 'referrals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">
                Referral Network
              </h2>
              <button
                onClick={() => setShowCreateReferral(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                <Plus size={14} />
                Generate Token
              </button>
            </div>

            {referralTokens.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-200 rounded-[24px] shadow-sm">
                <LinkIcon size={32} className="text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 text-xs font-black uppercase tracking-widest">No Referral Vectors Active</p>
              </div>
            ) : (
              <div className="space-y-3">
                {referralTokens.map((t) => {
                  const isUnused = !t.used_at && !t.revoked_at;
                  const isUsed = !!t.used_at;
                  const isRevoked = !!t.revoked_at;
                  return (
                    <div key={t.token} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-all group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <code className="text-xs text-blue-600 font-mono font-black bg-blue-50 px-2 py-0.5 rounded border border-blue-100 shadow-inner">
                            {t.token.slice(0, 8)}...{t.token.slice(-4)}
                          </code>
                          <Badge
                            label={isRevoked ? 'Revoked' : isUsed ? 'Deployed' : 'Active'}
                            tone={isRevoked ? 'rose' : isUsed ? 'emerald' : 'amber'}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">
                          Origin: {new Date(t.created_at).toLocaleDateString()}
                          {t.used_email && ` · Target: ${t.used_email}`}
                          {t.note && ` · Audit: ${t.note}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isUnused && (
                          <>
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/?ref=${t.token}`;
                                navigator.clipboard.writeText(url);
                                showToast('ok', 'Strategic URL copied!');
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                            >
                              <Copy size={14} />
                              Copy
                            </button>
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Revoke token ${t.token.slice(0, 8)}...?`)) return;
                                setBusyId(t.token);
                                try {
                                  await adminRevokeReferral(t.token);
                                  showToast('ok', 'Token revoked.');
                                  const referrals = await adminListReferrals();
                                  setReferralTokens(referrals);
                                } catch (err: any) {
                                  showToast('err', 'Revoke failed: ' + (err?.message || 'unknown'));
                                } finally {
                                  setBusyId(null);
                                }
                              }}
                              disabled={busyId === t.token}
                              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm"
                            >
                              <Ban size={14} />
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Create Referral Modal */}
        {showCreateReferral && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCreateReferral(false)}>
            <div className="bg-white border border-slate-200 rounded-[32px] p-8 max-w-sm w-full space-y-6 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Generate Referral Vector</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-tight">Create a secure entry link for partners.</p>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Internal Reference</label>
                <input
                  type="text"
                  value={referralNote}
                  onChange={e => setReferralNote(e.target.value)}
                  placeholder="e.g. Agency Partner X"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 shadow-inner"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateReferral(false)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Abort
                </button>
                <button
                  onClick={async () => {
                    setBusyId('create-referral');
                    try {
                      const token = await adminCreateReferral(referralNote || undefined);
                      const referrals = await adminListReferrals();
                      setReferralTokens(referrals);
                      setShowCreateReferral(false);
                      setReferralNote('');
                      showToast('ok', `Token created: ${token.token.slice(0, 8)}...`);
                    } catch (err: any) {
                      showToast('err', 'Create failed: ' + (err?.message || 'unknown'));
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  disabled={busyId === 'create-referral'}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-lg shadow-blue-500/30"
                >
                  {busyId === 'create-referral' ? 'Syncing...' : 'Deploy'}
                </button>
              </div>
            </div>
          </div>
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
    indigo:  'text-blue-700 bg-blue-50 border-blue-200',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    amber:   'text-orange-700 bg-orange-50 border-orange-200',
    purple:  'text-blue-800 bg-blue-100 border-blue-200',
  };
  return (
    <div className="p-6 bg-white border border-slate-200 rounded-[24px] shadow-sm group hover:shadow-md hover:border-blue-200 transition-all">
      <div className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] mb-4 px-2 py-1 rounded-md border shadow-sm ${tones[accent]}`}>
        <Icon size={12} /> {label}
      </div>
      <div className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter">{value.toLocaleString()}</div>
    </div>
  );
};

const Badge = ({ label, tone }: { label: string; tone: 'amber' | 'emerald' | 'rose' }) => {
  const tones: Record<string, string> = {
    amber:   'text-orange-700 bg-orange-50 border-orange-200',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    rose:    'text-red-700 bg-red-50 border-red-200',
  };
  return (
    <span className={`text-[9px] font-black uppercase tracking-[0.2em] border rounded px-2 py-0.5 shadow-sm ${tones[tone]}`}>
      {label}
    </span>
  );
};

const ActionBtn = ({
  tone, icon: Icon, label, busy, onClick,
}: {
  tone: 'rose' | 'amber' | 'slate' | 'emerald';
  icon: typeof Trash2;
  label: string;
  busy?: boolean;
  onClick: () => void;
}) => {
  const tones: Record<string, string> = {
    rose:  'bg-red-50 hover:bg-red-100 border-red-200 text-red-600 shadow-sm',
    amber: 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-600 shadow-sm',
    slate: 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 shadow-sm',
    emerald: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 shadow-sm',
  };
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border disabled:opacity-50 transition-all active:scale-95 ${tones[tone]}`}
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
      <span>{label}</span>
    </button>
  );
};

