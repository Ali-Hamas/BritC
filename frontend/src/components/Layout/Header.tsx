import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  User, Bell, Search, Menu, X, Loader2, MessageSquare, Newspaper,
  PoundSterling, Settings, ExternalLink, Check, Trash2,
} from 'lucide-react';
import { BusinessProfile } from '../../lib/profiles';
import { runSearch, type SearchHit } from '../../lib/globalSearch';
import {
  getAllNotifications, getUnreadCount, markRead, markAllRead, isRead,
  type AppNotification,
} from '../../lib/notifications';

interface HeaderProps {
  profile: BusinessProfile | null;
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
  onTabChange?: (tab: string) => void;
}

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

const KIND_ICON: Record<SearchHit['kind'], React.ComponentType<{ size?: number; className?: string }>> = {
  chat: MessageSquare,
  news: Newspaper,
  page: Settings,
};

const NOTIF_ICON: Record<AppNotification['kind'], React.ComponentType<{ size?: number; className?: string }>> = {
  news: Newspaper,
  finance: PoundSterling,
  system: Bell,
};

const Header: React.FC<HeaderProps> = ({ profile, onMenuClick, isMenuOpen, onTabChange }) => {
  // ─── Search ────────────────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ─── Notifications ─────────────────────────────────────────────────────────
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [, forceTick] = useState(0); // to re-render when read state changes
  const bellRef = useRef<HTMLDivElement>(null);

  const unread = useMemo(() => getUnreadCount(notifs), [notifs]);

  // Outside-click: bell
  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  // Cmd/Ctrl+K opens search; Escape closes overlays
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 30);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setBellOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchOpen) return;
    const trimmed = query.trim();
    if (!trimmed) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const hits = await runSearch(trimmed);
        setResults(hits);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query, searchOpen]);

  // Load notifications on mount + when bell opens + every 5 min
  const loadNotifs = async () => {
    setNotifLoading(true);
    try {
      const list = await getAllNotifications();
      setNotifs(list);
    } finally {
      setNotifLoading(false);
    }
  };
  useEffect(() => {
    loadNotifs();
    const t = setInterval(loadNotifs, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (bellOpen) loadNotifs(); }, [bellOpen]);

  const onSelectHit = (hit: SearchHit) => {
    if (hit.href) {
      window.open(hit.href, '_blank', 'noopener,noreferrer');
    }
    if (hit.navigateTo && onTabChange) {
      onTabChange(hit.navigateTo);
    }
    setSearchOpen(false);
    setQuery('');
  };

  const onSelectNotif = (n: AppNotification) => {
    markRead(n.id);
    forceTick(v => v + 1);
    if (n.href) {
      window.open(n.href, '_blank', 'noopener,noreferrer');
    }
    if (n.navigateTo && onTabChange) {
      onTabChange(n.navigateTo);
    }
    setBellOpen(false);
  };

  const onMarkAllRead = () => {
    markAllRead(notifs.map(n => n.id));
    forceTick(v => v + 1);
  };

  return (
    <>
      <header className="h-14 sm:h-16 md:h-20 border-b border-white/5 bg-[#020617]/70 backdrop-blur-xl px-2 sm:px-3 md:px-8 flex items-center justify-between gap-2 sticky top-0 z-40">
        {/* Mobile menu */}
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="md:hidden shrink-0 p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Search trigger */}
        <div className="flex-1 min-w-0 flex items-center justify-center md:justify-start">
          <button
            type="button"
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 30);
            }}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
            aria-label="Open search"
          >
            <Search size={20} />
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 30);
            }}
            className="hidden md:flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-xl border border-white/5 hover:border-white/15 hover:bg-slate-900/70 transition-colors w-full max-w-md text-left"
          >
            <Search size={18} className="text-slate-500 shrink-0" />
            <span className="flex-1 text-sm text-slate-500 truncate">Search Britsync…</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-bold bg-white/5 px-1.5 py-0.5 rounded border border-white/10 shrink-0">
              <span>⌘</span>
              <span>K</span>
            </span>
          </button>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
          {/* Bell */}
          <div ref={bellRef} className="relative">
            <button
              type="button"
              onClick={() => setBellOpen(v => !v)}
              aria-label="Notifications"
              aria-expanded={bellOpen}
              className="relative text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
            >
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-lg shadow-rose-500/40">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {bellOpen && (
              <>
                {/* Mobile backdrop */}
                <div
                  className="sm:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                  onClick={() => setBellOpen(false)}
                />
                <div className="fixed sm:absolute top-14 sm:top-auto sm:right-0 left-2 right-2 sm:left-auto sm:mt-2 sm:w-96 sm:max-w-md rounded-2xl bg-[#0a0b14] border border-white/10 shadow-2xl shadow-black/50 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[calc(100vh-5rem)] sm:max-h-none">
                  <div className="px-3 sm:px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2 shrink-0">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white">Notifications</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {unread > 0 ? `${unread} unread` : 'All caught up'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {unread > 0 && (
                        <button
                          type="button"
                          onClick={onMarkAllRead}
                          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
                          title="Mark all read"
                        >
                          <Check size={12} /> <span className="hidden xs:inline sm:inline">Mark all</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setBellOpen(false)}
                        className="text-slate-500 hover:text-white p-1.5 rounded"
                        aria-label="Close"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                <div className="flex-1 overflow-y-auto sm:max-h-[60vh]">
                  {notifLoading && notifs.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                      <Loader2 className="mx-auto mb-3 animate-spin text-slate-500" size={20} />
                      <p className="text-xs text-slate-500">Loading…</p>
                    </div>
                  ) : notifs.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto mb-3">
                        <Bell size={20} className="text-slate-500" />
                      </div>
                      <p className="text-sm font-bold text-slate-300">You're all caught up</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Headlines, finance alerts, and team activity will appear here.
                      </p>
                    </div>
                  ) : (
                    <ul className="py-1">
                      {notifs.map(n => {
                        const Icon = NOTIF_ICON[n.kind];
                        const read = isRead(n.id);
                        return (
                          <li key={n.id}>
                            <button
                              type="button"
                              onClick={() => onSelectNotif(n)}
                              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-white/[0.03] last:border-0 ${
                                read ? 'hover:bg-white/[0.02]' : 'bg-indigo-500/[0.04] hover:bg-indigo-500/[0.08]'
                              }`}
                            >
                              <div className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center mt-0.5 ${
                                n.kind === 'news' ? 'bg-sky-500/10 border-sky-500/20 text-sky-300' :
                                n.kind === 'finance' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
                                'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                              }`}>
                                <Icon size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {!read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
                                  <p className={`text-xs font-bold truncate ${read ? 'text-slate-400' : 'text-white'}`}>
                                    {n.title}
                                  </p>
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                                  {n.body}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-600">
                                  {n.meta && (
                                    <span className="font-bold uppercase tracking-wider">{n.meta}</span>
                                  )}
                                  {n.meta && <span>·</span>}
                                  <span>{relativeTime(n.time)}</span>
                                  {n.href && <ExternalLink size={10} className="ml-auto" />}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                </div>
              </>
            )}
          </div>

          <div className="hidden sm:block h-6 md:h-8 w-px bg-white/5" />

          {/* Profile */}
          <button
            type="button"
            onClick={() => onTabChange?.('profile')}
            className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 rounded-xl hover:bg-white/5 transition-colors py-1 pr-1 sm:pr-2"
            aria-label="Profile"
          >
            <div className="text-right hidden md:block max-w-[160px]">
              <p className="text-sm font-semibold text-white tracking-tight truncate">
                {profile?.businessName || 'Guest'}
              </p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">
                {profile?.industry || 'Setup Required'}
              </p>
            </div>
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center p-[1px] shadow-lg shadow-indigo-500/20 shrink-0">
              <div className="h-full w-full rounded-[10px] bg-[#020617] flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-12 sm:pt-24 px-3 sm:px-6"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-[#0a0b14] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0">
              <Search size={18} className="text-slate-500 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chats, news, and pages…"
                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500 min-w-0"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-slate-500 hover:text-white p-1 rounded shrink-0"
                  aria-label="Clear"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-slate-500 hover:text-white p-1 rounded shrink-0"
                aria-label="Close search"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {!query.trim() ? (
                <div className="px-4 py-8 text-center">
                  <Search size={28} className="mx-auto mb-3 text-slate-600" />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Type to search across your chats, news headlines, and Britsync pages.
                  </p>
                </div>
              ) : searching ? (
                <div className="px-4 py-8 text-center">
                  <Loader2 size={20} className="mx-auto mb-3 animate-spin text-slate-500" />
                  <p className="text-xs text-slate-500">Searching…</p>
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm font-bold text-slate-300">No matches</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try different keywords. Search covers chat history, news, and pages.
                  </p>
                </div>
              ) : (
                <ul className="py-1">
                  {results.map(hit => {
                    const Icon = KIND_ICON[hit.kind];
                    return (
                      <li key={hit.id}>
                        <button
                          type="button"
                          onClick={() => onSelectHit(hit)}
                          className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0"
                        >
                          <div className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center mt-0.5 ${
                            hit.kind === 'news' ? 'bg-sky-500/10 border-sky-500/20 text-sky-300' :
                            hit.kind === 'chat' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' :
                            'bg-slate-500/10 border-slate-500/20 text-slate-300'
                          }`}>
                            <Icon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{hit.title}</p>
                            {hit.snippet && (
                              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                                {hit.snippet}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-600">
                              {hit.meta && (
                                <span className="font-bold uppercase tracking-wider">{hit.meta}</span>
                              )}
                              {hit.href && <ExternalLink size={10} className="ml-auto" />}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="px-4 py-2 border-t border-white/5 text-[10px] text-slate-600 font-bold uppercase tracking-widest flex items-center justify-between shrink-0">
              <span>{results.length > 0 ? `${results.length} results` : 'Live search'}</span>
              <span className="hidden sm:inline">Esc to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
