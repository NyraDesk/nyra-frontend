// electron/modules/openRouterService.js

class OpenRouterService {
  constructor() {
    // Prende la key dal .env, MAI esposta al frontend
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseUrl = 'https://nyra-backend-c7zi.onrender.com/api/ai';
  }

  async chat(messages, options = {}) {
    try {
      // Usa fetch globale di Node.js (già disponibile)
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000', // Porta corretta NYRA
          'X-Title': 'NYRA Desktop'
        },
        body: JSON.stringify({
          model: options.model || 'anthropic/claude-3.5-sonnet',
          messages: messages,
          max_tokens: Math.min(options.max_tokens || 1000, 2000),
          temperature: options.temperature || 0.7
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('[OpenRouter] Errore API:', data);
        throw new Error(data.error?.message || `OpenRouter API error: ${response.status}`);
      }

      // Restituisce solo il contenuto, come si aspetta NYRA
      return data.choices?.[0]?.message?.content || 'Risposta vuota da OpenRouter';
    } catch (error) {
      console.error('[OpenRouter] Errore:', error);
      throw error;
    }
  }

  validateConfiguration() {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY mancante nel .env');
    }
    if (!this.apiKey.startsWith('sk-')) { // Più flessibile
      throw new Error('OPENROUTER_API_KEY formato non valido');
    }
    return true;
  }
}

module.exports = OpenRouterService;
