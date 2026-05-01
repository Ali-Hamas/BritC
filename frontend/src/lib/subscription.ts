import { getApiUrl } from './api-config';

export interface SubscriptionStatus {
  plan: 'free' | 'enterprise';
  subscriptionStatus: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  storageUsed: number;
  storageLimit: number;
  billingCycleStart: string | null;
  billingCycleEnd: string | null;
  source: string;
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
  try {
    const res = await fetch(getApiUrl('/api/subscription/status'), { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function createCheckout(): Promise<{ url: string } | { error: string }> {
  try {
    const res = await fetch(getApiUrl('/api/subscription/create-checkout'), {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.error || 'Checkout failed. Please try again.' };
    }
    return await res.json();
  } catch (e: any) {
    return { error: e.message || 'Network error. Please check your connection.' };
  }
}

export async function getPortalUrl(): Promise<{ url: string } | null> {
  try {
    const res = await fetch(getApiUrl('/api/subscription/portal'), { credentials: 'include' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function cancelSubscription(): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/api/subscription/cancel'), {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getStorageUsage(): Promise<number> {
  try {
    const res = await fetch(getApiUrl('/api/account/storage'), { credentials: 'include' });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.used || 0;
  } catch {
    return 0;
  }
}

export async function addStorageBytes(bytes: number): Promise<boolean> {
  try {
    const res = await fetch(getApiUrl('/api/account/storage'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bytes }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const STORAGE_LIMIT = 64 * 1024 * 1024 * 1024; // 64 GB

export interface AdminSubscriptionRow {
  user_id: string;
  email: string;
  plan: 'free' | 'enterprise';
  subscription_status: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
  storage_used: number;
  billing_cycle_start: string | null;
  billing_cycle_end: string | null;
  source: string;
  created_at: string;
}

export async function adminListSubscriptions(): Promise<AdminSubscriptionRow[]> {
  try {
    const res = await fetch(getApiUrl('/api/admin/subscriptions'), { credentials: 'include' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
