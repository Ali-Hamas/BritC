import { useState, useEffect, useRef } from 'react';
import {
  Send, Bot, Loader2, User, Copy,
  TrendingUp, FileText, Mail, CheckSquare, BarChart2,
  Search, ExternalLink, ChevronRight,
  Paperclip, Image, File, X, Plus, MessageSquare,
  Clock, ChevronLeft, Trash2, Share2, Users, Lock, ChevronDown, Zap
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

// ─── Quick Action Chips ────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: Search,       label: 'Web Research',    prompt: 'Research current trends in UK small business automation', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  { icon: TrendingUp,   label: 'Find Leads',      prompt: 'Find dentists in London for a cold outreach campaign', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  { icon: FileText,     label: 'Draft Invoice',   prompt: 'Create a professional invoice for web design services — £1,500', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  { icon: Mail,         label: 'Email Campaign',  prompt: 'Write a cold email campaign for a digital marketing agency', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  { icon: CheckSquare,  label: 'Create Task',     prompt: 'Add a follow-up task to call all new leads tomorrow morning', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  { icon: BarChart2,    label: 'Sales Report',    prompt: 'Generate a quick sales summary report for this quarter', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
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
const MAX_MSG_CONTENT_LOCAL = 2000; // Truncate very long messages in local storage
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
  onCreateTeamChat,
  onJoinTeamChat,
}: {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  backendStatus: 'online' | 'offline' | 'checking';
  onCreateTeamChat: () => void;
  onJoinTeamChat: () => void;
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
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 hover:text-red-400 transition-all flex-shrink-0"
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  if (collapsed) {
    return (
      <div className="w-12 flex flex-col items-center py-4 gap-3 border-r border-white/5">
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-all" title="Expand history">
          <ChevronRight size={16} />
        </button>
        <button onClick={onNewChat} className="p-2 rounded-lg hover:bg-indigo-500/20 text-indigo-400 transition-all" title="New chat">
          <Plus size={16} />
        </button>
        {sessions.slice(0, 6).map(s => (
          <button
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={`p-2 rounded-lg transition-all ${s.id === activeSessionId ? 'bg-white/15 text-white' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}
            title={s.title}
          >
            <MessageSquare size={14} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-60 flex flex-col border-r border-white/5 bg-black/20">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-indigo-400" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Britsee Assistant</span>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${
                backendStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 
                backendStatus === 'offline' ? 'bg-rose-500' : 'bg-amber-500'
              }`} />
              <span className="text-[10px] text-white/40 font-medium lowercase">
                {backendStatus === 'online' ? 'Engine Ready' : backendStatus === 'offline' ? 'Local Brain (Backend Offline)' : 'Syncing Engine...'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onToggle} className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-all">
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Actions */}
      <div className="px-3 py-2 space-y-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all text-sm font-medium"
        >
          <Plus size={14} />
          New Chat
        </button>

        <div className="relative">
          <button
            onClick={() => setShowTeamOptions(!showTeamOptions)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-sm font-medium ${
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
                  onClick={() => { onCreateTeamChat(); setShowTeamOptions(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/70 hover:bg-white/5 hover:text-white transition-all text-left"
                >
                  <Plus size={12} className="text-indigo-400" />
                  Create Team Chat
                </button>
                <button
                  onClick={() => { onJoinTeamChat(); setShowTeamOptions(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/70 hover:bg-white/5 hover:text-white transition-all text-left"
                >
                  <Lock size={12} className="text-indigo-400" />
                  Join Team Chat
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-1 py-1 scrollbar-thin">
        {sessions.length === 0 ? (
          <div className="text-center text-white/20 text-xs px-4 py-6">
            <Clock size={20} className="mx-auto mb-2 opacity-40" />
            No conversations yet
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

const BrowserResultCard = ({ data }: { data: any; type?: string }) => {
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

  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`[^`]+`|\n)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-mono text-[11px]">{part.slice(1, -1)}</code>;
      if (part === '\n') return <br key={i} />;
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-indigo-500' : 'bg-gradient-to-br from-violet-500 to-indigo-600'}`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>

      {/* Content */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-500 text-white rounded-tr-sm'
            : 'bg-white/8 border border-white/10 text-white/90 rounded-tl-sm'
        }`}>
          {renderContent(msg.content)}

          {/* Attachments */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {msg.attachments.map(a => (
                <div key={a.id} className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1 text-xs">
                  {a.type.startsWith('image/') ? <Image size={11} className="text-blue-300" /> : <File size={11} className="text-orange-300" />}
                  <span className="text-white/70 truncate max-w-[120px]">{a.name}</span>
                  {a.type.startsWith('image/') && a.previewUrl && (
                    <img src={a.previewUrl} alt={a.name} className="mt-1.5 w-full max-w-[200px] rounded-lg" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`absolute -top-2 ${isUser ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all`}
          >
            <Copy size={11} />
          </button>
        </div>

        {/* Action Result */}
        {msg.isActionRunning && (
          <div className="flex items-center gap-2 text-xs text-white/50 px-2">
            <Loader2 size={12} className="animate-spin text-indigo-400" />
            <span>Executing action...</span>
          </div>
        )}
        {msg.actionResult && <ActionResultCard result={msg.actionResult} />}

        {/* Timestamp */}
        <span className="text-[10px] text-white/20 px-1">
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        {copied && <span className="text-[10px] text-emerald-400 px-1">Copied!</span>}
      </div>
    </motion.div>
  );
};

// ─── Main Chatbot ─────────────────────────────────────────────────────────────

export const Chatbot = ({ profile }: { profile?: any }) => {
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_SESSION_KEY) || '';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');
  const [teamToast, setTeamToast] = useState<{name: string, action: string} | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

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
  const [showQuickActions, setShowQuickActions] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Persist sessions
  useEffect(() => { saveSessions(sessions); }, [sessions]);
  useEffect(() => { localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId); }, [activeSessionId]);

  // Health check for backend
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
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

  // Create initial session if none
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    } else if (!activeSessionId || !sessions.find(s => s.id === activeSessionId)) {
      setActiveSessionId(sessions[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show welcome message for empty active session
  useEffect(() => {
    if (activeSessionId && activeSession && activeSession.messages.length === 0) {
      setMessages([{
        id: 'init_' + activeSessionId,
        role: 'assistant',
        content: `Hello! I'm **Britsee**, your Strategic Growth Partner powered by the **Britsee Strategic Engine**. 🚀\n\nI am functioning at peak optimal capacity. How shall we expand your business revenue or optimize your team's alignment today?`,
        timestamp: new Date(),
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Show quick actions when session is fresh
  useEffect(() => {
    const userMessages = messages.filter(m => m.role === 'user');
    setShowQuickActions(userMessages.length === 0);
  }, [activeSessionId, messages.length]);

  // Team Chat Synchronization Polling
  useEffect(() => {
    if (!activeSession?.isTeam || !activeSessionId) return;

    const pollInterval = setInterval(async () => {
      try {
        const remoteMsgs = await ChatHistoryService.loadMessages();
        // If we found more messages than we have locally, update the state
        if (remoteMsgs.length > messages.length) {
          console.log(`Detected ${remoteMsgs.length - messages.length} new messages. Syncing...`);
          setMessages(remoteMsgs.map(m => ({
            id: m.id || `sync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at || Date.now())
          })));
        }
      } catch (err) {
        console.warn('Sync Polling Error:', err);
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [activeSessionId, activeSession?.isTeam, messages.length]);

  // Team Action Notification Polling
  useEffect(() => {
    if (!activeSession?.isTeam) return;
    
    let lastActivityCount = ActivityService.getActivities().length;
    
    const activityInterval = setInterval(() => {
      const currentActivities = ActivityService.getActivities();
      if (currentActivities.length > lastActivityCount) {
        const latest = currentActivities[0];
        // Only show toast if it's someone else's action
        const currentUser = TeamService.getCurrentMember();
        if (latest.userName !== currentUser?.name) {
          setTeamToast({ name: latest.userName, action: latest.action });
          setTimeout(() => setTeamToast(null), 5000);
        }
        lastActivityCount = currentActivities.length;
      }
    }, 5000);
    
    return () => clearInterval(activityInterval);
  }, [activeSession?.isTeam]);

  const createNewSession = () => {
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
  };

  const createTeamChat = async () => {
    const userPin = window.prompt("Enter a 6-digit PIN for your team session (or leave default):", 
      Math.floor(100000 + Math.random() * 900000).toString()
    );
    
    if (userPin === null) return; // User cancelled
    if (userPin.trim().length < 4) {
      alert("PIN must be at least 4 digits for security.");
      return;
    }

    const pin = userPin.trim();
    const newSessionId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'New Team Chat',
      preview: 'PIN: ' + pin,
      createdAt: new Date(),
      messages: [],
      isTeam: true,
      pin: pin
    };

    // Register with Supabase / Local Fallback
    const result = await ChatHistoryService.registerTeamSession(newSessionId, pin, 'New Team Chat');
    
    if (result && result.success) {
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSessionId);
      localStorage.setItem(ACTIVE_SESSION_KEY, newSessionId);
      
      const modeMsg = result.mode === 'memory' 
        ? "\n\n⚠️ NOTE: Running in Local Memory Mode. This session is temporary and will be lost if the server restarts." 
        : "";
        
      alert(`Team Chat Created!\n\nPIN: ${pin}\n\nShare this PIN with your team to let them join this session.${modeMsg}`);
    } else {
      alert('Failed to create team chat.\n\nYour server might be down or port 5010 is blocked. Please ensure "npm run server" is running without errors.');
    }
  };

  const joinTeamChatByPin = async (pin: string) => {
    setIsJoining(true);
    setPinError('');
    try {
      const sessionData = await ChatHistoryService.findSessionByPin(pin);
      if (sessionData) {
        // Check if we already have this session locally
        const existing = sessions.find(s => s.id === sessionData.sessionId);
        if (!existing) {
          // Fetch existing messages for this session
          // We need to temporarily set the session ID in service to load messages
          localStorage.setItem(ACTIVE_SESSION_KEY, sessionData.sessionId);
          const messages = await ChatHistoryService.loadMessages();
          
          const newSession: ChatSession = {
            id: sessionData.sessionId,
            title: sessionData.title,
            preview: messages[messages.length - 1]?.content.slice(0, 50) || 'Joined team chat',
            createdAt: new Date(),
            messages: messages.map(m => ({
              id: m.id || Math.random().toString(),
              role: m.role,
              content: m.content,
              timestamp: new Date(m.created_at || Date.now())
            })),
            isTeam: true,
            pin: pin
          };
          setSessions(prev => [newSession, ...prev]);
        }
        
        setActiveSessionId(sessionData.sessionId);
        localStorage.setItem(ACTIVE_SESSION_KEY, sessionData.sessionId);
        setShowPinModal(false);
      } else {
        setPinError('Invalid PIN or session not found.');
      }
    } catch (err) {
      setPinError('An error occurred. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (id === activeSessionId && remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
      } else if (remaining.length === 0) {
        createNewSession();
      }
      return remaining;
    });
  };

  const handleFileClick = () => fileInputRef.current?.click();
  const handleImageClick = () => imageInputRef.current?.click();

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
    if (imageInputRef.current) imageInputRef.current.value = '';
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
    ActivityService.logActivity(currentUser.name, 'Shared Chat', `Generated a shareable link for: ${activeSession?.title || 'New Chat'}`, 'browser');
  };

  const handleSend = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || isLoading) return;

    setShowQuickActions(false);

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
    setIsLoading(true);

    const currentUser = TeamService.getCurrentMember();
    const isOwner = currentUser?.role === 'owner';
    const isTeamMode = !isOwner;
    
    // Save user message to Supabase
    ChatHistoryService.saveMessage({ role: 'user', content: fullContent, attachments: userMsg.attachments });

    const britcId = `b_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      let response = "";
      const lower = fullContent.toLowerCase();
      const appointmentTriggers = ['book', 'schedule', 'appointment', 'call', 'meeting', 'discovery', 'talk to someone'];
      
      // Check if we should use the backend specialized agent (appointment booking)
      const isBookingRequest = appointmentTriggers.some(t => lower.includes(t));
      const alreadyInFlow = messages.some(m => m.role === 'assistant' && (m.content.includes('?')) && messages.indexOf(m) > messages.length - 3);

      if (isBookingRequest || alreadyInFlow) {
        try {
          const res = await fetch('/api/bot/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              chatInput: fullContent, 
              sessionId: activeSessionId || 'dashboard-user',
              metadata: { isOwner, isTeamMode }
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
            { isOwner, isTeamMode }
          );
        }
      } else {
        // Standard AI Service (Groq) with Vision Support
        response = await AIService.chat(
          [...messages, userMsg].map((m: any) => ({ role: m.role, content: m.content, attachments: m.attachments })),
          { isOwner, isTeamMode }
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
    <div className="flex h-full bg-[#0d0d14] overflow-hidden rounded-2xl border border-white/5">
      {/* ─── History Sidebar (Left) ─── */}
        <HistorySidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewChat={createNewSession}
          onDeleteSession={deleteSession}
          collapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          backendStatus={backendStatus}
          onCreateTeamChat={createTeamChat}
          onJoinTeamChat={() => setShowPinModal(true)}
        />

      {/* ─── Main Chat Area ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">{activeSession?.title || 'Britsee'}</h2>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Qwen Cloud · Active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-medium"
              title="Share this chat"
            >
              <Share2 size={12} /> Share
            </button>
            <button
              onClick={createNewSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all text-xs font-medium"
            >
              <Plus size={12} /> New Chat
            </button>
            <button
              onClick={() => {
                if (confirm('Clear this conversation?')) {
                  setMessages([]);
                  ChatHistoryService.clearMessages();
                }
              }}
              className="p-2 rounded-xl hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all"
              title="Clear chat"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {/* Team Activity Toast */}
        <div className="relative">
          <AnimatePresence>
            {teamToast && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute top-4 right-8 z-[100] bg-indigo-500/90 backdrop-blur-md border border-indigo-400/50 rounded-2xl p-4 shadow-2xl shadow-indigo-500/20 max-w-xs pointer-events-none"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Zap size={18} className="text-white fill-white animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest leading-none mb-1">Live Activity</p>
                    <p className="text-sm font-semibold text-white leading-tight">
                      {teamToast.name} is <span className="text-indigo-200">{teamToast.action.toLowerCase()}</span>...
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin">
          <AnimatePresence>
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      className="w-2 h-2 bg-indigo-400 rounded-full" />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <AnimatePresence>
          {showQuickActions && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="px-5 pb-3 flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((qa) => (
                <button key={qa.label} onClick={() => handleSend(qa.prompt)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all hover:scale-105 ${qa.color}`}>
                  <qa.icon size={12} />{qa.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attachment Preview */}
        {attachments.length > 0 && (
          <div className="px-5 pb-2 flex flex-wrap gap-2">
            {attachments.map(a => (
              <div key={a.id} className="flex items-center gap-2 bg-white/8 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
                {a.type.startsWith('image/') ? <Image size={12} className="text-blue-400" /> : <File size={12} className="text-orange-400" />}
                <span className="text-white/70 truncate max-w-[120px]">{a.name}</span>
                <button onClick={() => removeAttachment(a.id)} className="text-white/30 hover:text-red-400 transition-colors">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="px-5 pb-5 flex-shrink-0">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-indigo-500/50 transition-all">
            <button onClick={handleFileClick} className="text-white/30 hover:text-indigo-400 transition-colors flex-shrink-0" title="Attach file">
              <Paperclip size={16} />
            </button>
            <button onClick={handleImageClick} className="text-white/30 hover:text-blue-400 transition-colors flex-shrink-0" title="Attach image">
              <Image size={16} />
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Britsee anything..."
              className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 rounded-xl bg-indigo-500 disabled:bg-white/10 flex items-center justify-center text-white disabled:text-white/30 transition-all hover:bg-indigo-400 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt,.csv,.xlsx" />
          <input ref={imageInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept="image/*" />
        </div>
      </div>

      <PinEntryModal
        isOpen={showPinModal}
        onClose={() => { setShowPinModal(false); setPinError(''); }}
        onJoin={joinTeamChatByPin}
        isJoining={isJoining}
        error={pinError}
      />
    </div>
  );
};

export default Chatbot;
