import React, { useEffect, useMemo, useState } from 'react';
import {
  Newspaper,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { fetchNews, type NewsItem } from '../../lib/news';

const SOURCE_BADGE: Record<string, string> = {
  BBC:     'bg-rose-500/10 text-rose-300 border-rose-500/20',
  FT:      'bg-amber-500/10 text-amber-300 border-amber-500/20',
  Reuters: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
};

function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (!t) return '';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export const NewsFeed: React.FC = () => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [loadedAt, setLoadedAt] = useState<number | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await fetchNews();
      setItems(data);
      setLoadedAt(Date.now());
    } catch (e: any) {
      setError(e.message || 'Failed to load news');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sources = useMemo(() => {
    const set = new Set(items.map((i) => i.source));
    return Array.from(set);
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((i) => i.source === filter);
  }, [items, filter]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
      <header className="mb-6 sm:mb-8 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Newspaper className="text-indigo-400" size={20} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Financial News
            </h1>
          </div>
          <p className="text-slate-400 text-sm">
            Live headlines from BBC Business, FT, and Reuters.
            {loadedAt && (
              <span className="text-slate-500"> Updated {relativeTime(new Date(loadedAt).toISOString())}.</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all"
        >
          {refreshing ? (
            <Loader2 className="animate-spin" size={14} />
          ) : (
            <RefreshCw size={14} />
          )}
          Refresh
        </button>
      </header>

      {sources.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-colors ${
              filter === 'all'
                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40'
                : 'bg-white/[0.03] text-slate-400 border-white/10 hover:border-white/20'
            }`}
          >
            All
          </button>
          {sources.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                filter === s
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40'
                  : 'bg-white/[0.03] text-slate-400 border-white/10 hover:border-white/20'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 px-4 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Newspaper size={36} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No headlines available right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        SOURCE_BADGE[item.source] ||
                        'bg-slate-500/10 text-slate-300 border-slate-500/20'
                      }`}
                    >
                      {item.source}
                    </span>
                    {item.pubDate && (
                      <span className="text-[11px] text-slate-500">
                        {relativeTime(item.pubDate)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white leading-snug group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                </div>
                <ExternalLink
                  size={16}
                  className="text-slate-500 group-hover:text-indigo-300 shrink-0 mt-1 transition-colors"
                />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
