import { getApiUrl } from './api-config';

export interface NewsItem {
  id: string;
  source: string;
  title: string;
  link: string;
  pubDate: string;
  summary: string;
}

export async function fetchNews(): Promise<NewsItem[]> {
  const res = await fetch(getApiUrl('/news'));
  if (!res.ok) throw new Error(`Failed to load news (${res.status})`);
  const data = await res.json();
  return Array.isArray(data?.items) ? data.items : [];
}
