import { getApiUrl } from './api-config';

export interface NewsItem {
  id: string;
  source: string;
  title: string;
  link: string;
  pubDate: string;
  summary: string;
}

export async function fetchNews(force = false): Promise<NewsItem[]> {
  const url = getApiUrl('/news') + (force ? '?force=1' : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load news (${res.status})`);
  const data = await res.json();
  return Array.isArray(data?.items) ? data.items : [];
}
