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
  { id: 'weekly',   label: 'Weekly Intelligence',   desc: 'Every Monday, 09:00 UTC dispatch',   icon: Calendar },
  { id: 'monthly',  label: 'Monthly Strategy',  desc: '1st of each month, full audit', icon: Clock    },
  { id: 'disabled', label: 'Off-Grid',      desc: 'No automated transmissions',         icon: X        },
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[32px] bg-white border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-6 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Report Cadence</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Automated Strategic Transmissions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all active:scale-95"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="animate-spin text-blue-600" size={24} />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Schedule...</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = cadence === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCadence(opt.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all group ${
                        selected
                          ? 'bg-blue-50 border-blue-600 shadow-md scale-[1.02]'
                          : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 transition-colors ${
                          selected
                            ? 'bg-white border-blue-200 text-blue-600 shadow-sm'
                            : 'bg-slate-50 border-slate-100 text-slate-400 group-hover:text-slate-600'
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className={`text-sm font-black uppercase tracking-tight ${selected ? 'text-blue-900' : 'text-slate-700'}`}>
                          {opt.label}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{opt.desc}</div>
                      </div>
                      {selected && (
                        <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center shrink-0 shadow-sm">
                          <CheckCircle2 size={12} className="text-white stroke-[3px]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {lastSentAt && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">
                    Latest Deployment: {new Date(lastSentAt).toLocaleString('en-GB')}
                  </p>
                </div>
              )}

              {error && (
                <div className="px-5 py-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-black uppercase tracking-tight shadow-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={previewing}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                  {previewing ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : previewFlash ? (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-500" /> Dispatched
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Force Preview
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : savedFlash ? (
                    <>
                      <CheckCircle2 size={16} /> Committed
                    </>
                  ) : (
                    'Save Directive'
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
