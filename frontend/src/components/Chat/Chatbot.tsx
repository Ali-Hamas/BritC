import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Bot, Loader2, User, Copy,
  FileText, Mail,
  Search, ExternalLink, ChevronRight,
  Paperclip, Image, File, X, Plus, MessageSquare,
  Clock, ChevronLeft, Trash2, Share2, Users, Lock, ChevronDown, Zap, Menu
} from 'lucide-react';
import { AIService } from '../../lib/ai';
import { parseAction, executeAction } from '../../lib/agent';
import type { ActionResult } from '../../lib/agent';
import { FileHandlingService } from '../../lib/fileHandling';
import type { FileAttachment } from '../../lib/fileHandling';
import { ChatHistoryService } from '../../lib/chatHistory';
import { motion, AnimatePresence } from 'framer-motion';
import { TeamService } from '../../lib/team';
import { ActivityService } from '../../lib/activity';
import { PinEntryModal } from './PinEntryModal';
import { getApiUrl } from '../../lib/api-config';
import type { BusinessProfile } from '../../lib/profiles';
import { GrowthService } from '../../lib/growth';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  attachments?: FileAttachment[];
  actionResult?: ActionResult;
  isActionRunning?: boolean;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  preview: string;
  createdAt: Date;
  messages: Message[];
  isTeam?: boolean;
  pin?: string;
}

// ─── Chat Modes (Kimi-style mode selector) ────────────────────────────────────

type ChatMode = 'default' | 'web' | 'team' | 'draft' | 'email';

interface ModeOption {
  id: ChatMode;
  label: string;
  description: string;
  icon: typeof Search;
  prefix: string;
}

const CHAT_MODES: ModeOption[] = [
  { id: 'default', label: 'Standard', description: 'Quick AI response', icon: Bot, prefix: '' },
  { id: 'web',     label: 'Web Research', description: 'Search the web for current info', icon: Search, prefix: 'Research the web and find current information about: ' },
  { id: 'team',    label: 'Team Collab', description: 'Brainstorm with your team', icon: Users, prefix: 'Help our team collaborate on: ' },
  { id: 'draft',   label: 'Draft Content', description: 'Generate articles, posts, copy', icon: FileText, prefix: 'Draft content for: ' },
  { id: 'email',   label: 'Email Draft', description: 'Write a professional email', icon: Mail, prefix: 'Write a professional email for: ' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uniquifyMessages = (msgs: Message[]): Message[] => {
  const seen = new Set<string>();
  return msgs.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
};

const generateTitle = (firstUserMessage: string): string => {
  const cleaned = firstUserMessage.replace(/\n.*/, '').trim();
  return cleaned.length > 40 ? cleaned.slice(0, 40) + '...' : cleaned;
};

const SESSIONS_KEY = 'britc_chat_sessions';
const ACTIVE_SESSION_KEY = 'britc_active_session';

// Limits for localStorage to avoid QuotaExceededError
const MAX_LOCAL_SESSIONS = 15; // Reduced from 50
const MAX_MSG_CONTENT_LOCAL = 50000; // Truncate only extreme messages — AI code responses can be ~10-20KB
const MAX_ATTACHMENT_SIZE_LOCAL = 500; // Truncate large attachment text in local storage
const MAX_MESSAGES_PER_SESSION = 25; // Limit messages per session in local storage

/**
 * Sanitizes sessions for local storage by removing/truncating large data
 * (like full file content or base64 images) that quickly fill up the 5MB quota.
 */
const sanitizeSessions = (sessions: ChatSession[]): ChatSession[] => {
  // 1. Limit total number of sessions
  const limitedSessions = sessions.slice(0, MAX_LOCAL_SESSIONS);

  return limitedSessions.map(session => {
    // 2. Limit number of messages per session to keep fresh history only
    const limitedMessages = session.messages.slice(-MAX_MESSAGES_PER_SESSION);

    return {
      ...session,
      messages: limitedMessages.map(msg => {
        const sanitized = { ...msg };
        
        // 3. Truncate extremely long message content
        if (sanitized.content && sanitized.content.length > MAX_MSG_CONTENT_LOCAL) {
          sanitized.content = sanitized.content.substring(0, MAX_MSG_CONTENT_LOCAL) + '... [truncated]';
        }

        // 4. Strip large attachment data and ALWAYS remove base64 previews from local storage
        if (sanitized.attachments) {
          sanitized.attachments = sanitized.attachments.map(attr => ({
            ...attr,
            content: (attr.content && attr.content.length > MAX_ATTACHMENT_SIZE_LOCAL) 
              ? attr.content.substring(0, MAX_ATTACHMENT_SIZE_LOCAL) + '... [truncated]' 
              : attr.content,
            previewUrl: undefined // CRITICAL: previewUrl usually contains huge base64 strings
          }));
        }

        // 5. Remove large result data like screenshots from browser tools
        if (sanitized.actionResult && sanitized.actionResult.data) {
          const newData = { ...sanitized.actionResult.data };
          if (newData.screenshot) delete newData.screenshot; // screenshots are huge
          sanitized.actionResult = { ...sanitized.actionResult, data: newData };
        }

        return sanitized;
      })
    };
  });
};

const loadSessions = (): ChatSession[] => {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((s: any) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
    }));
  } catch { return []; }
};

const saveSessions = (sessions: ChatSession[]) => {
  try {
    const sanitized = sanitizeSessions(sessions);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sanitized));
  } catch (err: any) {
    if (err.name === 'QuotaExceededError' || err.message?.toLowerCase().includes('quota')) {
      console.warn('BritC: LocalStorage quota exceeded. Emergency pruning...');
      
      // If we failed after sanitization, we're still too big. 
      // Try clearing half the sessions and retrying.
      if (sessions.length > 2) {
        const emergencyPruned = sessions.slice(0, Math.floor(sessions.length / 2));
        saveSessions(emergencyPruned);
      } else if (sessions.length > 1) {
        saveSessions([sessions[0]]);
      } else {
        console.error('BritC: Storage full even with 1 session. Clearing all to recover.');
        localStorage.removeItem(SESSIONS_KEY);
      }
    } else {
      console.error('BritC: Failed to save sessions:', err);
    }
  }
};

// ─── History Sidebar ──────────────────────────────────────────────────────────

const HistorySidebar = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  collapsed,
  onToggle,
  backendStatus,
  onJoinTeamChat,
  isMobile,
  onCloseMobile,
}: {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  backendStatus: 'online' | 'offline' | 'checking';
  onJoinTeamChat: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}) => {
  const [showTeamOptions, setShowTeamOptions] = useState(false);
  const groupedSessions = () => {
    const today: ChatSession[] = [];
    const yesterday: ChatSession[] = [];
    const older: ChatSession[] = [];
    const now = new Date();
    sessions.forEach(s => {
      const diff = (now.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (diff < 1) today.push(s);
      else if (diff < 2) yesterday.push(s);
      else older.push(s);
    });
    return { today, yesterday, older };
  };

  const groups = groupedSessions();

  const SessionGroup = ({ label, items }: { label: string; items: ChatSession[] }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-3">
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-1">{label}</p>
        {items.map(s => (
          <div
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={`group flex items-start gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 mb-1 ${
              s.id === activeSessionId
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <MessageSquare size={13} className="mt-0.5 flex-shrink-0 opacity-60" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-xs font-medium truncate">{s.title || 'New Chat'}</p>
                {s.isTeam && (
                  <div className="flex items-center gap-1">
                    <span className="flex items-center gap-0.5 px-1 py-0.25 rounded-[4px] bg-indigo-500/20 text-indigo-400 text-[8px] font-bold uppercase tracking-wider border border-indigo-500/20">
                      <Users size={8} />
                      Team
                    </span>
                    {s.pin && (
                      <span className="font-mono text-[8px] text-white/50 bg-white/5 px-1 rounded border border-white/10" title="Team PIN">
                        #{s.pin}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-white/40 truncate">{s.preview}</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onDeleteSession(s.id); }}
              title="Delete chat"
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all flex-shrink-0"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  // Mobile view when sidebar is opened from hamburger menu
  if (isMobile) {
    return (
      <div className="fixed inset-y-0 left-0 w-72 md:w-80 bg-[#030712] border-r border-white/5 flex flex-col z-50 transform transition-transform duration-300 shadow-2xl">
        <div className="flex items-center justify-between px-3 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-indigo-400" />
            <span className="text-base font-semibold text-white">History</span>
          </div>
          <button onClick={onCloseMobile} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>
        
        <div className="px-3 py-3 space-y-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all text-sm font-medium"
          >
            <Plus size={16} />
            New Chat
          </button>
          
          <button
            onClick={onJoinTeamChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all text-sm font-medium"
          >
            <Users size={16} />
            Join Team
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
          {sessions.length === 0 ? (
            <div className="text-center text-white/20 text-xs px-4 py-8">
              <Clock size={24} className="mx-auto mb-2 opacity-40" />
              No chats yet
            </div>
          ) : (
            <>
              <SessionGroup label="Today" items={groups.today} />
              <SessionGroup label="Yesterday" items={groups.yesterday} />
              <SessionGroup label="Previous" items={groups.older} />
            </>
          )}
        </div>
      </div>
    );
  }
  
  // Collapsed view for desktop
  if (collapsed) {
    return (
      <div className="hidden md:flex w-10 lg:w-12 flex-col items-center py-3 lg:py-4 gap-2 lg:gap-3 border-r border-white/5 bg-black/10">
        <button onClick={onToggle} className="p-1.5 md:p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-all" title="Expand history">
          <ChevronRight size={16} />
        </button>
        <button onClick={onNewChat} className="p-1.5 md:p-2 rounded-lg hover:bg-indigo-500/20 text-indigo-400 transition-all" title="New chat">
          <Plus size={16} />
        </button>
        {sessions.slice(0, 4).map(s => (
          <button
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={`p-1.5 md:p-2 rounded-lg transition-all ${s.id === activeSessionId ? 'bg-white/15 text-white' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}
            title={s.title}
          >
            <MessageSquare size={14} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="hidden md:flex w-48 lg:w-60 flex-col border-r border-white/5 bg-black/20">
      {/* Header */}
      <div className="flex items-center justify-between px-2 md:px-3 py-2 md:py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-indigo-400" />
          <div className="flex flex-col">
            <span className="text-xs md:text-sm font-semibold text-white">Britsync AI</span>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${
                backendStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 
                backendStatus === 'offline' ? 'bg-rose-500' : 'bg-amber-500'
              }`} />
              <span className="text-[9px] md:text-[10px] text-white/40 font-medium lowercase truncate">
                {backendStatus === 'online' ? 'Ready' : backendStatus === 'offline' ? 'Offline' : 'Syncing...'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onToggle} className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-all">
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Actions */}
      <div className="px-2 md:px-3 py-2 space-y-1.5 md:space-y-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-2 md:px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all text-xs md:text-sm font-medium"
        >
          <Plus size={14} />
          <span className="hidden md:inline">New Chat</span>
          <span className="md:hidden">New</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowTeamOptions(!showTeamOptions)}
            className={`w-full flex items-center justify-between px-2 md:px-3 py-2 rounded-xl transition-all text-xs md:text-sm font-medium ${
              showTeamOptions 
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                : 'bg-white/5 border border-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={14} />
              Team
            </div>
            <ChevronDown size={12} className={`transition-transform duration-200 ${showTeamOptions ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showTeamOptions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 w-full mt-1 p-1 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
              >
                <button
                  onClick={() => { onJoinTeamChat(); setShowTeamOptions(false); }}
                  className="w-full flex items-center gap-2 px-2 md:px-3 py-2 rounded-lg text-xs text-white/70 hover:bg-white/5 hover:text-white transition-all text-left"
                >
                  <Lock size={12} className="text-indigo-400" />
                  Join Team with PIN
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-1 py-1 scrollbar-thin">
        {sessions.length === 0 ? (
          <div className="text-center text-white/20 text-[10px] md:text-xs px-2 md:px-4 py-4 md:py-6">
            <Clock size={20} className="mx-auto mb-2 opacity-40" />
            No chats yet
          </div>
        ) : (
          <>
            <SessionGroup label="Today" items={groups.today} />
            <SessionGroup label="Yesterday" items={groups.yesterday} />
            <SessionGroup label="Previous" items={groups.older} />
          </>
        )}
      </div>
    </div>
  );
};

// ─── Browser Result Renderer ──────────────────────────────────────────────────

const BrowserResultCard = ({ data }: { data: Record<string, any>; type?: string }) => {
  const [showScreenshot, setShowScreenshot] = useState(false);
  const results: any[] = data?.results || [];
  const screenshot: string | undefined = data?.screenshot;

  return (
    <div className="mt-2 space-y-2">
      {/* Screenshot toggle */}
      {screenshot && (
        <div className="space-y-1">
          <button
            onClick={() => setShowScreenshot(!showScreenshot)}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ExternalLink size={11} />
            {showScreenshot ? 'Hide screenshot' : 'Show screenshot'}
          </button>
          {showScreenshot && (
            <motion.img
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              src={screenshot}
              alt="Browser screenshot"
              className="w-full rounded-xl border border-white/10 max-h-64 object-cover object-top"
            />
          )}
        </div>
      )}

      {/* Result items */}
      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((item: any, i: number) => (
            <a
              key={i}
              href={item.url || item.href || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl px-3 py-2 transition-all group block"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/90 group-hover:text-white truncate">
                  {item.title || item.name || item.company || 'No title'}
                </p>
                {(item.snippet || item.channel || item.company || item.location) && (
                  <p className="text-[10px] text-white/40 truncate mt-0.5">
                    {item.snippet || [item.company, item.location].filter(Boolean).join(' · ') || item.channel}
                  </p>
                )}
              </div>
              <ExternalLink size={10} className="text-white/20 group-hover:text-indigo-400 flex-shrink-0 mt-0.5 transition-colors" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Action Result Card ────────────────────────────────────────────────────────

const ActionResultCard = ({ result }: { result: ActionResult }) => {
  const [expanded, setExpanded] = useState(false);

  const isBrowserAction = ['browser_search', 'browser_youtube', 'browser_linkedin_jobs', 'browser_open'].includes(result.type as string);

  const statusColor = (result.status as string) === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' :
                      (result.status as string) === 'pending'  ? 'border-yellow-500/30 bg-yellow-500/5' :
                                                     'border-red-500/30 bg-red-500/5';
  const statusDot   = (result.status as string) === 'success' ? 'bg-emerald-400' :
                      (result.status as string) === 'pending'  ? 'bg-yellow-400' :
                                                     'bg-red-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-3 rounded-2xl border p-4 ${statusColor}`}
    >
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusDot} flex-shrink-0`} />
          <span className="font-semibold text-white/90 text-sm">{result.title}</span>
          {isBrowserAction && (
            <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] font-bold rounded-full border border-indigo-400/20 uppercase tracking-wide">
              Browser
            </span>
          )}
        </div>
        <ChevronRight size={14} className={`text-white/40 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>
      <p className="text-white/60 text-xs mt-1 ml-4">{result.summary}</p>

      {/* Auto-expand browser results */}
      {isBrowserAction && result.data && (
        <div className="mt-2 ml-4">
          <BrowserResultCard data={result.data} type={result.type as string} />
        </div>
      )}

      {!isBrowserAction && expanded && result.data && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 ml-4 space-y-2"
        >
          {(result.type as string) === 'lead_search' && Array.isArray(result.data) && result.data.slice(0, 5).map((lead: any, i: number) => (
            <div key={i} className="bg-white/5 rounded-xl px-3 py-2 text-xs">
              <p className="font-medium text-white/90">{lead.name || lead.business_name}</p>
              {lead.address && <p className="text-white/50">{lead.address}</p>}
              {lead.phone && <p className="text-emerald-400">{lead.phone}</p>}
            </div>
          ))}
          {(result.type as string) === 'email_draft' && typeof result.data?.body === 'string' && (
            <div className="bg-white/5 rounded-xl px-3 py-2 text-xs">
              <p className="font-semibold text-white/70 mb-1">Subject: {result.data.subject}</p>
              <p className="text-white/60 whitespace-pre-wrap">{result.data.body}</p>
            </div>
          )}
          {((result.type as string) === 'invoice' || (result.type as string) === 'financial_report') && result.data?.filename && (
            <button className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 text-xs text-indigo-400 hover:bg-white/10 transition-all">
              <ExternalLink size={12} /> Open {result.data.filename}
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};


// ─── Message Bubble ────────────────────────────────────────────────────────────

const MessageBubble = ({ msg }: { msg: Message }) => {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderInline = (text: string, keyPrefix: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`[^`\n]+`|\n)/g);
    return parts.map((part, i) => {
      const k = `${keyPrefix}-${i}`;
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={k} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={k} className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-[10px] md:text-[11px]">{part.slice(1, -1)}</code>;
      if (part === '\n') return <br key={k} />;
      return <span key={k}>{part}</span>;
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const renderContent = (text: string) => {
    const blocks = text.split(/```(\w+)?\n?([\s\S]*?)```/g);
    const out: React.ReactNode[] = [];
    for (let i = 0; i < blocks.length; i++) {
      if (i % 3 === 0) {
        if (blocks[i]) out.push(<span key={`t-${i}`}>{renderInline(blocks[i], `t${i}`)}</span>);
      } else if (i % 3 === 1) {
        const lang = blocks[i] || 'code';
        const code = blocks[i + 1] || '';
        out.push(
          <div key={`c-${i}`} className="my-2 rounded-lg overflow-hidden border border-white/10 bg-black/40">
            <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{lang}</span>
              <button
                onClick={() => copyCode(code)}
                className="text-[10px] text-slate-400 hover:text-white transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-[11px] md:text-xs font-mono text-emerald-300 whitespace-pre">
              <code>{code}</code>
            </pre>
          </div>
        );
        i++;
      }
    }
    return out;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2 md:gap-3 group w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-indigo-500' : 'bg-gradient-to-br from-violet-500 to-indigo-600'}`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>

      {/* Content */}
      <div className={`max-w-[85%] md:max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-0.5 md:gap-1`}>
        <div className={`relative px-3 py-2 md:px-4 md:py-3 rounded-xl md:rounded-2xl text-xs md:text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-500 text-white rounded-tr-sm'
            : 'bg-white/8 border border-white/10 text-white/90 rounded-tl-sm'
        }`}>
          {renderContent(msg.content)}

          {/* Attachments */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {msg.attachments.map(a => (
                <div key={a.id} className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1 text-[10px] md:text-xs">
                  {a.type.startsWith('image/') ? <Image size={11} className="text-blue-300" /> : <File size={11} className="text-orange-300" />}
                  <span className="text-white/70 truncate max-w-[80px] md:max-w-[120px]">{a.name}</span>
                  {a.type.startsWith('image/') && a.previewUrl && (
                    <img src={a.previewUrl} alt={a.name} className="mt-1.5 w-full max-w-[150px] md:max-w-[200px] rounded-lg" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Copy button - always visible on touch devices, hover on desktop */}
          <button
            onClick={handleCopy}
            className={`absolute -top-2 ${isUser ? '-left-6 md:-left-8' : '-right-6 md:-right-8'} opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 md:p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all touch-manipulation`}
          >
            <Copy size={11} />
          </button>
        </div>

        {/* Action Result */}
        {msg.isActionRunning && (
          <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs text-white/50 px-1 md:px-2">
            <Loader2 size={12} className="animate-spin text-indigo-400" />
            <span>Executing...</span>
          </div>
        )}
        {msg.actionResult && <ActionResultCard result={msg.actionResult} />}

        {/* Timestamp */}
        <span className="text-[9px] md:text-[10px] text-white/20 px-1">
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        {copied && <span className="text-[9px] md:text-[10px] text-emerald-400 px-1">Copied!</span>}
      </div>
    </motion.div>
  );
};

// ─── Main Chatbot ─────────────────────────────────────────────────────────────

export const Chatbot = ({ profile }: { profile: BusinessProfile | null; onSignOut?: () => void }) => {
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_SESSION_KEY) || '';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', confirmLabel: 'Delete', onConfirm: () => {} });

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages: Message[] = activeSession?.messages || [];

  const setMessages = (updater: Message[] | ((prev: Message[]) => Message[])) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      const newMsgs = typeof updater === 'function' ? updater(s.messages) : updater;
      const uniqued = uniquifyMessages(newMsgs);
      const firstUser = uniqued.find(m => m.role === 'user');
      return {
        ...s,
        messages: uniqued,
        title: firstUser ? generateTitle(firstUser.content) : s.title,
        preview: uniqued[uniqued.length - 1]?.content?.slice(0, 60) || '',
      };
    }));
  };

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('default');
  const [showModeMenu, setShowModeMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist sessions
  useEffect(() => { saveSessions(sessions); }, [sessions]);
  useEffect(() => { localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId); }, [activeSessionId]);

  // Health check for backend
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(getApiUrl('/health'));
        if (res.ok) setBackendStatus('online');
        else setBackendStatus('offline');
      } catch {
        setBackendStatus('offline');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const createNewSession = useCallback(() => {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSession: ChatSession = {
      id,
      title: 'New Chat',
      preview: '',
      createdAt: new Date(),
      messages: [],
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(id);
    ChatHistoryService.startNewSession(id);
  }, []);

  // Create initial session if none
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    } else if (!activeSessionId || !sessions.find(s => s.id === activeSessionId)) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSessionId, createNewSession, sessions]);

  // Show welcome message for empty active session
  useEffect(() => {
    if (activeSessionId && activeSession && activeSession.messages.length === 0) {
      setMessages([{
        id: 'init_' + activeSessionId,
        role: 'assistant',
        content: activeSession?.isTeam 
          ? `Welcome to your **Team Collaboration Hub**! 👥\n\nThis is a shared session (PIN: **${activeSession.pin}**). Every message you send here is synchronized with your team. How can we work together today?`
          : `Hello! I'm **Britsync AI**. 🚀\n\nI'm here to help you with research, marketing, and business automation. How can I assist you today?`,
        timestamp: new Date(),
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Reset mode when switching sessions
  useEffect(() => {
    setChatMode('default');
    setShowModeMenu(false);
  }, [activeSessionId]);

  const joinTeamChatByPin = async (pin: string) => {
    setIsJoining(true);
    setPinError('');
    try {
      const displayName = window.prompt("Enter your display name for the team:", "Member") || 'Member';
      await TeamService.joinTeamByPin(pin, displayName);
      
      const teamCtx = await TeamService.getMyTeam(TeamService._uid()!);
      const ownerName = teamCtx?.team?.title || 'the owner';
      
      alert(`Joined team — your chats are private, guided by ${ownerName}'s strategy.`);
      setShowPinModal(false);
      createNewSession();
    } catch (err: any) {
      setPinError(err.message || 'Invalid PIN or error joining team.');
    } finally {
      setIsJoining(false);
    }
  };

  const deleteSession = (id: string) => {
    const target = sessions.find(s => s.id === id);
    const title = target?.title || 'this chat';
    setConfirmModal({
      open: true,
      title: `Delete "${title}"?`,
      message: 'This will permanently remove this chat and all of its messages. This action cannot be undone.',
      confirmLabel: 'Delete chat',
      onConfirm: () => {
        setSessions(prev => {
          const remaining = prev.filter(s => s.id !== id);
          if (id === activeSessionId && remaining.length > 0) {
            setActiveSessionId(remaining[0].id);
          } else if (remaining.length === 0) {
            createNewSession();
          }
          return remaining;
        });
        setConfirmModal(c => ({ ...c, open: false }));
      },
    });
  };

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: FileAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const processed = await FileHandlingService.processFile(files[i]);
      newAttachments.push(processed);
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleShareChat = () => {
    if (!activeSessionId) return;
    const shareUrl = `${window.location.origin}/chat/share/${activeSessionId}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Shareable link copied to clipboard!\n\n' + shareUrl);
    
    // Log sharing activity
    const currentUser = TeamService.getCurrentMember();
    if (currentUser) {
      ActivityService.logActivity(currentUser.name, 'Shared Chat', `Generated a shareable link for: ${activeSession?.title || 'New Chat'}`, 'browser');
    }
  };

  const handleSend = async (text?: string) => {
    const rawText = (text || input).trim();
    if (!rawText || isLoading) return;

    const activeMode = CHAT_MODES.find(m => m.id === chatMode);
    const messageText = activeMode && activeMode.prefix
      ? `${activeMode.prefix}${rawText}`
      : rawText;

    let fullContent = messageText;
    if (attachments.length > 0) {
      const fileContext = attachments
        .filter(a => a.content)
        .map(a => `[Attached File: ${a.name}]\n${a.content}`)
        .join('\n\n');
      if (fileContext) fullContent = `${messageText}\n\nContext from files:\n${fileContext}`;
    }

    const userMsg: Message = {
      id: `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: fullContent,
      attachments: attachments.length > 0 ? attachments : undefined,
      timestamp: new Date()
    };

    setMessages(prev => uniquifyMessages([...prev, userMsg]));
    setInput('');
    setAttachments([]);
    setChatMode('default');
    setShowModeMenu(false);
    setIsLoading(true);

    const currentUser = TeamService.getCurrentMember();
    const isOwner = currentUser?.role === 'owner';
    const isTeamMode = !isOwner;
    
    // Save user message to Supabase
    ChatHistoryService.saveMessage({ role: 'user', content: fullContent, attachments: userMsg.attachments });

    const britcId = `b_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // SME Growth Partner: Fetch live pulse and bottlenecks
      const userId = TeamService._uid();
      let businessPulse = "";
      let bottlenecksText = "";
      
      if (userId) {
        businessPulse = await GrowthService.getBusinessPulse(profile, userId);
        const bns = await GrowthService.detectBottlenecks(profile, userId);
        bottlenecksText = bns.map(b => `- [${b.impact.toUpperCase()}] ${b.title}: ${b.description}`).join('\n');
      }

      let response = "";
      const lower = fullContent.toLowerCase();
      // Stricter triggers — must be a clear booking intent, not a stray word like "call".
      // Old broad list hijacked every message that mentioned "call" or "meeting".
      const bookingPhrases = [
        'book a call', 'book a meeting', 'book an appointment', 'book a discovery',
        'schedule a call', 'schedule a meeting', 'schedule an appointment',
        'set up a call', 'set up a meeting',
        'arrange a call', 'arrange a meeting',
        'discovery call', 'discovery meeting',
        'talk to someone', 'talk to a human',
        'speak to someone', 'speak to a human',
        'i want to book', 'i would like to book',
      ];
      
      // Use the backend appointment agent ONLY for clear booking intent.
      const isBookingRequest = bookingPhrases.some(p => lower.includes(p));
      // Don't latch on every "?" — that catches every reply. Continue the booking
      // flow only if the user previously asked to book AND the last assistant message
      // looks like a booking step (asking for date/time/availability).
      const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
      const userEverAskedToBook = messages.some(m => m.role === 'user' && bookingPhrases.some(p => m.content.toLowerCase().includes(p)));
      const alreadyInFlow = userEverAskedToBook && !!lastAssistant && /(\bdate\b|\btime\b|\bavailable\b|\bcalendar\b|\bappointment\b|\bbooking\b)/i.test(lastAssistant.content);

      if (isBookingRequest || alreadyInFlow) {
        try {
          const res = await fetch('/api/bot/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              chatInput: fullContent, 
              sessionId: activeSessionId || 'dashboard-user',
              metadata: { isOwner, isTeamMode, businessPulse, bottlenecks: bottlenecksText }
            })
          });
          
          if (!res.ok) throw new Error('Backend offline');
          
          const data = await res.json();
          response = data.output;
        } catch (err) {
          console.warn('Britsee Backend Offline - Falling back to local brain:', err);
          // Fallback to standard AI if backend is down
          response = await AIService.chat(
            [...messages, userMsg].map((m: any) => ({ role: m.role, content: m.content, attachments: m.attachments })),
            { isOwner, isTeamMode, businessPulse, bottlenecks: bottlenecksText }
          );
        }
      } else {
        // Standard AI Service (Groq) with Vision Support
        response = await AIService.chat(
          [...messages, userMsg].map((m: any) => ({ role: m.role, content: m.content, attachments: m.attachments })),
          { isOwner, isTeamMode, businessPulse, bottlenecks: bottlenecksText }
        );
      }

      const { cleanText, action } = parseAction(response);

      if (action) {
        const britcMsg: Message = {
          id: britcId, role: 'assistant', content: cleanText, timestamp: new Date(), isActionRunning: true,
        };
        setMessages(prev => [...prev, britcMsg]);
        ChatHistoryService.saveMessage({ role: 'assistant', content: cleanText });
        setIsLoading(false);

        try {
          const result = await executeAction(action, profile);
          setMessages(prev => prev.map(m =>
            m.id === britcId ? { ...m, isActionRunning: false, actionResult: result } : m
          ));
        } catch (execErr: any) {
          setMessages(prev => prev.map(m =>
            m.id === britcId ? {
              ...m, isActionRunning: false,
              actionResult: { type: action.type, status: 'error', title: '⚠️ Execution Failed', summary: `Failed: ${execErr.message}` }
            } : m
          ));
        }
      } else {
        const britcMsg: Message = { id: britcId, role: 'assistant', content: cleanText, timestamp: new Date() };
        setMessages(prev => [...prev, britcMsg]);
        ChatHistoryService.saveMessage({ role: 'assistant', content: cleanText });
        setIsLoading(false);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: britcId, role: 'assistant',
        content: `⚠️ Connection error: ${err.message || 'Failed to reach Qwen Cloud'}.\n\nPlease check your API key in **Settings**.`,
        timestamp: new Date(),
      }]);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex h-full w-full bg-[#030712] overflow-hidden relative">
      {/* Mobile Overlay */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}
      
      {/* ─── History Sidebar (Left) ─── */}
        <HistorySidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => { setActiveSessionId(id); setShowMobileSidebar(false); }}
          onNewChat={() => { createNewSession(); setShowMobileSidebar(false); }}
          onDeleteSession={deleteSession}
          collapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          backendStatus={backendStatus}
          onJoinTeamChat={() => { setShowPinModal(true); setShowMobileSidebar(false); }}
          isMobile={showMobileSidebar}
          onCloseMobile={() => setShowMobileSidebar(false)}
        />

      {/* ─── Main Chat Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#030712] h-full">
        {/* Header */}
        <div className="flex flex-col border-b border-white/5 bg-white/[0.02] backdrop-blur-md flex-shrink-0">
          {TeamService.getCachedContext()?.team && (
            <div className="px-3 py-1.5 bg-indigo-500/10 flex items-center justify-center gap-2 border-b border-white/5">
              <Zap size={10} className="text-indigo-400 animate-pulse" />
              <span className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-widest truncate">
                Team Mode: {TeamService.getCachedContext()?.team?.title || 'Owner'}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between px-2 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4">
            <div className="flex items-center gap-2 md:gap-3">
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setShowMobileSidebar(true)}
                className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/60 transition-colors"
              >
                <Menu size={18} />
              </button>
              <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Bot size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-white text-xs md:text-sm truncate max-w-[100px] sm:max-w-[140px] md:max-w-[200px] lg:max-w-none">{activeSession?.title || 'Britsync AI'}</h2>
                <p className="text-[10px] md:text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="truncate">AI Active</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={handleShareChat}
                className="flex items-center gap-1.5 p-2 sm:px-2 md:px-3 sm:py-1.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-xs font-bold"
                title="Share"
              >
                <Share2 size={14} /> <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={createNewSession}
                className="p-2 md:px-3 md:py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all text-xs font-bold"
                title="New Chat"
              >
                <Plus size={14} className="md:mr-1 inline" />
                <span className="hidden md:inline">New</span>
              </button>
              <button
                onClick={() => setConfirmModal({
                  open: true,
                  title: 'Clear this conversation?',
                  message: 'All messages in the current chat will be permanently deleted. This cannot be undone.',
                  confirmLabel: 'Clear messages',
                  onConfirm: () => {
                    setMessages([]);
                    ChatHistoryService.clearMessages();
                    setConfirmModal(c => ({ ...c, open: false }));
                  },
                })}
                className="p-2 rounded-xl hover:bg-rose-500/10 text-white/20 hover:text-rose-400 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 md:px-4 lg:px-6 py-4 md:py-6 lg:py-8 space-y-4 md:space-y-6 scrollbar-thin">
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 md:gap-3">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/10">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-3 md:px-4 py-2 md:py-3 backdrop-blur-sm">
                <div className="flex items-center gap-1 md:gap-1.5">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* (Mode chips removed — replaced by Kimi-style dropdown next to input) */}

        {/* Attachment Preview */}
        {attachments.length > 0 && (
          <div className="px-3 md:px-4 lg:px-6 pb-2 md:pb-3 flex flex-wrap gap-2">
            {attachments.map(a => (
              <div key={a.id} className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-[11px] text-indigo-200">
                {a.type.startsWith('image/') ? <Image size={12} /> : <File size={12} />}
                <span className="truncate max-w-[80px] md:max-w-[100px] lg:max-w-[150px] font-medium">{a.name}</span>
                <button onClick={() => removeAttachment(a.id)} className="ml-1 hover:text-white transition-colors">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div
          className="px-2 md:px-4 lg:px-6 pb-3 md:pb-6 lg:pb-8 flex-shrink-0"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
        >
          <div className="max-w-4xl mx-auto flex items-center gap-1 md:gap-2 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-2 md:px-4 py-2 md:py-3 lg:py-4 focus-within:border-indigo-500/40 focus-within:ring-2 md:focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all backdrop-blur-md shadow-2xl">
            <button
              onClick={handleFileClick}
              className="text-white/30 hover:text-indigo-400 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg"
              title="Attach file"
              aria-label="Attach file"
            >
              <Paperclip size={18} />
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                chatMode === 'default'
                  ? 'Ask Britsync AI...'
                  : `${CHAT_MODES.find(m => m.id === chatMode)?.label}: type your request...`
              }
              className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none px-1 md:px-2 min-w-0 py-2"
            />

            {/* Mode selector (Kimi-style) */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowModeMenu(v => !v)}
                className={`flex items-center gap-1.5 px-2.5 md:px-3 py-2 rounded-lg border text-[11px] md:text-xs font-semibold transition-all whitespace-nowrap ${
                  chatMode === 'default'
                    ? 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                    : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25'
                }`}
                title="Choose chat mode"
              >
                {(() => {
                  const m = CHAT_MODES.find(x => x.id === chatMode)!;
                  const Icon = m.icon;
                  return <Icon size={12} />;
                })()}
                <span className="hidden sm:inline">
                  {CHAT_MODES.find(m => m.id === chatMode)?.label}
                </span>
                <ChevronDown size={12} className={`transition-transform ${showModeMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showModeMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowModeMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 bottom-full mb-2 w-64 bg-[#0b1020] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 p-1"
                    >
                      {CHAT_MODES.map(m => {
                        const Icon = m.icon;
                        const active = m.id === chatMode;
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              setChatMode(m.id);
                              setShowModeMenu(false);
                              inputRef.current?.focus();
                            }}
                            className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                              active
                                ? 'bg-indigo-500/15 text-white'
                                : 'text-white/80 hover:bg-white/5'
                            }`}
                          >
                            <Icon size={14} className={`mt-0.5 flex-shrink-0 ${active ? 'text-indigo-400' : 'text-white/50'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold">{m.label}</span>
                                {active && <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-widest">Active</span>}
                              </div>
                              <p className="text-[10px] text-white/40 mt-0.5 leading-snug">{m.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-lg md:rounded-xl bg-indigo-600 disabled:bg-white/5 flex items-center justify-center text-white disabled:text-white/10 transition-all hover:bg-indigo-500 active:scale-95 shadow-lg shadow-indigo-600/20 disabled:shadow-none flex-shrink-0"
              aria-label="Send message"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,image/*" />
        </div>
      </div>

      <PinEntryModal
        isOpen={showPinModal}
        onClose={() => { setShowPinModal(false); setPinError(''); }}
        onJoin={joinTeamChatByPin}
        isJoining={isJoining}
        error={pinError}
      />

      <AnimatePresence>
        {confirmModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setConfirmModal(c => ({ ...c, open: false }))}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-[#0b1020] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 md:p-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                    <Trash2 size={18} className="text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-bold text-white leading-tight">{confirmModal.title}</h3>
                    <p className="text-xs md:text-sm text-white/60 mt-1.5 leading-relaxed">{confirmModal.message}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-5">
                  <button
                    onClick={() => setConfirmModal(c => ({ ...c, open: false }))}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmModal.onConfirm}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    {confirmModal.confirmLabel}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chatbot;
