export const SettingsService = {
  getLeadHunterApiKey: () => {
    return localStorage.getItem('leadhunter_api_key') ||
      (import.meta as any).env.VITE_LEADHUNTER_API_KEY ||
      '';
  },
  setLeadHunterApiKey: (key: string) => {
    localStorage.setItem('leadhunter_api_key', key);
  },
  getLeadHunterBaseUrl: (): string => {
    return localStorage.getItem('leadhunter_base_url') || 'https://leadhunter.uk';
  },
  setLeadHunterBaseUrl: (url: string) => {
    // Normalize: strip trailing slash
    localStorage.setItem('leadhunter_base_url', url.replace(/\/$/, ''));
  },
  getSchedulingLink: () => {
    return localStorage.getItem('britsee_scheduling_link') || '';
  },
  setSchedulingLink: (link: string) => {
    localStorage.setItem('britsee_scheduling_link', link);
  },
  getAIProvider: (): 'groq' => {
    return 'groq';
  },
  // Groq API Key
  getGroqApiKey: (): string => {
    return localStorage.getItem('britsee_groq_api_key') ||
      (import.meta as any).env.VITE_GROQ_API_KEY ||
      '';
  },
  setGroqApiKey: (key: string) => {
    localStorage.setItem('britsee_groq_api_key', key.trim());
  },
  getGroqModel: (): string => {
    return localStorage.getItem('britsee_groq_model') || 'llama-3.3-70b-versatile';
  },
  setGroqModel: (model: string) => {
    localStorage.setItem('britsee_groq_model', model);
  },
  // OpenRouter (fallback provider)
  getOpenRouterApiKey: (): string => {
    return localStorage.getItem('britsee_openrouter_api_key') ||
      (import.meta as any).env.VITE_OPENROUTER_API_KEY ||
      '';
  },
  setOpenRouterApiKey: (key: string) => {
    localStorage.setItem('britsee_openrouter_api_key', key.trim());
  },
  getOpenRouterModel: (): string => {
    return localStorage.getItem('britsee_openrouter_model') || 'deepseek/deepseek-chat-v3-0324:free';
  },
  setOpenRouterModel: (model: string) => {
    localStorage.setItem('britsee_openrouter_model', model);
  },
  getGlobalSystemPrompt: () => localStorage.getItem('britsee_global_system_prompt') || '',
  setGlobalSystemPrompt: (prompt: string) => localStorage.setItem('britsee_global_system_prompt', prompt),
  getSystemPrompt: (): string => {
    return localStorage.getItem('britsee_system_prompt') || '';
  },
  setSystemPrompt: (prompt: string) => {
    localStorage.setItem('britsee_system_prompt', prompt);
  },
  getBossDirectives: (): string => {
    return localStorage.getItem('britsee_boss_directives') || 'Always prioritize client success and maintain a professional, proactive tone.';
  },
  setBossDirectives: (directives: string) => {
    localStorage.setItem('britsee_boss_directives', directives);
  }
};
