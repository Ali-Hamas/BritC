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
  BBC:         'bg-red-50 text-red-700 border-red-100',
  FT:          'bg-orange-50 text-orange-700 border-orange-100',
  Reuters:     'bg-blue-50 text-blue-700 border-blue-100',
  Guardian:    'bg-emerald-50 text-emerald-700 border-emerald-100',
  Sky:         'bg-sky-50 text-sky-700 border-sky-100',
  CNBC:        'bg-blue-50 text-blue-800 border-blue-200',
  Yahoo:       'bg-violet-50 text-violet-700 border-violet-100',
  MarketWatch: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
  Investing:   'bg-orange-50 text-orange-800 border-orange-200',
  Telegraph:   'bg-blue-50 text-blue-900 border-blue-200',
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
      const data = await fetchNews(isRefresh);
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto bg-slate-50 min-h-full font-sans text-slate-900">
      <header className="mb-6 sm:mb-8 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
              <Newspaper className="text-blue-600" size={24} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Market Intelligence
            </h1>
          </div>
          <p className="text-slate-500 font-medium text-sm sm:text-base">
            Live headlines from global financial hubs.
            {loadedAt && (
              <span className="text-slate-400"> Updated {relativeTime(new Date(loadedAt).toISOString())}.</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all hover:bg-slate-50 shadow-sm active:scale-95"
        >
          {refreshing ? (
            <Loader2 className="animate-spin text-blue-600" size={14} />
          ) : (
            <RefreshCw size={14} className="text-blue-600" />
          )}
          Refresh
        </button>
      </header>

      {sources.length > 0 && (
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm active:scale-95 ${
              filter === 'all'
                ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            All Sources
          </button>
          {sources.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm active:scale-95 ${
                filter === s
                  ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/20'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-[24px] bg-white border border-slate-100 animate-pulse shadow-sm"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-start gap-4 px-6 py-6 rounded-[24px] bg-red-50 border border-red-100 text-red-700 shadow-sm">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm font-bold leading-relaxed">{error}</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-white border border-slate-200 rounded-[32px] shadow-sm">
          <Newspaper size={48} className="mx-auto mb-4 text-slate-200" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No active signals.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-5 sm:p-6 rounded-[24px] bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                        SOURCE_BADGE[item.source] ||
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                    >
                      {item.source}
                    </span>
                    {item.pubDate && (
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                        {relativeTime(item.pubDate)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors tracking-tight">
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="text-xs sm:text-sm text-slate-500 mt-2.5 leading-relaxed line-clamp-2 font-medium">
                      {item.summary}
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:border-blue-100 transition-all shrink-0 mt-1">
                  <ExternalLink
                    size={16}
                    className="text-slate-400 group-hover:text-blue-600 transition-colors"
                  />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
