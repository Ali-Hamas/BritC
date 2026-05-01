import { getApiUrl } from './api-config';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'no_session' | 'referral_required';

export interface PendingUser {
  user_id: string;
  email: string;
  name: string | null;
  status: 'pending';
  requested_plan: 'free' | 'enterprise';
  created_at: string;
}

export async function getMyApprovalStatus(): Promise<ApprovalStatus> {
  try {
    const res = await fetch(getApiUrl('/account/status'), { credentials: 'include' });
    if (res.status === 401) return 'no_session';
    if (!res.ok) return 'no_session';
    const data = await res.json();
    return (data.status as ApprovalStatus) || 'no_session';
  } catch {
    return 'no_session';
  }
}

export async function adminListPending(): Promise<PendingUser[]> {
  const res = await fetch(getApiUrl('/admin/pending-users'), { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to load pending users (${res.status})`);
  const data = await res.json();
  return (data.users || []) as PendingUser[];
}

export async function adminDecideUser(userId: string, decision: 'approved' | 'rejected'): Promise<void> {
  const res = await fetch(getApiUrl('/admin/approve-user'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, decision }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to ${decision} user`);
  }
}

// ─── Plan ───────────────────────────────────────────────────────────────
export type Plan = 'free' | 'enterprise';

export async function getMyPlan(): Promise<Plan | null> {
  try {
    const res = await fetch(getApiUrl('/account/plan'), { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.plan as Plan) || 'free';
  } catch {
    return null;
  }
}

export async function adminSetPlan(userId: string, plan: Plan): Promise<void> {
  const res = await fetch(getApiUrl('/admin/set-plan'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, plan }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to set plan');
  }
}

// ─── Referrals ──────────────────────────────────────────────────────────
export interface ReferralToken {
  token: string;
  url: string;
  note: string | null;
  created_at: string;
  used_at: string | null;
  used_email: string | null;
  revoked_at: string | null;
  created_by: string | null;
  created_by_email: string | null;
}

// Pre-stash a referral with the backend, keyed by email. Call this BEFORE
// signUp.email so the user-create hook can match the token to the new row.
// Returns true if the token is valid + accepted, false otherwise.
export async function claimReferralForEmail(email: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/account/claim-referral'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Pre-stash a signup intent (free or enterprise) with the backend.
export async function recordSignupIntent(email: string, intent: 'free' | 'enterprise'): Promise<void> {
  try {
    await fetch(getApiUrl('/account/intent'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, intent }),
    });
  } catch { /* best effort */ }
}

export async function adminListReferrals(): Promise<ReferralToken[]> {
  const res = await fetch(getApiUrl('/admin/referrals'), { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to load referrals (${res.status})`);
  const data = await res.json();
  return (data.tokens || []) as ReferralToken[];
}

export async function adminCreateReferral(note?: string): Promise<ReferralToken> {
  const res = await fetch(getApiUrl('/admin/referrals'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note: note || null }),
  });
  if (!res.ok) throw new Error('Failed to generate referral');
  return await res.json();
}

export async function adminRevokeReferral(token: string): Promise<void> {
  const res = await fetch(getApiUrl('/admin/referrals/revoke'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) throw new Error('Failed to revoke referral');
}

export async function validateReferralToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/account/validate-referral'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

