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
      <header className="h-14 sm:h-16 md:h-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl px-2 sm:px-3 md:px-8 flex items-center justify-between gap-2 sticky top-0 z-40 shadow-sm">
        {/* Mobile menu */}
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="md:hidden shrink-0 p-2 rounded-lg hover:bg-slate-100 text-slate-900 transition-colors"
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
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
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
            className="hidden md:flex items-center gap-3 bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-white transition-all w-full max-w-md text-left shadow-sm group"
          >
            <Search size={18} className="text-slate-400 group-hover:text-blue-500 shrink-0" />
            <span className="flex-1 text-sm text-slate-600 group-hover:text-slate-900 truncate font-medium">Search Britsync…</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
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
              className="relative text-slate-600 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50"
            >
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center shadow-lg shadow-red-500/40">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {bellOpen && (
              <>
                {/* Mobile backdrop */}
                <div
                  className="sm:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
                  onClick={() => setBellOpen(false)}
                />
                <div className="fixed sm:absolute top-14 sm:top-auto sm:right-0 left-2 right-2 sm:left-auto sm:mt-2 sm:w-96 sm:max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[calc(100vh-5rem)] sm:max-h-none">
                  <div className="px-3 sm:px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2 shrink-0">
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-slate-900">Notifications</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                        {unread > 0 ? `${unread} unread` : 'All caught up'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {unread > 0 && (
                        <button
                          type="button"
                          onClick={onMarkAllRead}
                          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap"
                          title="Mark all read"
                        >
                          <Check size={12} /> <span className="hidden xs:inline sm:inline">Mark all</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setBellOpen(false)}
                        className="text-slate-400 hover:text-slate-900 p-1.5 rounded transition-colors"
                        aria-label="Close"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                <div className="flex-1 overflow-y-auto sm:max-h-[60vh] bg-white">
                  {notifLoading && notifs.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                      <Loader2 className="mx-auto mb-3 animate-spin text-blue-500" size={20} />
                      <p className="text-xs text-slate-500 font-medium">Loading notifications…</p>
                    </div>
                  ) : notifs.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                        <Bell size={20} className="text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-900">You're all caught up</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Headlines, finance alerts, and team activity will appear here.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-50">
                      {notifs.map(n => {
                        const Icon = NOTIF_ICON[n.kind];
                        const read = isRead(n.id);
                        return (
                          <li key={n.id}>
                            <button
                              type="button"
                              onClick={() => onSelectNotif(n)}
                              className={`w-full flex items-start gap-3 px-4 py-4 text-left transition-all ${
                                read ? 'hover:bg-slate-50' : 'bg-blue-50/40 hover:bg-blue-50'
                              }`}
                            >
                              <div className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center mt-0.5 shadow-sm ${
                                n.kind === 'news' ? 'bg-blue-100 border-blue-200 text-blue-600' :
                                n.kind === 'finance' ? 'bg-orange-100 border-orange-200 text-orange-600' :
                                'bg-red-100 border-red-200 text-red-600'
                              }`}>
                                <Icon size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {!read && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 shadow-sm" />}
                                  <p className={`text-[13px] font-bold truncate ${read ? 'text-slate-600' : 'text-slate-900'}`}>
                                    {n.title}
                                  </p>
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed font-medium">
                                  {n.body}
                                </p>
                                <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                  {n.meta && (
                                    <span className="text-slate-500">{n.meta}</span>
                                  )}
                                  {n.meta && <span>·</span>}
                                  <span>{relativeTime(n.time)}</span>
                                  {n.href && <ExternalLink size={10} className="ml-auto opacity-50" />}
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

          <div className="hidden sm:block h-8 w-px bg-slate-200" />

          {/* Profile */}
          <button
            type="button"
            onClick={() => onTabChange?.('profile')}
            className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 rounded-xl hover:bg-slate-100 transition-all py-1.5 pr-1.5 sm:pr-2.5 group"
            aria-label="Profile"
          >
            <div className="text-right hidden md:block max-w-[160px]">
              <p className="text-sm font-black text-slate-900 tracking-tight truncate group-hover:text-blue-600 transition-colors">
                {profile?.businessName || 'Guest User'}
              </p>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest truncate mt-0.5">
                {profile?.industry || 'Setup Required'}
              </p>
            </div>
            <div className="h-9 w-9 md:h-11 md:w-11 rounded-xl bg-gradient-to-br from-blue-600 via-red-500 to-orange-500 flex items-center justify-center p-[1.5px] shadow-lg shadow-blue-500/10 group-hover:scale-105 transition-transform shrink-0">
              <div className="h-full w-full rounded-[9px] bg-white flex items-center justify-center">
                <User size={18} className="text-slate-900" />
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/20 backdrop-blur-md flex items-start justify-center pt-12 sm:pt-24 px-3 sm:px-6"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
              <Search size={20} className="text-blue-500 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chats, news, and pages…"
                className="flex-1 bg-transparent border-none outline-none text-base text-slate-900 placeholder:text-slate-400 font-medium min-w-0"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-white transition-all shrink-0"
                  aria-label="Clear"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-white transition-all shrink-0"
                aria-label="Close search"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white">
              {!query.trim() ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center mx-auto mb-4 border border-blue-100/50">
                    <Search size={32} className="text-blue-500" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">Global Neural Search</p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-[280px] mx-auto font-medium">
                    Instant access to your chats, industry headlines, and Britsync operational pages.
                  </p>
                </div>
              ) : searching ? (
                <div className="px-6 py-12 text-center">
                  <Loader2 className="mx-auto mb-4 animate-spin text-blue-500" size={24} />
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Searching Knowledge Base…</p>
                </div>
              ) : results.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <X size={32} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">No results found</p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    Try different keywords or check your spelling.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {results.map(hit => {
                    const Icon = KIND_ICON[hit.kind];
                    return (
                      <li key={hit.id}>
                        <button
                          type="button"
                          onClick={() => onSelectHit(hit)}
                          className="w-full flex items-start gap-4 px-6 py-4 text-left hover:bg-slate-50 transition-all group"
                        >
                          <div className={`shrink-0 w-11 h-11 rounded-2xl border flex items-center justify-center mt-0.5 shadow-sm group-hover:scale-105 transition-transform ${
                            hit.kind === 'news' ? 'bg-orange-50 border-orange-100 text-orange-600' :
                            hit.kind === 'chat' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                            'bg-red-50 border-red-100 text-red-600'
                          }`}>
                            <Icon size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-black text-slate-900 truncate group-hover:text-blue-600 transition-colors">{hit.title}</p>
                            {hit.snippet && (
                              <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed font-medium">
                                {hit.snippet}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {hit.meta && (
                                <span className="text-slate-500">{hit.meta}</span>
                              )}
                              {hit.href && <ExternalLink size={10} className="ml-auto opacity-40 group-hover:opacity-100 group-hover:text-blue-500" />}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center justify-between shrink-0">
              <span>{results.length > 0 ? `${results.length} matches found` : 'Deep Search Active'}</span>
              <span className="hidden sm:inline bg-white px-2 py-0.5 rounded border border-slate-200">Esc to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
