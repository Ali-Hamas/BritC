import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Bot, Loader2, User, Copy,
  FileText, Mail,
  Search, ExternalLink, ChevronRight,
  Paperclip, Image, File, X, Plus, MessageSquare,
  Clock, ChevronLeft, Trash2, Share2, Users, Lock, ChevronDown, Zap, Menu,
  Mic, MicOff, Volume2, VolumeX
} from 'lucide-react';
import { AIService } from '../../lib/ai';
import { parseAction, executeAction } from '../../lib/agent';
import type { ActionResult } from '../../lib/agent';
import { FileHandlingService } from '../../lib/fileHandling';
import type { FileAttachment } from '../../lib/fileHandling';
import { ChatHistoryService } from '../../lib/chatHistory';
import { motion, AnimatePresence } from 'framer-motion';
import { TeamService } from '../../lib/team';
import { PinEntryModal } from './PinEntryModal';
import { getApiUrl } from '../../lib/api-config';
import type { BusinessProfile } from '../../lib/profiles';
import { GrowthService } from '../../lib/growth';
import { VoiceService } from '../../lib/voice';

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

const MAX_LOCAL_SESSIONS = 15;
const MAX_MSG_CONTENT_LOCAL = 50000;
const MAX_ATTACHMENT_SIZE_LOCAL = 500;
const MAX_MESSAGES_PER_SESSION = 25;

const sanitizeSessions = (sessions: ChatSession[]): ChatSession[] => {
  const limitedSessions = sessions.slice(0, MAX_LOCAL_SESSIONS);
  return limitedSessions.map(session => {
    const limitedMessages = session.messages.slice(-MAX_MESSAGES_PER_SESSION);
    return {
      ...session,
      messages: limitedMessages.map(msg => {
        const sanitized = { ...msg };
        if (sanitized.content && sanitized.content.length > MAX_MSG_CONTENT_LOCAL) {
          sanitized.content = sanitized.content.substring(0, MAX_MSG_CONTENT_LOCAL) + '... [truncated]';
        }
        if (sanitized.attachments) {
          sanitized.attachments = sanitized.attachments.map(attr => ({
            ...attr,
            content: (attr.content && attr.content.length > MAX_ATTACHMENT_SIZE_LOCAL) 
              ? attr.content.substring(0, MAX_ATTACHMENT_SIZE_LOCAL) + '... [truncated]' 
              : attr.content,
            previewUrl: undefined
          }));
        }
        if (sanitized.actionResult && sanitized.actionResult.data) {
          const newData = { ...sanitized.actionResult.data };
          if (newData.screenshot) delete newData.screenshot;
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
      if (sessions.length > 2) {
        saveSessions(sessions.slice(0, Math.floor(sessions.length / 2)));
      } else if (sessions.length > 1) {
        saveSessions([sessions[0]]);
      } else {
        localStorage.removeItem(SESSIONS_KEY);
      }
    }
  }
};

// ─── History Sidebar ──────────────────────────────────────────────────────────

const HistorySidebar = ({
  sessions, activeSessionId, onSelectSession, onNewChat, onDeleteSession,
  collapsed, onToggle, backendStatus, onJoinTeamChat, isMobile, onCloseMobile,
}: any) => {
  const [showTeamOptions, setShowTeamOptions] = useState(false);
  const groupedSessions = () => {
    const today: ChatSession[] = [];
    const yesterday: ChatSession[] = [];
    const older: ChatSession[] = [];
    const now = new Date();
    sessions.forEach((s: any) => {
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
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">{label}</p>
        {items.map(s => (
          <div
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={`group flex items-start gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 mb-1 ${
              s.id === activeSessionId
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <MessageSquare size={13} className="mt-0.5 flex-shrink-0 text-slate-400 group-hover:text-blue-500" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-xs font-semibold truncate">{s.title || 'New Chat'}</p>
                {s.isTeam && (
                  <div className="flex items-center gap-1">
                    <span className="flex items-center gap-0.5 px-1 py-0.25 rounded-[4px] bg-blue-100 text-blue-600 text-[8px] font-bold uppercase tracking-wider border border-blue-200">
                      <Users size={8} /> Team
                    </span>
                    {s.pin && (
                      <span className="font-mono text-[8px] text-slate-500 bg-slate-100 px-1 rounded border border-slate-200" title="Team PIN">
                        #{s.pin}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-500 truncate">{s.preview}</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onDeleteSession(s.id); }}
              title="Delete chat"
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all flex-shrink-0"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="fixed inset-y-0 left-0 w-[80vw] max-w-[20rem] sm:w-72 md:w-80 bg-white border-r border-slate-200 flex flex-col z-50 transform transition-transform duration-300 shadow-2xl">
        <div className="flex items-center justify-between px-3 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-blue-600" />
            <span className="text-base font-black text-slate-900">History</span>
          </div>
          <button onClick={onCloseMobile} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all">
            <X size={20} />
          </button>
        </div>
        
        <div className="px-3 py-3 space-y-2">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 transition-all text-sm font-bold"
          >
            <Plus size={16} /> New Chat
          </button>
          
          <button
            onClick={onJoinTeamChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all text-sm font-bold"
          >
            <Users size={16} /> Join Team
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-thin">
          {sessions.length === 0 ? (
            <div className="text-center text-slate-400 text-xs px-4 py-8 font-medium">
              <Clock size={24} className="mx-auto mb-2 text-slate-300" />
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
  
  if (collapsed) {
    return (
      <div className="hidden md:flex w-10 lg:w-12 flex-col items-center py-3 lg:py-4 gap-2 lg:gap-3 border-r border-slate-200 bg-slate-50">
        <button onClick={onToggle} className="p-1.5 md:p-2 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all" title="Expand history">
          <ChevronRight size={16} />
        </button>
        <button onClick={onNewChat} className="p-1.5 md:p-2 rounded-lg hover:bg-blue-100 text-blue-600 transition-all" title="New chat">
          <Plus size={16} />
        </button>
        {sessions.slice(0, 4).map((s: any) => (
          <button
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={`p-1.5 md:p-2 rounded-lg transition-all ${s.id === activeSessionId ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-900'}`}
            title={s.title}
          >
            <MessageSquare size={14} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="hidden md:flex w-48 lg:w-60 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between px-2 md:px-3 py-2 md:py-3 border-b border-slate-200 bg-white/50 backdrop-blur">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-blue-600" />
          <div className="flex flex-col">
            <span className="text-xs md:text-sm font-black text-slate-900">Britsync AI</span>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${
                backendStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 
                backendStatus === 'offline' ? 'bg-red-500' : 'bg-orange-500'
              }`} />
              <span className="text-[9px] md:text-[10px] text-slate-500 font-bold lowercase truncate">
                {backendStatus === 'online' ? 'Ready' : backendStatus === 'offline' ? 'Offline' : 'Syncing...'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onToggle} className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-all">
          <ChevronLeft size={14} />
        </button>
      </div>

      <div className="px-2 md:px-3 py-3 space-y-1.5 md:space-y-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-2 md:px-3 py-2 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 hover:bg-blue-200 transition-all text-xs md:text-sm font-bold shadow-sm"
        >
          <Plus size={14} />
          <span className="hidden md:inline">New Chat</span>
          <span className="md:hidden">New</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowTeamOptions(!showTeamOptions)}
            className={`w-full flex items-center justify-between px-2 md:px-3 py-2 rounded-xl transition-all text-xs md:text-sm font-bold ${
              showTeamOptions 
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={14} /> Team
            </div>
            <ChevronDown size={12} className={`transition-transform duration-200 ${showTeamOptions ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showTeamOptions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 w-full mt-1 p-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <button
                  onClick={() => { onJoinTeamChat(); setShowTeamOptions(false); }}
                  className="w-full flex items-center gap-2 px-2 md:px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all text-left font-medium"
                >
                  <Lock size={12} className="text-blue-500" />
                  Join Team with PIN
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-1 scrollbar-thin">
        {sessions.length === 0 ? (
          <div className="text-center text-slate-400 text-[10px] md:text-xs px-2 md:px-4 py-4 md:py-6 font-medium">
            <Clock size={20} className="mx-auto mb-2 text-slate-300" />
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
      {screenshot && (
        <div className="space-y-1">
          <button
            onClick={() => setShowScreenshot(!showScreenshot)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-500 font-bold transition-colors"
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
              className="w-full rounded-xl border border-slate-200 max-h-64 object-cover object-top shadow-sm"
            />
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((item: any, i: number) => (
            <a
              key={i}
              href={item.url || item.href || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 transition-all group block shadow-sm"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {item.title || item.name || item.company || 'No title'}
                </p>
                {(item.snippet || item.channel || item.company || item.location) && (
                  <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                    {item.snippet || [item.company, item.location].filter(Boolean).join(' · ') || item.channel}
                  </p>
                )}
              </div>
              <ExternalLink size={10} className="text-slate-300 group-hover:text-blue-500 flex-shrink-0 mt-0.5 transition-colors" />
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

  const statusColor = (result.status as string) === 'success' ? 'border-emerald-200 bg-emerald-50' :
                      (result.status as string) === 'pending'  ? 'border-orange-200 bg-orange-50' :
                                                     'border-red-200 bg-red-50';
  const statusDot   = (result.status as string) === 'success' ? 'bg-emerald-500' :
                      (result.status as string) === 'pending'  ? 'bg-orange-500' :
                                                     'bg-red-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-3 rounded-2xl border p-4 shadow-sm ${statusColor}`}
    >
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusDot} flex-shrink-0 shadow-sm`} />
          <span className="font-bold text-slate-900 text-sm">{result.title}</span>
          {isBrowserAction && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded-md border border-blue-200 uppercase tracking-wide">
              Browser
            </span>
          )}
        </div>
        <ChevronRight size={14} className={`text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>
      <p className="text-slate-600 font-medium text-xs mt-1.5 ml-4">{result.summary}</p>

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
            <div key={i} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-sm">
              <p className="font-bold text-slate-900">{lead.name || lead.business_name}</p>
              {lead.address && <p className="text-slate-500 font-medium">{lead.address}</p>}
              {lead.phone && <p className="text-blue-600 font-bold mt-0.5">{lead.phone}</p>}
            </div>
          ))}
          {(result.type as string) === 'email_draft' && typeof result.data?.body === 'string' && (
            <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs shadow-sm">
              <p className="font-bold text-slate-900 mb-1">Subject: {result.data.subject}</p>
              <p className="text-slate-600 font-medium whitespace-pre-wrap">{result.data.body}</p>
            </div>
          )}
          {((result.type as string) === 'invoice' || (result.type as string) === 'financial_report') && result.data?.filename && (
            <button className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-blue-600 hover:bg-slate-50 shadow-sm transition-all">
              <ExternalLink size={12} /> Open {result.data.filename}
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Message Bubble ────────────────────────────────────────────────────────────

const MessageBubble = ({ msg, onSpeak, isSpeaking }: any) => {
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
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={k} className="font-black text-slate-900">{part.slice(2, -2)}</strong>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={k} className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-orange-600 font-mono text-[10px] md:text-[11px] font-bold">{part.slice(1, -1)}</code>;
      if (part === '\n') return <br key={k} />;
      return <span key={k}>{part}</span>;
    });
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
          <div key={`c-${i}`} className="my-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{lang}</span>
              <button onClick={() => navigator.clipboard.writeText(code)} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider transition-colors">
                Copy
              </button>
            </div>
            <pre className="p-3 overflow-x-auto text-[11px] md:text-xs font-mono font-medium text-slate-800 whitespace-pre">
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`flex gap-2 md:gap-3 group w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${isUser ? 'bg-blue-600' : 'bg-red-600'}`}>
        {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
      </div>

      <div className={`max-w-[85%] md:max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1 min-w-0`}>
        <div className={`relative px-4 py-3 md:px-5 md:py-4 rounded-2xl text-sm md:text-[15px] leading-relaxed font-medium shadow-sm ${
          isUser ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
        }`}>
          {renderContent(msg.content)}

          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {msg.attachments.map((a: any) => (
                <div key={a.id} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold border shadow-sm ${isUser ? 'bg-blue-700 border-blue-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  {a.type.startsWith('image/') ? <Image size={12} className={isUser ? 'text-blue-200' : 'text-orange-500'} /> : <File size={12} className={isUser ? 'text-blue-200' : 'text-blue-500'} />}
                  <span className="truncate max-w-[120px] md:max-w-[200px]">{a.name}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={handleCopy} className={`absolute -top-2 ${isUser ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-blue-600 shadow-sm transition-all`} aria-label="Copy">
            <Copy size={12} />
          </button>

          {!isUser && onSpeak && (
            <button onClick={() => onSpeak(msg.id, msg.content)} className={`absolute -top-2 -right-16 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg border shadow-sm transition-all ${isSpeaking ? 'bg-orange-100 border-orange-200 text-orange-600' : 'bg-white border-slate-200 text-slate-500 hover:text-orange-600'}`}>
              {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
            </button>
          )}
        </div>

        {msg.isActionRunning && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 px-2 mt-1">
            <Loader2 size={14} className="animate-spin text-blue-500" />
            <span>Executing action...</span>
          </div>
        )}
        {msg.actionResult && <ActionResultCard result={msg.actionResult} />}

        <span className="text-[10px] font-bold text-slate-400 px-2 uppercase tracking-widest mt-0.5">
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {copied && <span className="ml-2 text-emerald-600">Copied!</span>}
        </span>
      </div>
    </motion.div>
  );
};

// ─── Main Chatbot ─────────────────────────────────────────────────────────────

export const Chatbot = ({ profile }: { profile: BusinessProfile | null; onSignOut?: () => void }) => {
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => localStorage.getItem(ACTIVE_SESSION_KEY) || '');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: 'Delete', onConfirm: () => {} });

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages: Message[] = activeSession?.messages || [];

  const setMessages = (updater: Message[] | ((prev: Message[]) => Message[])) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      const newMsgs = typeof updater === 'function' ? updater(s.messages) : updater;
      const uniqued = uniquifyMessages(newMsgs);
      const firstUser = uniqued.find(m => m.role === 'user');
      return {
        ...s, messages: uniqued,
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
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => localStorage.getItem('britsee_auto_speak') === '1');
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const inputBeforeListenRef = useRef<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { saveSessions(sessions); }, [sessions]);
  useEffect(() => { localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId); }, [activeSessionId]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(getApiUrl('/health'));
        setBackendStatus(res.ok ? 'online' : 'offline');
      } catch { setBackendStatus('offline'); }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const createNewSession = useCallback(() => {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessions(prev => [{ id, title: 'New Chat', preview: '', createdAt: new Date(), messages: [] }, ...prev]);
    setActiveSessionId(id);
    ChatHistoryService.startNewSession(id);
  }, []);

  useEffect(() => {
    if (sessions.length === 0) createNewSession();
    else if (!activeSessionId || !sessions.find(s => s.id === activeSessionId)) setActiveSessionId(sessions[0].id);
  }, [activeSessionId, createNewSession, sessions]);

  useEffect(() => {
    if (activeSessionId && activeSession && activeSession.messages.length === 0) {
      setMessages([{
        id: 'init_' + activeSessionId, role: 'assistant',
        content: activeSession?.isTeam 
          ? `Welcome to your **Team Collaboration Hub**! 👥\n\nThis is a shared session (PIN: **${activeSession.pin}**). Every message you send here is synchronized with your team. How can we work together today?`
          : `Hello! I'm **Britsync AI**. 🚀\n\nI'm here to help you with research, marketing, and business automation. How can I assist you today?`,
        timestamp: new Date(),
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  useEffect(() => { setChatMode('default'); setShowModeMenu(false); }, [activeSessionId]);

  const joinTeamChatByPin = async (pin: string) => {
    setIsJoining(true); setPinError('');
    try {
      const displayName = window.prompt("Enter your display name for the team:", "Member") || 'Member';
      await TeamService.joinTeamByPin(pin, displayName);
      alert(`Joined team — your chats are private, guided by the owner's strategy.`);
      setShowPinModal(false);
      createNewSession();
    } catch (err: any) { setPinError(err.message || 'Invalid PIN or error joining team.'); } 
    finally { setIsJoining(false); }
  };

  const deleteSession = (id: string) => {
    const target = sessions.find(s => s.id === id);
    setConfirmModal({
      open: true, title: `Delete "${target?.title || 'this chat'}"?`,
      message: 'This will permanently remove this chat and all of its messages.',
      confirmLabel: 'Delete chat',
      onConfirm: () => {
        setSessions(prev => {
          const remaining = prev.filter(s => s.id !== id);
          if (id === activeSessionId && remaining.length > 0) setActiveSessionId(remaining[0].id);
          else if (remaining.length === 0) createNewSession();
          return remaining;
        });
        setConfirmModal(c => ({ ...c, open: false }));
      },
    });
  };

  const handleFileClick = () => fileInputRef.current?.click();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return;
    const newAttachments: FileAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      newAttachments.push(await FileHandlingService.processFile(files[i]));
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const removeAttachment = (id: string) => setAttachments(prev => prev.filter(a => a.id !== id));

  const handleShareChat = () => {
    if (!activeSessionId) return;
    const shareUrl = `${window.location.origin}/chat/share/${activeSessionId}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Shareable link copied to clipboard!\n\n' + shareUrl);
  };

  const handleSend = async (text?: string) => {
    const rawText = (text || input).trim();
    if (!rawText || isLoading) return;

    const activeMode = CHAT_MODES.find(m => m.id === chatMode);
    const messageText = activeMode && activeMode.prefix ? `${activeMode.prefix}${rawText}` : rawText;

    let fullContent = messageText;
    if (attachments.length > 0) {
      const fileContext = attachments.filter(a => a.content).map(a => `[Attached File: ${a.name}]\n${a.content}`).join('\n\n');
      if (fileContext) fullContent = `${messageText}\n\nContext from files:\n${fileContext}`;
    }

    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: fullContent, attachments: attachments.length > 0 ? attachments : undefined, timestamp: new Date() };

    setMessages(prev => uniquifyMessages([...prev, userMsg]));
    setInput(''); setAttachments([]); setChatMode('default'); setShowModeMenu(false); setIsLoading(true);

    const isOwner = TeamService.getCurrentMember()?.role === 'owner';
    const isTeamMode = !isOwner;
    ChatHistoryService.saveMessage({ role: 'user', content: fullContent, attachments: userMsg.attachments });

    const britcId = `b_${Date.now()}`;
    try {
      const userId = TeamService._uid();
      let businessPulse = "", bottlenecksText = "";
      if (userId) {
        businessPulse = await GrowthService.getBusinessPulse(profile, userId, isTeamMode);
        const bns = await GrowthService.detectBottlenecks(profile, userId);
        bottlenecksText = bns.map(b => `- [${b.impact.toUpperCase()}] ${b.title}: ${b.description}`).join('\n');
      }

      let response = "";
      const isBookingRequest = ['book a', 'schedule a', 'arrange a', 'discovery call'].some(p => fullContent.toLowerCase().includes(p));
      
      if (isBookingRequest) {
        try {
          const res = await fetch('/api/bot/chat', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatInput: fullContent, sessionId: activeSessionId || 'dashboard-user', metadata: { isOwner, isTeamMode, businessPulse, bottlenecks: bottlenecksText } })
          });
          if (!res.ok) throw new Error('Backend offline');
          response = (await res.json()).output;
        } catch (err) {
          response = await AIService.chat([...messages, userMsg].map((m: any) => ({ role: m.role, content: m.content, attachments: m.attachments })), { isOwner, isTeamMode, businessPulse, bottlenecks: bottlenecksText });
        }
      } else {
        response = await AIService.chat([...messages, userMsg].map((m: any) => ({ role: m.role, content: m.content, attachments: m.attachments })), { isOwner, isTeamMode, businessPulse, bottlenecks: bottlenecksText });
      }

      const { cleanText, action } = parseAction(response);

      if (action) {
        setMessages(prev => [...prev, { id: britcId, role: 'assistant', content: cleanText, timestamp: new Date(), isActionRunning: true }]);
        ChatHistoryService.saveMessage({ role: 'assistant', content: cleanText });
        setIsLoading(false);
        try {
          const result = await executeAction(action, profile);
          setMessages(prev => prev.map(m => m.id === britcId ? { ...m, isActionRunning: false, actionResult: result } : m));
        } catch (execErr: any) {
          setMessages(prev => prev.map(m => m.id === britcId ? { ...m, isActionRunning: false, actionResult: { type: action.type, status: 'error', title: '⚠️ Execution Failed', summary: `Failed: ${execErr.message}` } } : m));
        }
      } else {
        setMessages(prev => [...prev, { id: britcId, role: 'assistant', content: cleanText, timestamp: new Date() }]);
        ChatHistoryService.saveMessage({ role: 'assistant', content: cleanText });
        setIsLoading(false);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { id: britcId, role: 'assistant', content: `⚠️ Error: ${err.message}`, timestamp: new Date() }]);
      setIsLoading(false);
    }
  };

  // ─── Voice handlers ─────────────────────────────────────────────────────────
  const toggleListening = () => {
    if (isListening) { VoiceService.stopListening(); setIsListening(false); return; }
    setVoiceError(null); inputBeforeListenRef.current = input;
    const ok = VoiceService.startListening({
      onResult: (transcript, isFinal) => {
        const merged = (inputBeforeListenRef.current ? inputBeforeListenRef.current.trimEnd() + ' ' : '') + transcript;
        setInput(merged); if (isFinal) inputBeforeListenRef.current = merged;
      },
      onError: (msg) => { setVoiceError(msg); setIsListening(false); },
      onEnd: () => setIsListening(false),
    });
    if (ok) setIsListening(true);
  };

  const speakMessage = (msgId: string, content: string) => {
    if (speakingMsgId === msgId) { VoiceService.cancelSpeak(); setSpeakingMsgId(null); return; }
    VoiceService.speak(content, { onEnd: () => setSpeakingMsgId(null), onError: () => setSpeakingMsgId(null) });
    setSpeakingMsgId(msgId);
  };

  const toggleAutoSpeak = () => {
    setAutoSpeak(v => {
      const next = !v; localStorage.setItem('britsee_auto_speak', next ? '1' : '0');
      if (!next) { VoiceService.cancelSpeak(); setSpeakingMsgId(null); }
      return next;
    });
  };

  useEffect(() => { return () => { VoiceService.stopListening(); VoiceService.cancelSpeak(); }; }, []);
  const lastSpokenIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoSpeak || isLoading) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || last.isActionRunning || lastSpokenIdRef.current === last.id || !last.content?.trim()) return;
    lastSpokenIdRef.current = last.id;
    VoiceService.speak(last.content, { onEnd: () => setSpeakingMsgId(null), onError: () => setSpeakingMsgId(null) });
    setSpeakingMsgId(last.id);
  }, [messages, autoSpeak, isLoading]);

  return (
    <div className="flex h-full w-full bg-[#f8fafc] overflow-hidden relative font-sans text-slate-900">
      {showMobileSidebar && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden" onClick={() => setShowMobileSidebar(false)} />}
      
      <HistorySidebar
        sessions={sessions} activeSessionId={activeSessionId}
        onSelectSession={(id: string) => { setActiveSessionId(id); setShowMobileSidebar(false); }}
        onNewChat={() => { createNewSession(); setShowMobileSidebar(false); }}
        onDeleteSession={deleteSession} collapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} backendStatus={backendStatus}
        onJoinTeamChat={() => { setShowPinModal(true); setShowMobileSidebar(false); }}
        isMobile={showMobileSidebar} onCloseMobile={() => setShowMobileSidebar(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] h-full relative">
        {/* Header */}
        <div className="flex flex-col border-b border-slate-200 bg-white/80 backdrop-blur-xl flex-shrink-0 shadow-sm z-10">
          {TeamService.getCachedContext()?.team && (
            <div className="px-3 py-1.5 bg-blue-50 flex items-center justify-center gap-2 border-b border-blue-100">
              <Zap size={12} className="text-blue-600 animate-pulse" />
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest truncate">
                Team Mode: {TeamService.getCachedContext()?.team?.title || 'Owner'}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button onClick={() => setShowMobileSidebar(true)} className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors shrink-0" title="Chat history">
                <Menu size={18} />
              </button>
              <div className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-red-600 to-orange-500 rounded-xl items-center justify-center shadow-lg shadow-red-500/20 shrink-0">
                <Bot size={18} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-black text-slate-900 text-sm md:text-base tracking-tight truncate">{activeSession?.title || 'Britsync AI'}</h2>
                <p className="text-[10px] md:text-[11px] text-emerald-600 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)] shrink-0" />
                  <span>AI Active</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button onClick={handleShareChat} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all text-xs font-bold shadow-sm" title="Share">
                <Share2 size={14} /> <span className="hidden md:inline">Share</span>
              </button>
              <button onClick={createNewSession} className="px-2.5 sm:px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5" title="New Chat">
                <Plus size={16} /> <span className="hidden md:inline">New</span>
              </button>
              <button onClick={() => setConfirmModal({ open: true, title: 'Clear conversation?', message: 'All messages will be deleted permanently.', confirmLabel: 'Clear messages', onConfirm: () => { setMessages([]); ChatHistoryService.clearMessages(); setConfirmModal(c => ({ ...c, open: false })); } })} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm" title="Clear chat">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-3 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 md:space-y-8 scrollbar-thin scrollbar-thumb-slate-300">
          <AnimatePresence initial={false}>
            {messages.map(msg => <MessageBubble key={msg.id} msg={msg} onSpeak={speakMessage} isSpeaking={speakingMsgId === msg.id} />)}
          </AnimatePresence>

          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-md">
                <Bot size={20} className="text-white" />
              </div>
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1.5">
                {[0, 1, 2].map(i => <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} className="w-2 h-2 bg-red-500 rounded-full" />)}
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="px-4 md:px-6 pb-2 flex flex-wrap gap-2">
            {attachments.map(a => (
              <div key={a.id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-blue-800 shadow-sm">
                {a.type.startsWith('image/') ? <Image size={14} className="text-blue-500" /> : <File size={14} className="text-blue-500" />}
                <span className="truncate max-w-[150px]">{a.name}</span>
                <button onClick={() => removeAttachment(a.id)} className="ml-1 text-blue-400 hover:text-red-500 hover:bg-red-50 p-0.5 rounded transition-all"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}

        {(isListening || voiceError) && (
          <div className="px-4 md:px-6 pb-2">
            <div className={`text-xs font-bold flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm ${voiceError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-orange-50 border-orange-200 text-orange-700 animate-pulse'}`}>
              {voiceError ? <MicOff size={14} /> : <Mic size={14} />}
              <span>{voiceError || 'Listening… speak clearly now'}</span>
              {voiceError && <button onClick={() => setVoiceError(null)} className="ml-auto text-red-400 hover:text-red-700"><X size={14} /></button>}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-2 sm:px-3 md:px-6 pb-3 sm:pb-6 flex-shrink-0 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc] to-transparent pt-3 sm:pt-4">
          <div className="max-w-4xl mx-auto flex items-end gap-1.5 sm:gap-2 bg-white border-2 border-slate-200 rounded-2xl p-1.5 sm:p-2 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all shadow-lg">
            <div className="flex flex-col justify-end pb-1 pl-1">
              <button onClick={handleFileClick} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-colors border border-slate-100" title="Attach file">
                <Paperclip size={18} />
              </button>
            </div>
            
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={chatMode === 'default' ? 'Ask Britsync AI anything...' : `${CHAT_MODES.find(m => m.id === chatMode)?.label}: type request...`}
              className="flex-1 bg-transparent text-[15px] font-medium text-slate-900 placeholder:text-slate-400 outline-none px-3 py-3.5 min-h-[52px] max-h-[200px] resize-none"
              rows={1}
              style={{ height: input ? 'auto' : '52px' }}
            />

            <div className="flex items-center gap-2 pb-1 pr-1">
              <div className="relative">
                <button onClick={() => setShowModeMenu(!showModeMenu)} className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${chatMode === 'default' ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-orange-100 border-orange-200 text-orange-700 hover:bg-orange-200'}`}>
                  {(() => { const m = CHAT_MODES.find(x => x.id === chatMode)!; const Icon = m.icon; return <Icon size={14} />; })()}
                  <span className="hidden sm:inline">{CHAT_MODES.find(m => m.id === chatMode)?.label}</span>
                  <ChevronDown size={14} className={showModeMenu ? 'rotate-180' : ''} />
                </button>
                <AnimatePresence>
                  {showModeMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowModeMenu(false)} />
                      <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 bottom-full mb-3 w-[280px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden">
                        {CHAT_MODES.map(m => {
                          const Icon = m.icon; const active = m.id === chatMode;
                          return (
                            <button key={m.id} onClick={() => { setChatMode(m.id); setShowModeMenu(false); }} className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors ${active ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50 border border-transparent'}`}>
                              <Icon size={18} className={`mt-0.5 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
                              <div>
                                <span className={`text-sm font-bold block ${active ? 'text-blue-900' : 'text-slate-700'}`}>{m.label}</span>
                                <span className="text-[10px] font-medium text-slate-500 leading-tight block mt-0.5">{m.description}</span>
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button onClick={toggleListening} disabled={isLoading} className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all border shadow-sm ${isListening ? 'bg-red-100 text-red-600 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'}`}>
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              
              <button onClick={toggleAutoSpeak} className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center transition-all border shadow-sm ${autoSpeak ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'}`}>
                {autoSpeak ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <button onClick={() => handleSend()} disabled={!input.trim() || isLoading} className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-600 disabled:bg-slate-200 flex items-center justify-center text-white disabled:text-slate-400 transition-all hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-600/30 disabled:shadow-none">
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
              </button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,image/*" />
        </div>
      </div>

      <PinEntryModal isOpen={showPinModal} onClose={() => { setShowPinModal(false); setPinError(''); }} onJoin={joinTeamChatByPin} isJoining={isJoining} error={pinError} />

      <AnimatePresence>
        {confirmModal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setConfirmModal(c => ({ ...c, open: false }))}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl shadow-2xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                  <Trash2 size={24} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">{confirmModal.title}</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">{confirmModal.message}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setConfirmModal(c => ({ ...c, open: false }))} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-sm transition-colors">Cancel</button>
                <button onClick={confirmModal.onConfirm} className="flex-1 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 font-bold text-sm shadow-lg shadow-red-600/20 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chatbot;
