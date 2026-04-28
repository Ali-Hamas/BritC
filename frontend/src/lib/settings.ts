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
  // Google Gemini (free fallback — 1,500 req/day)
  getGeminiApiKey: (): string => {
    return localStorage.getItem('britsee_gemini_api_key') ||
      (import.meta as any).env.VITE_GEMINI_API_KEY ||
      '';
  },
  setGeminiApiKey: (key: string) => {
    localStorage.setItem('britsee_gemini_api_key', key.trim());
  },
  getGeminiModel: (): string => {
    return localStorage.getItem('britsee_gemini_model') || 'gemini-2.0-flash';
  },
  setGeminiModel: (model: string) => {
    localStorage.setItem('britsee_gemini_model', model);
  },
  // Cerebras Cloud (free fallback — extremely fast, 1M tokens/day)
  getCerebrasApiKey: (): string => {
    return localStorage.getItem('britsee_cerebras_api_key') ||
      (import.meta as any).env.VITE_CEREBRAS_API_KEY ||
      'csk-fvy2rtd2ctn9mc8vx5nejxkwvrvwdm23crwm3ec4hyewt6yj';
  },
  setCerebrasApiKey: (key: string) => {
    localStorage.setItem('britsee_cerebras_api_key', key.trim());
  },
  getCerebrasModel: (): string => {
    return localStorage.getItem('britsee_cerebras_model') || 'qwen-3-235b-a22b-instruct-2507';
  },
  setCerebrasModel: (model: string) => {
    localStorage.setItem('britsee_cerebras_model', model);
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
