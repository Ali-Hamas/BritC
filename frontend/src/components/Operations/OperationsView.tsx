import React, { useState, useEffect } from 'react';
import {
  FileText, CheckSquare, Zap, Plus, Download, Trash2,
  ArrowRight, Sparkles, Loader2,
  X, FileCheck, FilePen,
  BarChart2, Play, ToggleLeft, ToggleRight, TrendingUp
} from 'lucide-react';
import { DocumentService } from '../../lib/documents';
import type { BusinessDocument } from '../../lib/documents';
import { WorkflowService } from '../../lib/workflow';
import type { AutomationTask, WorkflowRule } from '../../lib/workflow';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Sub-tab types ─────────────────────────────────────────────────────────────
type SubTab = 'tasks' | 'documents' | 'automation';

// ─── Kanban Board ──────────────────────────────────────────────────────────────
const COLUMNS: { id: AutomationTask['status']; label: string; color: string }[] = [
  { id: 'todo',        label: 'To Do',       color: 'border-slate-500/30 bg-slate-500/5' },
  { id: 'in-progress', label: 'In Progress',  color: 'border-indigo-500/30 bg-indigo-500/5' },
  { id: 'done',        label: 'Done',         color: 'border-emerald-500/30 bg-emerald-500/5' },
];

const PRIORITY_STYLE: Record<string, string> = {
  high:   'text-rose-400 bg-rose-400/10 border-rose-400/20',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  low:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};

function AddTaskModal({ onAdd, onClose }: { onAdd: (task: Omit<AutomationTask, 'id' | 'createdAt'>) => void; onClose: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' as AutomationTask['priority'], tags: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onAdd({
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: 'todo',
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-[#0a0f1e] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Add New Task</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Task Title *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Follow up with lead #42..." autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-colors text-sm" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3} placeholder="Optional details..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 transition-colors text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none text-sm">
                <option value="high" className="bg-slate-900">High</option>
                <option value="medium" className="bg-slate-900">Medium</option>
                <option value="low" className="bg-slate-900">Low</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Tags (comma separated)</label>
              <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                placeholder="e.g. leads, follow-up"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 text-sm" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-white/10 rounded-xl text-slate-400 hover:text-white font-medium text-sm transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-500/20">
              Add Task
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function KanbanBoard() {
  const [tasks, setTasks] = useState<AutomationTask[]>(() => WorkflowService.getTasks());
  const [showAddModal, setShowAddModal] = useState(false);
  const [dragTask, setDragTask] = useState<string | null>(null);

  const refresh = () => setTasks(WorkflowService.getTasks());

  const handleMove = (taskId: string, newStatus: AutomationTask['status']) => {
    WorkflowService.moveTask(taskId, newStatus);
    refresh();
  };

  const handleDelete = (taskId: string) => {
    WorkflowService.deleteTask(taskId);
    refresh();
  };

  const handleAdd = (taskData: Omit<AutomationTask, 'id' | 'createdAt'>) => {
    WorkflowService.addTask(taskData);
    refresh();
  };

  const stats = WorkflowService.getStats();

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: stats.total, color: 'text-white' },
          { label: 'To Do', value: stats.todo, color: 'text-slate-400' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-indigo-400' },
          { label: 'Done', value: stats.done, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900/40 rounded-xl border border-white/5 p-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Board header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Task Board</h2>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20">
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id}
              className={`rounded-2xl border p-4 min-h-[400px] transition-colors ${dragTask ? 'border-indigo-500/40' : col.color}`}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragTask) { handleMove(dragTask, col.id); setDragTask(null); } }}
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">{col.label}</h3>
                <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{colTasks.length}</span>
              </div>
              <AnimatePresence>
                <div className="space-y-3">
                  {colTasks.map(task => (
                    <motion.div key={task.id}
                      layout layoutId={task.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                      draggable
                      onDragStart={() => setDragTask(task.id)}
                      onDragEnd={() => setDragTask(null)}
                      className="bg-[#0a0f1e] border border-white/5 hover:border-white/15 rounded-xl p-4 cursor-grab active:cursor-grabbing group transition-all"
                    >
                      <p className="text-white text-sm font-medium leading-snug mb-2">{task.title}</p>
                      {task.description && <p className="text-slate-500 text-xs leading-relaxed mb-3 line-clamp-2">{task.description}</p>}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
                          {task.tags?.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">#{tag}</span>
                          ))}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {col.id !== 'in-progress' && col.id !== 'todo' ? null : (
                            <button onClick={() => handleMove(task.id, col.id === 'todo' ? 'in-progress' : 'done')}
                              className="p-1 text-slate-500 hover:text-indigo-400 transition-colors" title="Move forward">
                              <ArrowRight size={14} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(task.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="flex items-center justify-center h-24 border border-dashed border-white/5 rounded-xl text-slate-600 text-xs">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showAddModal && <AddTaskModal onAdd={handleAdd} onClose={() => setShowAddModal(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ─── Document Center ───────────────────────────────────────────────────────────
const DOC_TYPES = [
  { id: 'invoice',  label: 'Invoice',   icon: FileCheck,  color: 'text-emerald-400 bg-emerald-400/10' },
  { id: 'proposal', label: 'Proposal',  icon: FilePen,    color: 'text-amber-400 bg-amber-400/10' },
  { id: 'contract', label: 'Contract',  icon: FileText,   color: 'text-indigo-400 bg-indigo-400/10' },
  { id: 'report',   label: 'Report',    icon: BarChart2,  color: 'text-rose-400 bg-rose-400/10' },
];

const STATUS_STYLE: Record<string, string> = {
  draft:  'text-slate-400 bg-slate-400/10',
  sent:   'text-indigo-400 bg-indigo-400/10',
  signed: 'text-emerald-400 bg-emerald-400/10',
};

function DocumentCenter({ profile }: { profile: any }) {
  const [docs, setDocs] = useState<BusinessDocument[]>(() => DocumentService.getAllDocuments());
  const [selectedDoc, setSelectedDoc] = useState<BusinessDocument | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateType, setGenerateType] = useState<string | null>(null);
  const [form, setForm] = useState({ client: '', amount: '', project: '', duration: '3 months' });

  const handleGenerate = async (type: string) => {
    setIsGenerating(true);
    setGenerateType(type);
    try {
      const content = await DocumentService.generateDraft(type as any, {
        businessName: profile?.businessName || 'BritSync',
        industry: profile?.industry,
        ...form,
        items: ['Professional Consulting', 'Strategy & Implementation', 'Post-Project Support'],
      });
      const saved = await DocumentService.saveDocument({
        type: type as any,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} — ${form.client || 'Client'} — ${new Date().toLocaleDateString('en-GB')}`,
        content,
        recipient: form.client || 'Client',
        amount: form.amount,
        status: 'draft',
      });
      setDocs(DocumentService.getAllDocuments());
      setSelectedDoc(saved);
      // Fire automation
      WorkflowService.fireEvent('document_created', { title: saved.title });
    } finally {
      setIsGenerating(false);
      setGenerateType(null);
    }
  };

  const handleDelete = (id: string) => {
    DocumentService.deleteDocument(id);
    setDocs(DocumentService.getAllDocuments());
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  const handleStatusChange = (doc: BusinessDocument, status: BusinessDocument['status']) => {
    DocumentService.updateDocument(doc.id, { status });
    setDocs(DocumentService.getAllDocuments());
    if (selectedDoc?.id === doc.id) setSelectedDoc({ ...doc, status });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left column — generator + list */}
      <div className="xl:col-span-1 space-y-6">
        {/* Generator */}
        <div className="bg-slate-900/40 rounded-2xl border border-white/5 p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" /> AI Document Generator
          </h3>
          <div className="space-y-3 mb-4">
            <input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })}
              placeholder="Client / Recipient name"
              className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-slate-300 text-sm outline-none focus:border-indigo-500/50" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="Value e.g. £2,500"
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-slate-300 text-sm outline-none focus:border-indigo-500/50" />
              <input value={form.project} onChange={e => setForm({ ...form, project: e.target.value })}
                placeholder="Project name"
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-slate-300 text-sm outline-none focus:border-indigo-500/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DOC_TYPES.map(dt => {
              const Icon = dt.icon;
              const loading = isGenerating && generateType === dt.id;
              return (
                <button key={dt.id} onClick={() => handleGenerate(dt.id)} disabled={isGenerating}
                  className={`flex items-center gap-2 p-3 rounded-xl border border-white/5 hover:border-white/15 transition-all text-sm font-medium ${dt.color} hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:hover:scale-100`}>
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
                  {loading ? 'Drafting...' : dt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Document list */}
        <div className="bg-slate-900/40 rounded-2xl border border-white/5 p-5">
          <h3 className="text-sm font-bold text-white mb-4">All Documents ({docs.length})</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {docs.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-8 italic">No documents yet. Generate one above.</p>
            ) : docs.map(doc => {
              const dt = DOC_TYPES.find(d => d.id === doc.type);
              const Icon = dt?.icon || FileText;
              return (
                <button key={doc.id} onClick={() => setSelectedDoc(doc)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${selectedDoc?.id === doc.id ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-white/5 hover:border-white/10 hover:bg-white/5'}`}>
                  <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${dt?.color || ''}`}><Icon size={14} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-xs font-medium truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${STATUS_STYLE[doc.status]}`}>{doc.status}</span>
                      <span className="text-[10px] text-slate-600">{new Date(doc.createdAt).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleDelete(doc.id); }}
                    className="text-slate-600 hover:text-rose-400 transition-colors flex-shrink-0 mt-1">
                    <Trash2 size={13} />
                  </button>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right — Document Viewer */}
      <div className="xl:col-span-2">
        {selectedDoc ? (
          <motion.div key={selectedDoc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/40 rounded-2xl border border-white/5 p-6 h-full flex flex-col">
            {/* Doc header */}
            <div className="flex items-start justify-between mb-5 pb-5 border-b border-white/5">
              <div>
                <h3 className="text-white font-bold text-lg">{selectedDoc.title}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-slate-500 text-xs">To: {selectedDoc.recipient}</span>
                  {selectedDoc.amount && <span className="text-emerald-400 text-xs font-bold">{selectedDoc.amount}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select value={selectedDoc.status}
                  onChange={e => handleStatusChange(selectedDoc, e.target.value as any)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border-0 outline-none cursor-pointer ${STATUS_STYLE[selectedDoc.status]} bg-white/5`}>
                  <option value="draft" className="bg-slate-900">Draft</option>
                  <option value="sent" className="bg-slate-900">Sent</option>
                  <option value="signed" className="bg-slate-900">Signed</option>
                </select>
                <button
                  onClick={() => { const el = document.createElement('a'); el.href = `data:text/plain;charset=utf-8,${encodeURIComponent(selectedDoc.content)}`; el.download = `${selectedDoc.title}.txt`; el.click(); }}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="Download">
                  <Download size={16} />
                </button>
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-black/20 rounded-xl p-5 border border-white/5">
              <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-mono">{selectedDoc.content}</pre>
            </div>
          </motion.div>
        ) : (
          <div className="bg-slate-900/20 rounded-2xl border border-dashed border-white/10 h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8">
            <FileText size={40} className="text-slate-600 mb-4" />
            <h3 className="text-white font-semibold mb-2">No Document Selected</h3>
            <p className="text-slate-500 text-sm max-w-xs">Generate a new document using the AI generator, or select an existing one from the list.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Automation Rules ──────────────────────────────────────────────────────────
const TRIGGER_LABELS: Record<string, string> = {
  lead_found: '🎯 Lead Found',
  campaign_sent: '📧 Campaign Sent',
  campaign_reply: '↩️ Campaign Reply',
  document_created: '📄 Document Created',
  manual: '🖱️ Manual',
};

const ACTION_LABELS: Record<string, string> = {
  create_task: '✅ Create Task',
  send_email: '📤 Send Email',
  generate_proposal: '📝 Generate Proposal',
  notify_owner: '🔔 Notify Owner',
  update_status: '🔄 Update Status',
};

function AutomationPanel() {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [firing, setFiring] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<string[]>([]);

  useEffect(() => { setRules(WorkflowService.getRules()); }, []);

  const handleToggle = (ruleId: string) => {
    WorkflowService.toggleRule(ruleId);
    setRules(WorkflowService.getRules());
  };

  const handleFire = (rule: WorkflowRule) => {
    setFiring(rule.id);
    setTimeout(() => {
      const results = WorkflowService.fireEvent(rule.trigger, { title: `Task from ${rule.name}` });
      setLastResults(results);
      setRules(WorkflowService.getRules());
      setFiring(null);
    }, 1200);
  };

  const stats = WorkflowService.getStats();

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Rules', value: stats.activeRules, icon: Zap, color: 'text-amber-400' },
          { label: 'Total Runs', value: stats.totalRuleRuns, icon: TrendingUp, color: 'text-indigo-400' },
          { label: 'Tasks Created', value: stats.total, icon: CheckSquare, color: 'text-emerald-400' },
          { label: 'Automations', value: rules.length, icon: BarChart2, color: 'text-slate-300' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-slate-900/40 rounded-xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className={s.color} />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Live test results */}
      <AnimatePresence>
        {lastResults.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Automation Triggered</p>
              <button onClick={() => setLastResults([])} className="text-slate-500 hover:text-white"><X size={14} /></button>
            </div>
            {lastResults.map((r, i) => <p key={i} className="text-slate-300 text-sm">{r}</p>)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules list */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white">Workflow Rules</h3>
        {rules.map(rule => (
          <motion.div key={rule.id} layout
            className={`rounded-2xl border p-5 transition-all ${rule.enabled ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-white/5 bg-slate-900/30 opacity-60'}`}>
            <div className="flex items-center gap-4">
              {/* Toggle */}
              <button onClick={() => handleToggle(rule.id)} className="flex-shrink-0">
                {rule.enabled
                  ? <ToggleRight size={28} className="text-indigo-400" />
                  : <ToggleLeft size={28} className="text-slate-600" />}
              </button>

              {/* Rule details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white font-semibold text-sm">{rule.name}</span>
                  {rule.enabled && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase">Active</span>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-slate-300">
                    {TRIGGER_LABELS[rule.trigger] || rule.trigger}
                  </span>
                  <ArrowRight size={12} className="text-slate-600" />
                  <span className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-slate-300">
                    {ACTION_LABELS[rule.action] || rule.action}
                  </span>
                </div>
              </div>

              {/* Stats + fire button */}
              <div className="flex-shrink-0 text-right space-y-2">
                <p className="text-[10px] text-slate-500">{rule.runCount} runs</p>
                {rule.lastRun && <p className="text-[10px] text-slate-600">{new Date(rule.lastRun).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</p>}
                {rule.enabled && (
                  <button onClick={() => handleFire(rule)} disabled={!!firing}
                    className="flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-white border border-amber-400/20 hover:border-white/20 px-2 py-1 rounded-lg transition-all disabled:opacity-40">
                    {firing === rule.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                    Test
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Coming Soon block */}
      <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl"><Zap size={20} className="text-indigo-400" /></div>
          <div>
            <h3 className="text-white font-semibold mb-1">Build Custom Automations</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Create your own "If This → Then That" rules to link Lead Hunter, Email Sender, and your task board together.
              <span className="text-indigo-400 font-medium"> Custom rule builder coming in Phase 5.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Operations View ──────────────────────────────────────────────────────
const TABS: { id: SubTab; label: string; icon: any }[] = [
  { id: 'tasks',      label: 'Task Board',   icon: CheckSquare },
  { id: 'documents',  label: 'Documents',    icon: FileText },
  { id: 'automation', label: 'Automation',   icon: Zap },
];

const OperationsView: React.FC<{ profile?: any }> = ({ profile }) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('tasks');

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Operations Hub</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage tasks, generate AI documents, and automate your workflows.</p>
        </div>
        <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5 backdrop-blur-sm w-fit">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSubTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}>
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeSubTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {activeSubTab === 'tasks'      && <KanbanBoard />}
          {activeSubTab === 'documents'  && <DocumentCenter profile={profile} />}
          {activeSubTab === 'automation' && <AutomationPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default OperationsView;
