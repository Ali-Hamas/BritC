import React, { useState } from 'react';
import { Brain, Save, Trash2, Plus, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';
import { MemoryService } from '../../lib/memory';
import type { MemoryBlock, MemoryType } from '../../lib/memory';
import { motion } from 'framer-motion';

const MemoryCenter: React.FC = () => {
  const [blocks, setBlocks] = useState<MemoryBlock[]>(() => MemoryService.getMemory());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleEdit = (block: MemoryBlock) => {
    setEditingId(block.id);
    const contentStr = typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2);
    setEditContent(contentStr);
  };

  const handleSave = () => {
    if (!editingId) return;
    setIsSaving(true);
    
    MemoryService.saveMemory(null, { id: editingId, content: editContent });
    setBlocks(MemoryService.getMemory());
    setEditingId(null);
    setIsSaving(false);
    
    setMessage({ type: 'success', text: 'Strategic memory updated.' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreate = (type: MemoryType) => {
    const defaultContent = `New ${type} directive...`;
    MemoryService.saveMemory(null, { type, content: defaultContent, title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Block` });
    const updatedBlocks = MemoryService.getMemory();
    setBlocks(updatedBlocks);
    handleEdit(updatedBlocks[0]);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this directive? It will affect team alignment.')) {
      MemoryService.deleteMemory(null, id);
      setBlocks(MemoryService.getMemory());
    }
  };

  const categories: MemoryType[] = ['strategic', 'operational', 'instructional', 'constraint', 'interpretation'];

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 py-6 overflow-y-auto">
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="p-3 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/20 shrink-0">
            <Brain size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white">Cognitive Memory Center</h2>
            <p className="text-slate-400 text-xs sm:text-sm">Govern the Strategic Brain that guides your team.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.slice(0, 3).map(cat => (
            <button 
              key={cat}
              onClick={() => handleCreate(cat)}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-slate-300 transition-all flex items-center gap-1.5 capitalize"
            >
              <Plus size={14} />
              {cat}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{message.text}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {categories.map(type => {
          const typeBlocks = blocks.filter(b => b.type === type);
          if (typeBlocks.length === 0 && type !== 'strategic') return null;

          return (
            <div key={type} className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">{type} Directives</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {typeBlocks.map(block => (
                  <motion.div 
                    key={block.id}
                    layout
                    className={`group bg-slate-900/40 border rounded-2xl p-5 transition-all ${
                      editingId === block.id ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    {editingId === block.id ? (
                      <div className="space-y-4">
                        <textarea
                          autoFocus
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-slate-200 text-sm focus:border-indigo-500/50 outline-none h-32 resize-none"
                        />
                        <div className="flex justify-between items-center">
                          <button 
                            onClick={() => handleDelete(block.id)}
                            className="p-2 text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setEditingId(null)}
                              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={handleSave}
                              disabled={isSaving}
                              className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                            >
                              <Save size={14} />
                              {isSaving ? 'Saving...' : 'Save Block'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            block.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {block.status}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {new Date(block.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed mb-4 flex-1 whitespace-pre-wrap">
                          {typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)}
                        </p>
                        <button 
                          onClick={() => handleEdit(block)}
                          className="w-full py-2 bg-white/5 border border-white/5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          Modify Logic
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {typeBlocks.length === 0 && (
                  <button 
                    onClick={() => handleCreate(type)}
                    className="border-2 border-dashed border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-slate-300 hover:border-white/10 transition-all"
                  >
                    <Plus size={24} />
                    <span className="text-xs font-bold uppercase tracking-wider">Add {type}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 mt-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
            <Lightbulb size={20} />
          </div>
          <h3 className="font-semibold text-white">AI Alignment Tips</h3>
        </div>
        <ul className="space-y-3">
          {[
            "Use Strategic blocks for high-level mission goals.",
            "Use Constraints to prevent BritC from doing specific things.",
            "Interpretation blocks help the AI understand business-specific jargon.",
            "Conflicts are automatically detected if directives contradict each other."
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
              <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default MemoryCenter;
