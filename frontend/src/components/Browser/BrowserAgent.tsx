import React, { useEffect, useState } from 'react';
import {
  Globe, Loader2, MousePointerClick, Type, ArrowDown, Camera, ExternalLink,
  CheckCircle2, XCircle, Plug, PlugZap, FileText, Trash2, RefreshCw,
} from 'lucide-react';
import { ext, isExtensionInstalled, EXTENSION_INSTALL_URL } from '../../lib/extension';

interface LogEntry {
  id: number;
  ts: string;
  ok: boolean;
  action: string;
  detail: string;
}

export const BrowserAgent: React.FC = () => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const [openUrl, setOpenUrl] = useState('https://youtube.com');
  const [navUrl, setNavUrl] = useState('');
  const [clickText, setClickText] = useState('');
  const [clickSelector, setClickSelector] = useState('');
  const [typeSelector, setTypeSelector] = useState('');
  const [typeValue, setTypeValue] = useState('');
  const [scrollAmount, setScrollAmount] = useState(600);

  const [busy, setBusy] = useState<string | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [pageText, setPageText] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const checkConnection = async () => {
    setChecking(true);
    const ok = await isExtensionInstalled();
    setConnected(ok);
    setChecking(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const log = (action: string, ok: boolean, detail: string) => {
    setLogs((prev) => [
      { id: Date.now() + Math.random(), ts: new Date().toLocaleTimeString(), ok, action, detail },
      ...prev,
    ].slice(0, 30));
  };

  const run = async (label: string, fn: () => Promise<any>) => {
    setBusy(label);
    try {
      const res = await fn();
      const detail = res?.error
        ? res.error
        : typeof res?.result === 'object'
        ? JSON.stringify(res.result).slice(0, 140)
        : String(res?.result ?? 'ok');
      log(label, !!res?.ok, detail);
      return res;
    } catch (err: any) {
      log(label, false, err?.message || 'failed');
    } finally {
      setBusy(null);
    }
  };

  const handleOpen = () => run('Open Tab', () => ext.openTab(openUrl, true));
  const handleNavigate = () => run('Navigate', () => ext.navigate(navUrl));
  const handleClick = () =>
    run('Click', () => ext.click({ selector: clickSelector || undefined, text: clickText || undefined }));
  const handleType = () => run('Type', () => ext.type({ selector: typeSelector, value: typeValue }));
  const handleScroll = () => run('Scroll', () => ext.scroll(scrollAmount));
  const handleScreenshot = async () => {
    const res = await run('Screenshot', () => ext.screenshot());
    if (res?.ok && res.result?.dataUrl) setShotUrl(res.result.dataUrl);
  };
  const handlePageText = async () => {
    const res = await run('Read Page', () => ext.getPageText());
    if (res?.ok && res.result?.text) setPageText(res.result.text);
  };

  if (connected === null || checking) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <Loader2 className="animate-spin text-indigo-400" size={28} />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12">
        <div className="glass-card p-6 sm:p-8 md:p-10 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 border border-white/10 flex items-center justify-center">
            <Plug className="text-indigo-300" size={32} />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Britsync Companion not detected
          </h2>
          <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
            Browser Agent needs the Britsync Companion Chrome extension to control your browser.
            Install it once, then reload this page.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={EXTENSION_INSTALL_URL}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-fuchsia-500 hover:from-indigo-500 hover:to-fuchsia-400 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all"
            >
              <ExternalLink size={16} />
              Install extension
            </a>
            <button
              onClick={checkConnection}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl font-bold text-sm transition-all"
            >
              <RefreshCw size={16} />
              Check again
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-6 leading-relaxed">
            Internal testers: load the unpacked extension from{' '}
            <code className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
              britsync-extension/
            </code>{' '}
            via <code className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">chrome://extensions</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-6 sm:mb-8 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Globe className="text-indigo-400" size={26} />
            Browser Agent
          </h1>
          <p className="text-slate-400 text-sm">
            Control your browser through the Britsync Companion extension.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold shrink-0">
          <PlugZap size={14} />
          Companion connected
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Controls */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          {/* Open / navigate */}
          <Card icon={<Globe size={18} className="text-indigo-400" />} title="Tabs">
            <div className="space-y-3">
              <Field label="Open new tab">
                <input
                  className="input"
                  value={openUrl}
                  onChange={(e) => setOpenUrl(e.target.value)}
                  placeholder="https://youtube.com"
                />
                <Btn onClick={handleOpen} loading={busy === 'Open Tab'}>Open</Btn>
              </Field>
              <Field label="Navigate active tab">
                <input
                  className="input"
                  value={navUrl}
                  onChange={(e) => setNavUrl(e.target.value)}
                  placeholder="https://example.com"
                />
                <Btn onClick={handleNavigate} loading={busy === 'Navigate'} disabled={!navUrl}>Go</Btn>
              </Field>
            </div>
          </Card>

          {/* Click */}
          <Card icon={<MousePointerClick size={18} className="text-fuchsia-400" />} title="Click">
            <div className="space-y-3">
              <Field label="Click element by visible text">
                <input
                  className="input"
                  value={clickText}
                  onChange={(e) => setClickText(e.target.value)}
                  placeholder="e.g. Sign in"
                />
              </Field>
              <Field label="…or by CSS selector">
                <input
                  className="input"
                  value={clickSelector}
                  onChange={(e) => setClickSelector(e.target.value)}
                  placeholder="e.g. button.primary"
                />
                <Btn
                  onClick={handleClick}
                  loading={busy === 'Click'}
                  disabled={!clickText && !clickSelector}
                >
                  Click
                </Btn>
              </Field>
            </div>
          </Card>

          {/* Type */}
          <Card icon={<Type size={18} className="text-emerald-400" />} title="Type">
            <Field label="CSS selector">
              <input
                className="input"
                value={typeSelector}
                onChange={(e) => setTypeSelector(e.target.value)}
                placeholder="e.g. input[name='q']"
              />
            </Field>
            <Field label="Text">
              <input
                className="input"
                value={typeValue}
                onChange={(e) => setTypeValue(e.target.value)}
                placeholder="What to type"
              />
              <Btn onClick={handleType} loading={busy === 'Type'} disabled={!typeSelector || !typeValue}>
                Type
              </Btn>
            </Field>
          </Card>

          {/* Scroll + capture */}
          <Card icon={<ArrowDown size={18} className="text-amber-400" />} title="Scroll & Capture">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex gap-2">
                <input
                  className="input"
                  type="number"
                  value={scrollAmount}
                  onChange={(e) => setScrollAmount(Number(e.target.value) || 0)}
                />
                <Btn onClick={handleScroll} loading={busy === 'Scroll'}>Scroll</Btn>
              </div>
              <Btn onClick={handleScreenshot} loading={busy === 'Screenshot'}>
                <Camera size={14} /> Screenshot
              </Btn>
              <Btn onClick={handlePageText} loading={busy === 'Read Page'}>
                <FileText size={14} /> Read Page
              </Btn>
            </div>
          </Card>

          {/* Outputs */}
          {shotUrl && (
            <Card icon={<Camera size={18} className="text-amber-400" />} title="Last Screenshot">
              <img
                src={shotUrl}
                alt="Active tab screenshot"
                className="w-full rounded-xl border border-white/10"
              />
            </Card>
          )}
          {pageText && (
            <Card icon={<FileText size={18} className="text-emerald-400" />} title="Page Text">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap bg-black/30 border border-white/5 rounded-xl p-3 max-h-72 overflow-y-auto">
                {pageText}
              </pre>
            </Card>
          )}
        </div>

        {/* Activity log */}
        <div className="space-y-3">
          <Card
            icon={<RefreshCw size={18} className="text-slate-400" />}
            title="Activity"
            action={
              logs.length ? (
                <button
                  onClick={() => setLogs([])}
                  className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1"
                >
                  <Trash2 size={12} /> Clear
                </button>
              ) : null
            }
          >
            {logs.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                Run an action to see results here.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                {logs.map((l) => (
                  <li
                    key={l.id}
                    className={`flex items-start gap-2 text-[11px] p-2.5 rounded-lg border ${
                      l.ok
                        ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-200'
                        : 'bg-rose-500/5 border-rose-500/15 text-rose-200'
                    }`}
                  >
                    {l.ok ? (
                      <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle size={13} className="text-rose-400 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-bold flex items-center gap-2">
                        <span>{l.action}</span>
                        <span className="text-slate-500 font-normal">{l.ts}</span>
                      </div>
                      <div className="text-slate-400 break-words">{l.detail}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

const Card: React.FC<{
  icon?: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ icon, title, action, children }) => (
  <div className="glass-card p-4 sm:p-5">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
      {label}
    </label>
    <div className="flex flex-col sm:flex-row gap-2">{children}</div>
  </div>
);

const Btn: React.FC<{
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ onClick, loading, disabled, children }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-500 hover:from-indigo-500 hover:to-fuchsia-400 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
  >
    {loading ? <Loader2 size={14} className="animate-spin" /> : null}
    {children}
  </button>
);

const _styles = `
.input {
  flex: 1 1 auto;
  width: 100%;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 0.75rem;
  padding: 0.625rem 0.875rem;
  font-size: 0.8125rem;
  color: #e2e8f0;
  outline: none;
  transition: all 0.2s;
}
.input:focus { border-color: rgba(129,140,248,0.6); box-shadow: 0 0 0 3px rgba(129,140,248,0.15); }
.input::placeholder { color: #64748b; }
`;

if (typeof document !== 'undefined' && !document.getElementById('browser-agent-styles')) {
  const tag = document.createElement('style');
  tag.id = 'browser-agent-styles';
  tag.textContent = _styles;
  document.head.appendChild(tag);
}

export default BrowserAgent;
