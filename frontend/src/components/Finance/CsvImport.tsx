import React from 'react';
import Papa from 'papaparse';
import { X, Upload, FileSpreadsheet, Loader2, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
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
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between px-6 py-6 border-b border-slate-100 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Bulk Import Ledger</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Deploy data via CSV handshake</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 sm:p-10 space-y-6 overflow-y-auto bg-slate-50/30">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
            <AlertTriangle size={18} className="text-blue-600 mt-0.5 shrink-0" />
            <div className="text-[10px] text-blue-800 font-bold leading-relaxed uppercase tracking-tight">
              Schema Protocol: <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-black">date</code> (YYYY-MM-DD),{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-black">type</code> (revenue|expense),{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-black">category</code>,{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-black">amount</code>,{' '}
              <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-black">note</code>. Capped at {MAX_ROWS} rows.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex-1 flex flex-col items-center justify-center gap-2 py-8 rounded-[24px] bg-white border-2 border-dashed border-slate-200 text-slate-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-all shadow-sm group">
              <Upload size={24} className="group-hover:-translate-y-1 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Select .csv Unit</span>
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
              className="sm:w-64 flex flex-col items-center justify-center gap-2 py-8 rounded-[24px] bg-orange-50 border border-orange-100 text-orange-600 hover:bg-orange-100 transition-all shadow-sm active:scale-95"
            >
              <Sparkles size={24} />
              <span className="text-xs font-black uppercase tracking-widest">Simulate with Sample</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manual Buffer Paste</label>
            <textarea
              value={csvText}
              onChange={e => {
                setCsvText(e.target.value);
                parse(e.target.value);
              }}
              placeholder="Post raw CSV contents here..."
              className="w-full h-40 bg-white border border-slate-200 rounded-2xl p-4 text-xs font-mono text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none shadow-inner placeholder:text-slate-200"
            />
          </div>

          {error && (
            <div className="px-5 py-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-black uppercase tracking-tight shadow-sm">
              {error}
            </div>
          )}

          {parsed && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parse Results</h4>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black shadow-sm">
                    <CheckCircle2 size={10} /> {validRows.length} VALID
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full text-[10px] font-black shadow-sm">
                      <X size={10} /> {invalidRows.length} FAULT
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-inner">
                <table className="w-full text-xs min-w-[600px]">
                  <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-widest border-b border-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">Vector</th>
                      <th className="text-left px-4 py-3">Category</th>
                      <th className="text-right px-4 py-3">Amount (GBP)</th>
                      <th className="text-left px-4 py-3">Integrity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {parsed.slice(0, 100).map((r, i) => (
                      <tr key={i} className={`hover:bg-slate-50 transition-colors ${r.error ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-2.5 text-slate-500 font-mono font-bold tabular-nums">{r.entry.entry_date || '—'}</td>
                        <td className="px-4 py-2.5 uppercase font-black tracking-tight">
                          <span className={r.entry.type === 'revenue' ? 'text-blue-600' : 'text-red-600'}>
                            {r.entry.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-900 font-bold">{r.entry.category}</td>
                        <td className="px-4 py-2.5 text-right text-slate-900 font-black font-mono tabular-nums">
                          £{Number(r.entry.amount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5">
                          {r.error ? (
                            <span className="text-red-600 font-bold flex items-center gap-1" title={r.error}>
                              <AlertTriangle size={12} /> Fault
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 size={12} /> Clear
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 100 && (
                  <div className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-4 bg-slate-50 border-t border-slate-100">
                    … Viewing 100 of {parsed.length} items …
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 px-6 sm:px-8 py-6 border-t border-slate-100 bg-white sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
          >
            Abort Mission
          </button>
          <button
            type="button"
            disabled={importing || validRows.length === 0}
            onClick={doImport}
            className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {importing ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              `Establish ${validRows.length} Ledger Vectors`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
