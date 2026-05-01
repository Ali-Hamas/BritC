// Personal finance style — biases the Scenario Simulator defaults and the
// AI commentary tone. Stored per-user in localStorage; no backend column
// needed since this is a UX preference, not a security boundary.

export type FinanceStyle = 'conservative' | 'balanced' | 'aggressive';

export const FINANCE_STYLE_LABELS: Record<FinanceStyle, string> = {
  conservative: 'Conservative',
  balanced:     'Balanced',
  aggressive:   'Aggressive',
};

export const FINANCE_STYLE_DESCRIPTIONS: Record<FinanceStyle, string> = {
  conservative: 'Cautious projections. Highlights runway, anomalies, and downside risk first.',
  balanced:     'Default tone. Even mix of growth opportunities and caution.',
  aggressive:   'Growth-first. Larger default bets in scenario planning, optimistic framing.',
};

const KEY_PREFIX = 'britsync_finance_style_';
const DEFAULT: FinanceStyle = 'balanced';

export function getFinanceStyle(userId: string | null | undefined): FinanceStyle {
  if (!userId || typeof window === 'undefined') return DEFAULT;
  const raw = localStorage.getItem(KEY_PREFIX + userId);
  if (raw === 'conservative' || raw === 'balanced' || raw === 'aggressive') return raw;
  return DEFAULT;
}

export function setFinanceStyle(userId: string, style: FinanceStyle): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY_PREFIX + userId, style);
}

// Defaults for the Scenario Simulator sliders. Conservative users see a
// modest hire and zero revenue lift pre-loaded; aggressive users see a
// growth-mode preset they can dial back.
export interface ScenarioStyleDefaults {
  revenuePct: number;
  expensePct: number;
  newHeadcount: number;
  salaryPerHire: number;
}

export function getScenarioDefaults(style: FinanceStyle): ScenarioStyleDefaults {
  switch (style) {
    case 'conservative':
      return { revenuePct: 0,  expensePct: -10, newHeadcount: 0, salaryPerHire: 3000 };
    case 'aggressive':
      return { revenuePct: 25, expensePct: 10,  newHeadcount: 2, salaryPerHire: 4500 };
    case 'balanced':
    default:
      return { revenuePct: 0,  expensePct: 0,   newHeadcount: 0, salaryPerHire: 3500 };
  }
}

// Tone fragment injected into AI narrative prompts. Keep it short — the
// caller appends this to a larger system prompt.
export function getNarrativeStyleHint(style: FinanceStyle): string {
  switch (style) {
    case 'conservative':
      return 'The user prefers a conservative tone. Lead with risks, runway, and anomalies. Suggest cost discipline before growth.';
    case 'aggressive':
      return 'The user prefers a growth-first tone. Lead with revenue opportunities and expansion plays. Mention risks briefly at the end.';
    case 'balanced':
    default:
      return 'Use a balanced tone — equal weight to opportunities and risks.';
  }
}
