import React from 'react';
import Papa from 'papaparse';
import { X, Upload, FileSpreadsheet, Loader2, Sparkles } from 'lucide-react';
import { FinanceService, REVENUE_CATEGORIES, EXPENSE_CATEGORIES } from '../../lib/finance';
import type { NewEntryInput } from '../../lib/finance';

interface CsvImportProps {
  userId: string;
  onClose: () => void;
  onImported: (count: number) => void;
}

const MAX_ROWS = 1000;

const SAMPLE_CSV = `date,type,category,amount,note
2026-01-05,revenue,Retainer,3000,Client A Jan
2026-01-12,expense,Ads,450,FB campaign
2026-01-18,revenue,One-off Project,1200,Landing page build
2026-01-22,expense,Software,120,SaaS subscriptions
2026-02-05,revenue,Retainer,3000,Client A Feb
2026-02-11,expense,Ads,520,Google Ads
2026-02-19,expense,Contractors,800,Designer invoice
2026-02-27,revenue,Consulting,900,Strategy call
2026-03-04,revenue,Retainer,3000,Client A Mar
2026-03-10,expense,Hosting,80,VPS + domains`;

interface ParsedRow {
  entry: NewEntryInput;
  error?: string;
}

function normaliseRow(raw: Record<string, string>, idx: number): ParsedRow {
  const date = (raw.date || raw.Date || '').trim();
  const rawType = (raw.type || raw.Type || '').trim().toLowerCase();
  const category = (raw.category || raw.Category || '').trim();
  const amountStr = (raw.amount || raw.Amount || '').toString().replace(/[£$,\s]/g, '').trim();
  const note = (raw.note || raw.Note || '').trim();

  const entry: NewEntryInput = {
    entry_date: date,
    type: (rawType === 'expense' ? 'expense' : 'revenue') as 'revenue' | 'expense',
    category: category || (rawType === 'expense' ? 'Other Expense' : 'Other Revenue'),
    amount: Number(amountStr),
    note: note || null,
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { entry, error: `Row ${idx + 1}: date must be YYYY-MM-DD` };
  }
  if (rawType !== 'revenue' && rawType !== 'expense') {
    return { entry, error: `Row ${idx + 1}: type must be "revenue" or "expense"` };
  }
  if (!isFinite(entry.amount) || entry.amount <= 0) {
    return { entry, error: `Row ${idx + 1}: amount must be a positive number` };
  }

  const allowed = entry.type === 'revenue' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;
  if (!allowed.includes(entry.category)) {
    // Accept anything, but normalise unknown categories to the generic "Other".
    entry.category = entry.type === 'revenue' ? 'Other Revenue' : 'Other Expense';
  }
  return { entry };
}

export const CsvImport: React.FC<CsvImportProps> = ({ userId, onClose, onImported }) => {
  const [csvText, setCsvText] = React.useState('');
  const [parsed, setParsed] = React.useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState('');

  const parse = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setParsed(null);
      return;
    }
    const result = Papa.parse<Record<string, string>>(trimmed, {
      header: true,
      skipEmptyLines: true,
    });
    if (result.errors.length) {
      setError(`CSV parse error: ${result.errors[0].message}`);
      setParsed(null);
      return;
    }
    const rows = result.data.slice(0, MAX_ROWS).map((row, idx) => normaliseRow(row, idx));
    setParsed(rows);
    setError(rows.length >= MAX_ROWS ? `Capped at ${MAX_ROWS} rows.` : '');
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setCsvText(text);
      parse(text);
    };
    reader.readAsText(file);
  };

  const loadSample = () => {
    setCsvText(SAMPLE_CSV);
    parse(SAMPLE_CSV);
  };

  const validRows = React.useMemo(() => (parsed ? parsed.filter(r => !r.error) : []), [parsed]);
  const invalidRows = React.useMemo(() => (parsed ? parsed.filter(r => r.error) : []), [parsed]);

  const doImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    try {
      const count = await FinanceService.bulkAddEntries(
        userId,
        validRows.map(r => r.entry)
      );
      onImported(count);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#0a0b14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-indigo-400" size={18} />
            <h3 className="text-lg font-bold text-white">Import CSV</h3>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="text-xs text-slate-400">
            Columns: <code className="text-indigo-300">date</code> (YYYY-MM-DD),{' '}
            <code className="text-indigo-300">type</code> (revenue|expense),{' '}
            <code className="text-indigo-300">category</code>,{' '}
            <code className="text-indigo-300">amount</code>,{' '}
            <code className="text-indigo-300">note</code> (optional). Max {MAX_ROWS} rows.
          </div>

          <div className="flex gap-2">
            <label className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-dashed border-white/10 text-sm text-slate-300 hover:bg-white/10 cursor-pointer">
              <Upload size={14} /> Upload .csv file
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
            <button
              type="button"
              onClick={loadSample}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm hover:bg-indigo-500/20"
            >
              <Sparkles size={14} /> Try sample data
            </button>
          </div>

          <textarea
            value={csvText}
            onChange={e => {
              setCsvText(e.target.value);
              parse(e.target.value);
            }}
            placeholder="…or paste CSV here"
            className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500/60 resize-none"
          />

          {error && (
            <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              {error}
            </div>
          )}

          {parsed && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  <span className="text-emerald-400 font-bold">{validRows.length}</span> valid ·{' '}
                  <span className="text-rose-400 font-bold">{invalidRows.length}</span> invalid
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-white/5">
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.03] text-slate-400 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Date</th>
                      <th className="text-left px-3 py-2">Type</th>
                      <th className="text-left px-3 py-2">Category</th>
                      <th className="text-right px-3 py-2">£</th>
                      <th className="text-left px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="px-3 py-1.5 text-slate-300 font-mono">{r.entry.entry_date || '—'}</td>
                        <td className="px-3 py-1.5">
                          <span
                            className={
                              r.entry.type === 'revenue' ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {r.entry.type}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-slate-300">{r.entry.category}</td>
                        <td className="px-3 py-1.5 text-right text-slate-200 font-mono">
                          {Number(r.entry.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5">
                          {r.error ? (
                            <span className="text-rose-400" title={r.error}>
                              ✗ {r.error}
                            </span>
                          ) : (
                            <span className="text-emerald-400">✓ ok</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 50 && (
                  <div className="text-center text-[11px] text-slate-500 py-2">
                    …and {parsed.length - 50} more rows
                  </div>
                )}
              </div>
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
            type="button"
            disabled={importing || validRows.length === 0}
            onClick={doImport}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {importing ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              `Import ${validRows.length} rows`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
