/**
 * Qwen Service - Alibaba Cloud Model Studio (International)
 * Uses OpenAI-compatible API format via Vite proxy to avoid browser CORS.
 */
export interface QwenMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
}

export const QwenService = {
  // In dev: Vite proxies /api/qwen → dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions
  // In prod: needs a real backend proxy (or use environment variable)
  proxyUrl: '/api/qwen',

  async chat(messages: QwenMessage[], model: string = 'qwen-plus', apiKey: string): Promise<string> {
    if (!apiKey) throw new Error('Qwen API Key is missing. Please add it in Settings.');

    // Use a text-only model if not explicitly vision model
    const safeModel = model === 'qwen-vl-plus' ? 'qwen-plus' : model;

    try {
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: safeModel,
          messages: messages.map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
          })),
        }),
      });

      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch (_) {}
        throw new Error(`Qwen API Error (${response.status}): ${errorMessage}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No response from Qwen.';
    } catch (error: any) {
      console.error('Qwen API Error:', error);
      throw error;
    }
  }
};
