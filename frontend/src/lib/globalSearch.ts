// Unified client-side search across local data + cached news.
// No server changes needed — searches localStorage chat sessions,
// page targets, and the cached news feed.

import { fetchNews, type NewsItem } from './news';

export type SearchTab = 'chat' | 'finance' | 'news' | 'profile' | 'admin' | 'team';

export interface SearchHit {
  id: string;
  kind: 'chat' | 'news' | 'page';
  title: string;
  snippet: string;
  navigateTo: SearchTab;
  href?: string;
  meta?: string;
}

const SESSIONS_KEY = 'britc_chat_sessions';

function searchChats(query: string): SearchHit[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const sessions = JSON.parse(raw) as Array<{
      id: string;
      title?: string;
      preview?: string;
      messages?: Array<{ content: string; role: string }>;
    }>;
    const q = query.toLowerCase();
    const hits: SearchHit[] = [];
    for (const s of sessions) {
      const titleMatch = (s.title || '').toLowerCase().includes(q);
      const previewMatch = (s.preview || '').toLowerCase().includes(q);
      let msgMatch: string | null = null;
      if (Array.isArray(s.messages)) {
        for (const m of s.messages) {
          if (typeof m.content === 'string' && m.content.toLowerCase().includes(q)) {
            msgMatch = m.content;
            break;
          }
        }
      }
      if (titleMatch || previewMatch || msgMatch) {
        hits.push({
          id: `chat-${s.id}`,
          kind: 'chat',
          title: s.title || 'Untitled chat',
          snippet: (msgMatch || s.preview || '').slice(0, 120),
          navigateTo: 'chat',
          meta: 'Chat history',
        });
      }
      if (hits.length >= 6) break;
    }
    return hits;
  } catch {
    return [];
  }
}

function searchPages(query: string): SearchHit[] {
  const q = query.toLowerCase();
  const pages: Array<{ title: string; tab: SearchTab; meta: string; keywords: string[] }> = [
    { title: 'Chat', tab: 'chat', meta: 'AI assistant + team chats', keywords: ['ai', 'chat', 'assistant', 'message'] },
    { title: 'Finance Dashboard', tab: 'finance', meta: 'KPIs, forecasts, scenario simulator', keywords: ['finance', 'money', 'revenue', 'expense', 'profit', 'budget', 'cash', 'forecast'] },
    { title: 'News', tab: 'news', meta: 'Live financial headlines', keywords: ['news', 'headlines', 'feed', 'rss'] },
    { title: 'Team Chat', tab: 'team', meta: 'Team collaboration', keywords: ['team', 'members', 'collaboration', 'invite'] },
    { title: 'Profile', tab: 'profile', meta: 'Business profile + settings', keywords: ['profile', 'settings', 'business', 'company', 'preferences'] },
    { title: 'Admin', tab: 'admin', meta: 'Admin panel', keywords: ['admin', 'users', 'panel', 'management'] },
  ];
  return pages
    .filter(p => p.title.toLowerCase().includes(q) || p.keywords.some(k => k.includes(q) || q.includes(k)))
    .map(p => ({
      id: `page-${p.tab}`,
      kind: 'page' as const,
      title: p.title,
      snippet: p.meta,
      navigateTo: p.tab,
      meta: 'Page',
    }));
}

async function searchNews(query: string): Promise<SearchHit[]> {
  try {
    const items = await fetchNews(false);
    const q = query.toLowerCase();
    const matched = items
      .filter((n: NewsItem) =>
        n.title.toLowerCase().includes(q) || (n.summary || '').toLowerCase().includes(q)
      )
      .slice(0, 5);
    return matched.map(n => ({
      id: `news-${n.id}`,
      kind: 'news' as const,
      title: n.title,
      snippet: n.summary || '',
      navigateTo: 'news' as SearchTab,
      href: n.link,
      meta: n.source,
    }));
  } catch {
    return [];
  }
}

export async function runSearch(query: string): Promise<SearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const [pageHits, chatHits, newsHits] = await Promise.all([
    Promise.resolve(searchPages(trimmed)),
    Promise.resolve(searchChats(trimmed)),
    searchNews(trimmed),
  ]);

  return [...pageHits, ...chatHits, ...newsHits].slice(0, 20);
}
