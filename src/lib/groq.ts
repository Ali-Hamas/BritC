/**
 * Groq Service — Fast cloud AI via Groq API (OpenAI-compatible)
 */
export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ 
    type: 'text' | 'image_url'; 
    text?: string; 
    image_url?: { url: string } 
  }>;
}

export const GroqService = {
  // Proxied via Vite in dev to avoid CORS
  proxyUrl: '/api/groq',

  async chat(messages: GroqMessage[], model: string, apiKey: string): Promise<string> {
    if (!apiKey) throw new Error('Groq API Key is missing. Please add it in Settings.');

    const response = await fetch(this.proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const err = await response.json();
        errorMessage = err.error?.message || err.message || errorMessage;
      } catch (_) {}
      throw new Error(`Groq API Error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response from Groq.';
  }
};
