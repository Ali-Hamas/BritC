import React from 'react';
import { X, PoundSterling, Loader2 } from 'lucide-react';
import { FinanceService, REVENUE_CATEGORIES, EXPENSE_CATEGORIES } from '../../lib/finance';
import type { NewEntryInput } from '../../lib/finance';

interface EntryFormProps {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

export const EntryForm: React.FC<EntryFormProps> = ({ userId, onClose, onSaved }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = React.useState<NewEntryInput>({
    entry_date: today,
    type: 'revenue',
    category: REVENUE_CATEGORIES[0],
    amount: 0,
    note: '',
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const categories = form.type === 'revenue' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;

  React.useEffect(() => {
    // keep category valid when type flips
    if (!categories.includes(form.category)) {
      setForm(f => ({ ...f, category: categories[0] }));
    }
  }, [form.type]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await FinanceService.addEntry(userId, {
        ...form,
        amount: Number(form.amount),
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-[#0a0b14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">Add entry</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, type: 'revenue' }))}
              className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                form.type === 'revenue'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Revenue
            </button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, type: 'expense' }))}
              className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                form.type === 'expense'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Expense
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={form.entry_date}
                onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500/60 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500/60 text-sm"
              >
                {categories.map(c => (
                  <option key={c} value={c} className="bg-slate-900">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Amount (£)
            </label>
            <div className="relative">
              <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount || ''}
                onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white outline-none focus:border-indigo-500/60 font-mono"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Note (optional)
            </label>
            <input
              type="text"
              value={form.note || ''}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white outline-none focus:border-indigo-500/60 text-sm"
              placeholder="e.g. Client A March retainer"
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-white/5 bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-slate-300 hover:bg-white/5 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : 'Save entry'}
          </button>
        </div>
      </form>
    </div>
  );
};
