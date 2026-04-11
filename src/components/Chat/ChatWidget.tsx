import { useState, useEffect, useRef } from 'react';
import {
  Send, Bot, User, X, MessageSquare, Paperclip, Image as ImageIcon, File as FileIcon
} from 'lucide-react';
import { AIService } from '../../lib/ai';
import { parseAction } from '../../lib/agent';
import { FileHandlingService } from '../../lib/fileHandling';
import type { FileAttachment } from '../../lib/fileHandling';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  attachments?: FileAttachment[];
  timestamp: Date;
}

// --- Helpers ---
const uniquifyMessages = (msgs: Message[]): Message[] => {
  const seen = new Set();
  return msgs.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
};

// --- Chat Widget Component ---
export const ChatWidget = ({ businessName = 'BritSync' }) => {
  const [isOpen, setIsOpen] = useState(false);
  // Initialize state from localStorage if available
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('britc_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const mapped = parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
        return uniquifyMessages(mapped);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [discoveryStep, setDiscoveryStep] = useState(() => {
    const saved = localStorage.getItem('britc_discovery_step');
    return saved ? parseInt(saved) : 0;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem('britc_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('britc_discovery_step', discoveryStep.toString());
  }, [discoveryStep]);

  // Initial welcome if no history
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMsg: Message = {
        id: 'welcome',
        role: 'assistant',
        content: `Hi there! I'm **BritC**, your executive growth partner for **${businessName}**. 
        
I'm currently auditing our strategic posture. To help me provide the most value, could you briefly describe your **main business goal** for this quarter?`,
        timestamp: new Date()
      };
      setMessages([welcomeMsg]);
      setDiscoveryStep(1);
    }
  }, [businessName, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText && attachments.length === 0 || isLoading) return;

    // Combine text with file context for the LLM
    let fullContent = messageText;
    if (attachments.length > 0) {
      const fileContext = attachments
        .filter(a => a.content)
        .map(a => `[Attached File: ${a.name}]\n${a.content}`)
        .join('\n\n');
      
      if (fileContext) {
        fullContent = `${messageText}\n\nContext from files:\n${fileContext}`;
      }
    }

    const userMsg: Message = { 
      id: `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, 
      role: 'user', 
      content: fullContent,
      attachments: attachments.length > 0 ? attachments : undefined,
      timestamp: new Date() 
    };
    
    // De-duplication guard
    setMessages(prev => {
      if (prev.some(m => m.content === fullContent && (Date.now() - new Date(m.timestamp).getTime() < 1000))) {
        return prev;
      }
      return uniquifyMessages([...prev, userMsg]);
    });
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const response = await AIService.chat(
        [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        { isWidget: true } 
      );

      const { cleanText } = parseAction(response);
      
      let assistantMsg = cleanText;

      // Logic for Discovery Flow expansion
      if (discoveryStep === 1) {
        assistantMsg += "\n\nUnderstood. Strategic focus noted. Who is your **ideal target client** right now? (e.g. London-based tech startups)";
        setDiscoveryStep(2);
      } else if (discoveryStep === 2) {
        assistantMsg += "\n\nExcellent. I'll focus my intelligence scanning on that segment. \n\nI've enabled **proactive growth alerts** on your dashboard based on these goals. How else can I assist your scale-up today?";
        setDiscoveryStep(3); // Flow complete
      }
      
      setMessages(prev => uniquifyMessages([...prev, {
        id: `a_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: assistantMsg,
        timestamp: new Date()
      }]));
    } catch (err: any) {
      console.error('BritC Widget Error:', err);
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: `I'm experiencing a tactical delay: ${err.message || 'Connection failed'}. Please check your network or API status.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem('britc_messages');
    localStorage.removeItem('britc_discovery_step');
    setMessages([]);
    setDiscoveryStep(0);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-[380px] h-[550px] mb-4 bg-[#080d1f] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Bot size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">BritC Growth Partner</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] text-indigo-100 font-medium tracking-wide">Strategic & Results-Driven</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={clearHistory}
                  title="Clear Chat History"
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
                >
                  <MessageSquare size={16} />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#060c1a] scrollbar-thin">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
                    msg.role === 'user' ? 'bg-indigo-600' : 'bg-white/5 border border-white/10'
                  }`}>
                    {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-indigo-400" />}
                  </div>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-[#0d1526] text-slate-300 border border-white/5 rounded-tl-none shadow-lg'
                  }`}>
                    {msg.content.split('\n').filter(l => !l.startsWith('[Attached File:')).map((line, i) => (
                      <p key={i} className={line.trim() === '' ? 'h-2' : ''}>{line}</p>
                    ))}
                    
                    {/* Render Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.attachments.map(att => (
                          <div key={att.id} className="bg-black/20 rounded-lg p-1.5 flex items-center gap-1.5 border border-white/10 text-[10px]">
                            {att.previewUrl ? (
                              <img src={att.previewUrl} alt={att.name} className="w-6 h-6 rounded object-cover" />
                            ) : (
                              <FileIcon size={12} className="text-indigo-300" />
                            )}
                            <span className="truncate max-w-[80px]">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
                    <Bot size={14} className="text-indigo-400" />
                  </div>
                  <div className="bg-[#0d1526] px-3.5 py-2.5 rounded-xl rounded-tl-none border border-white/5 flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
                        animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#080d1f] border-t border-white/5">
              {/* Attachment Bar */}
              <AnimatePresence>
                {attachments.length > 0 && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-wrap gap-2 mb-3 overflow-hidden"
                  >
                    {attachments.map(att => (
                      <div key={att.id} className="relative bg-white/5 border border-white/10 rounded-lg p-1.5 pr-6 flex items-center gap-2">
                        {att.previewUrl ? (
                          <img src={att.previewUrl} alt={att.name} className="w-6 h-6 rounded object-cover" />
                        ) : (
                          <FileIcon size={12} className="text-indigo-400" />
                        )}
                        <span className="text-[10px] text-white truncate max-w-[80px]">{att.name}</span>
                        <button 
                          onClick={() => removeAttachment(att.id)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Analyze growth with BritC..."
                    className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 rounded-xl pl-4 pr-16 py-2.5 text-sm text-white outline-none transition-all"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                    <button 
                      onClick={handleFileClick}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                    >
                      <Paperclip size={16} />
                    </button>
                    <button 
                      onClick={handleImageClick}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                    >
                      <ImageIcon size={16} />
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && attachments.length === 0) || isLoading}
                  className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Send size={18} className="text-white" />
                </button>
              </div>

              {/* Hidden Inputs */}
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} multiple accept=".txt,.pdf,.doc,.docx,.csv,.json,.md" />
              <input type="file" ref={imageInputRef} className="hidden" onChange={handleFileChange} multiple accept="image/*" />
              
              <p className="text-[10px] text-slate-600 mt-2 text-center font-medium">Powering your growth with BritSync BritC</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble Trigger */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/40 border border-white/20 pointer-events-auto group relative"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }}>
              <X size={24} className="text-white" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }}>
              <MessageSquare size={24} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Pulsing Notification */}
        {!isOpen && (
          <span className="absolute top-0 right-0 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-indigo-600"></span>
          </span>
        )}
      </motion.button>
    </div>
  );
};
