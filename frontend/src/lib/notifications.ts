// Client-side notifications — combines news headlines, finance anomalies,
// and ad-hoc events. Read state persists in localStorage.

import { fetchNews } from './news';

export type NotifKind = 'news' | 'finance' | 'system';
export type NavTarget = 'chat' | 'finance' | 'news' | 'profile' | 'admin' | 'team';

export interface AppNotification {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  time: string; // ISO
  href?: string;
  navigateTo?: NavTarget;
  meta?: string;
}

const READ_KEY = 'britsync_notif_read';
const SYSTEM_KEY = 'britsync_notif_system';

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function setReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* quota — non-fatal */
  }
}

function getSystemNotifs(): AppNotification[] {
  try {
    const raw = localStorage.getItem(SYSTEM_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AppNotification[];
  } catch {
    return [];
  }
}

export function pushSystemNotification(n: Omit<AppNotification, 'time' | 'kind'> & { time?: string }): void {
  try {
    const list = getSystemNotifs();
    const entry: AppNotification = {
      ...n,
      kind: 'system',
      time: n.time || new Date().toISOString(),
    };
    list.unshift(entry);
    localStorage.setItem(SYSTEM_KEY, JSON.stringify(list.slice(0, 30)));
  } catch {
    /* ignore */
  }
}

async function fetchNewsNotifications(): Promise<AppNotification[]> {
  try {
    const items = await fetchNews(false);
    return items.slice(0, 5).map(n => ({
      id: `news-${n.id}`,
      kind: 'news' as const,
      title: n.title,
      body: n.summary || `New headline from ${n.source}`,
      time: n.pubDate || new Date().toISOString(),
      href: n.link,
      navigateTo: 'news' as NavTarget,
      meta: n.source,
    }));
  } catch {
    return [];
  }
}

function getFinanceNotifications(): AppNotification[] {
  // Look up flagged anomalies cached by FinanceDashboard if any.
  // We can't import the whole analytics chain here without a userId,
  // so we read a lightweight cache key the dashboard can populate.
  try {
    const raw = localStorage.getItem('britsync_finance_alerts');
    if (!raw) return [];
    const list = JSON.parse(raw) as Array<{ id: string; title: string; body: string; time?: string }>;
    return list.slice(0, 5).map(a => ({
      id: `fin-${a.id}`,
      kind: 'finance' as const,
      title: a.title,
      body: a.body,
      time: a.time || new Date().toISOString(),
      navigateTo: 'finance' as NavTarget,
      meta: 'Finance',
    }));
  } catch {
    return [];
  }
}

export async function getAllNotifications(): Promise<AppNotification[]> {
  const [news, finance, system] = await Promise.all([
    fetchNewsNotifications(),
    Promise.resolve(getFinanceNotifications()),
    Promise.resolve(getSystemNotifs()),
  ]);
  const merged = [...system, ...finance, ...news];
  merged.sort((a, b) => {
    const ta = Date.parse(a.time) || 0;
    const tb = Date.parse(b.time) || 0;
    return tb - ta;
  });
  return merged.slice(0, 20);
}

export function getUnreadCount(notifs: AppNotification[]): number {
  const read = getReadIds();
  return notifs.filter(n => !read.has(n.id)).length;
}

export function markRead(id: string) {
  const set = getReadIds();
  set.add(id);
  setReadIds(set);
}

export function markAllRead(ids: string[]) {
  const set = getReadIds();
  ids.forEach(id => set.add(id));
  setReadIds(set);
}

export function isRead(id: string): boolean {
  return getReadIds().has(id);
}
