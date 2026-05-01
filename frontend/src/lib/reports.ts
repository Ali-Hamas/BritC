import { getApiUrl } from './api-config';

export type ReportCadence = 'disabled' | 'weekly' | 'monthly';

export interface ReportSchedule {
  cadence: ReportCadence;
  last_sent_at: string | null;
}

export async function getReportSchedule(): Promise<ReportSchedule> {
  const res = await fetch(getApiUrl('/finance/report-schedule'), { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to load schedule (${res.status})`);
  return await res.json();
}

export async function setReportSchedule(cadence: ReportCadence): Promise<void> {
  const res = await fetch(getApiUrl('/finance/report-schedule'), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cadence }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save schedule');
  }
}

export async function sendReportPreview(): Promise<void> {
  const res = await fetch(getApiUrl('/finance/report/preview'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to send preview');
  }
}
