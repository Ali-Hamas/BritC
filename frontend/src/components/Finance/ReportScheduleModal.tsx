import React, { useEffect, useState } from 'react';
import { X, Mail, Send, Calendar, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import {
  getReportSchedule,
  setReportSchedule,
  sendReportPreview,
  type ReportCadence,
} from '../../lib/reports';

interface ReportScheduleModalProps {
  open: boolean;
  onClose: () => void;
}

const OPTIONS: { id: ReportCadence; label: string; desc: string; icon: typeof Mail }[] = [
  { id: 'weekly',   label: 'Weekly',   desc: 'Every Monday at 09:00 UTC',   icon: Calendar },
  { id: 'monthly',  label: 'Monthly',  desc: '1st of each month, 09:00 UTC', icon: Clock    },
  { id: 'disabled', label: 'Off',      desc: 'No automatic reports',         icon: X        },
];

export const ReportScheduleModal: React.FC<ReportScheduleModalProps> = ({ open, onClose }) => {
  const [cadence, setCadence] = useState<ReportCadence>('disabled');
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [previewFlash, setPreviewFlash] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setSavedFlash(false);
    setPreviewFlash(false);
    setLoading(true);
    getReportSchedule()
      .then((s) => {
        setCadence(s.cadence);
        setLastSentAt(s.last_sent_at);
      })
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await setReportSchedule(cadence);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    setError('');
    try {
      await sendReportPreview();
      setPreviewFlash(true);
      setTimeout(() => setPreviewFlash(false), 2500);
    } catch (e: any) {
      setError(e.message || 'Failed to send preview');
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[#0a0b14] border border-white/10 shadow-[0_0_60px_-20px_rgba(99,102,241,0.6)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Mail className="text-indigo-400" size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Schedule Reports</h3>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                Automatic finance email summaries
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-slate-500" size={24} />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = cadence === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCadence(opt.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                        selected
                          ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_24px_-12px_rgba(99,102,241,0.6)]'
                          : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          selected
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold ${selected ? 'text-white' : 'text-slate-200'}`}>
                          {opt.label}
                        </div>
                        <div className="text-[11px] text-slate-500">{opt.desc}</div>
                      </div>
                      {selected && (
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {lastSentAt && (
                <p className="text-[11px] text-slate-500 text-center">
                  Last report sent {new Date(lastSentAt).toLocaleString('en-GB')}
                </p>
              )}

              {error && (
                <div className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewing}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all"
                >
                  {previewing ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : previewFlash ? (
                    <>
                      <CheckCircle2 size={14} className="text-emerald-400" /> Sent
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Send preview
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-400 hover:to-fuchsia-400 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/30 disabled:opacity-50 transition-all"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : savedFlash ? (
                    <>
                      <CheckCircle2 size={14} /> Saved
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
