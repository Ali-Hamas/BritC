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
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-300"
      >
        <div className="flex items-center justify-between px-6 py-6 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">New Ledger Entry</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-50 border border-slate-100 rounded-[20px] shadow-inner">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, type: 'revenue' }))}
              className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                form.type === 'revenue'
                  ? 'bg-white text-blue-600 border border-blue-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Revenue Signal
            </button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, type: 'expense' }))}
              className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                form.type === 'expense'
                  ? 'bg-white text-red-600 border border-red-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Expense Factor
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Post Date
              </label>
              <input
                type="date"
                value={form.entry_date}
                onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Classification
              </label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner appearance-none"
              >
                {categories.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Magnitude (GBP)
            </label>
            <div className="relative group">
              <PoundSterling className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount || ''}
                onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-4 text-slate-900 font-black font-mono text-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner placeholder:text-slate-200"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Audit Directive (Optional)
            </label>
            <input
              type="text"
              value={form.note || ''}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner placeholder:text-slate-300 text-sm"
              placeholder="e.g. Q1 Growth Retainer"
            />
          </div>

          {error && (
            <div className="px-5 py-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-black uppercase tracking-tight shadow-sm">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-4 px-6 sm:px-8 py-6 border-t border-slate-100 bg-slate-50/50 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
          >
            Abort
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : 'Commit Entry'}
          </button>
        </div>
      </form>
    </div>
  );
};
