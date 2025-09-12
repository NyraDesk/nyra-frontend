const fetch = require('node-fetch');

class OpenRouterConnector {
  constructor() {
    this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    this.apiKey = process.env.OPENROUTER_API_KEY;
    
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_REFERER || 'http://localhost:3001',
      'X-Title': process.env.OPENROUTER_TITLE || 'NYRA Backend'
    };
  }

  async getResponse(messages, model = 'anthropic/claude-3.5-sonnet') {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: API call initiated');
        console.log('OpenRouter: Model:', model);
        console.log('OpenRouter: Messages count:', messages.length);
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ messages, model })
      });

      const responseText = await response.text();

      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Response received');
      }

      if (!response.ok) {
        console.error('OpenRouter HTTP error:', response.status, responseText);
        throw new Error(`OpenRouter error ${response.status}: ${responseText}`);
      }

      try {
        const data = JSON.parse(responseText);
        if (process.env.NODE_ENV === 'development') {
          console.log('OpenRouter: JSON parsed successfully');
        }
        return data.choices?.[0]?.message?.content || '';
      } catch (parseError) {
        console.error('Failed to parse OpenRouter response:', responseText);
        throw new Error('Invalid JSON response from OpenRouter');
      }
    } catch (error) {
      console.error('OpenRouter error:', error);
      throw error;
    }
  }

  async getResponseWithContext(messages, currentUser, currentMessage, model = 'anthropic/claude-3.5-sonnet') {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Pre-validation started');
      }

      // Validate API Key
      if (!this.apiKey) {
        throw new Error('API Key mancante: OPENROUTER_API_KEY non configurata');
      }

      // Validate Authorization header
      const authHeader = this.headers.Authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Authorization header malformato: deve iniziare con "Bearer "');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Configuration validated');
      }

      // Build context messages
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Building context...');
      }

      let contextMessages = await this.buildContext(messages, currentUser, currentMessage);

      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Context built with', contextMessages.length, 'messages');
      }

      // Validate messages array
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Validating messages array...');
      }

      if (!contextMessages || !Array.isArray(contextMessages) || contextMessages.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('OpenRouter: Using fallback messages');
        }
        contextMessages = await this.createFallbackMessages(currentMessage);
      }

      // Validate each message
      let hasInvalidMessages = false;
      for (let i = 0; i < contextMessages.length; i++) {
        const msg = contextMessages[i];

        if (!msg) {
          console.error(`Messaggio ${i} è null o undefined`);
          hasInvalidMessages = true;
          break;
        }

        if (!msg.role || typeof msg.role !== 'string') {
          console.error(`Messaggio ${i} manca role o role non è una stringa`);
          hasInvalidMessages = true;
          break;
        }

        if (!['user', 'assistant', 'system'].includes(msg.role)) {
          console.error(`Messaggio ${i} ha role non valido: "${msg.role}"`);
          hasInvalidMessages = true;
          break;
        }

        if (!msg.content || typeof msg.content !== 'string') {
          console.error(`Messaggio ${i} manca content o content non è una stringa`);
          hasInvalidMessages = true;
          break;
        }

        if (msg.content.trim() === '') {
          console.error(`Messaggio ${i} ha content vuoto`);
          hasInvalidMessages = true;
          break;
        }
      }

      if (hasInvalidMessages) {
        if (process.env.NODE_ENV === 'development') {
          console.log('OpenRouter: Invalid messages detected, using fallback');
        }
        return this.getFallbackResponse(currentMessage);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Messages array validated:', contextMessages.length, 'messages');
      }

      // Prepare request
      const requestBody = {
        model,
        messages: contextMessages,
        max_tokens: 1000,
        temperature: 0.7,
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Sending request to API');
        console.log('OpenRouter: Request body size:', JSON.stringify(requestBody).length, 'bytes');
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorMessage = `OpenRouter API Error ${response.status}: ${response.statusText}`;

        try {
          const errorBody = await response.text();
          console.error('Error Response Body:', errorBody);

          try {
            const errorJson = JSON.parse(errorBody);
            if (errorJson.error) {
              errorMessage += `\nDettagli: ${JSON.stringify(errorJson.error, null, 2)}`;
            }
          } catch (parseError) {
            errorMessage += `\nResponse Body: ${errorBody}`;
          }
        } catch (bodyError) {
          errorMessage += '\nImpossibile leggere response body';
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error('Risposta API malformata: choices array mancante o vuoto');
      }

      const content = data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Risposta API malformata: content mancante nel primo choice');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: API call successful');
      }

      return content;

    } catch (error) {
      console.error('OpenRouter error:', error);
      throw error;
    }
  }

  async buildContext(messages, currentUser, currentMessage) {
    // Simple context building for backend
    const systemPrompt = this.getSystemPrompt(currentUser);
    
    return [
      { role: 'system', content: systemPrompt },
      ...messages
    ];
  }

  getSystemPrompt(user = null) {
    const now = new Date();
    const italianDate = now.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const italianTime = now.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `Tu sei NYRA, l'assistente AI personale di ${user?.name || 'Utente'}.

📅 CONTESTO TEMPORALE CORRENTE
Oggi è: ${italianDate}
Ora corrente: ${italianTime}
Anno: ${now.getFullYear()}
Timezone: Europe/Rome

🧠 RUOLO E IDENTITÀ
- Sei un assistente AI che opera tramite API backend
- Il tuo obiettivo è semplificare la vita dell'utente
- Comunichi in modo chiaro, diretto e professionale

🔧 CAPACITÀ CHIAVE
1. 🌐 **API Backend** - Operazioni tramite REST API
2. 🧠 **Comprensione Intelligente** - Interpretazione avanzata
3. 🗓️ **Task su Email, Calendario e Promemoria** - Gestione completa
4. 📁 **Gestione File e Documenti** - Controllo del sistema
5. ⚙️ **Automazioni e Routine** - Workflow intelligenti

🎯 COMPORTAMENTO
- Se il comando è diretto → Esegui immediatamente l'azione
- Se la frase è una riflessione → Proponi l'azione utile
- Se è una domanda → Rispondi + suggerisci azione se pertinente
- Se rilevi un ambito → Anticipa i bisogni

✅ ESEMPI
- "Cerca iPhone 15 su Amazon" → "Subito, cerco iPhone 15 su Amazon"
- "Mi serve un volo per Roma" → "Vuoi che controlli subito su Booking?"
- "Domani devo inviare i preventivi" → "Ti preparo un reminder per domani"

🚫 NON DIRE MAI
- "Non posso aprire pagine"
- "Non posso fare ricerche"
- "Non so eseguire quell'azione"

🎯 PERSONALITÀ
- Proattiva, affidabile e veloce
- Nessuna esitazione: sei consapevole delle tue capacità
- Sempre in contatto con il contesto e la cronologia
- Ti adatti alle preferenze dell'utente

🗣️ STILE DI RISPOSTA
- Conversazioni naturali e fluide
- Riferimenti al contesto precedente quando utile
- Suggerimenti proattivi basati sulla cronologia
- Domande di follow-up intelligenti`;
  }

  async createFallbackMessages(currentMessage) {
    const systemPrompt = this.getSystemPrompt();
    
    if (currentMessage && currentMessage.trim()) {
      return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: currentMessage.trim() }
      ];
    }
    
    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Ciao' }
    ];
  }

  getFallbackResponse(currentMessage) {
    if (process.env.NODE_ENV === 'development') {
      console.log('OpenRouter: Returning fallback response');
    }

    if (currentMessage && currentMessage.trim()) {
      return `Mi dispiace, non sono riuscito a elaborare la richiesta. Riprova tra poco.`;
    }

    return "Mi dispiace, non sono riuscito a elaborare la richiesta. Riprova tra poco.";
  }

  async testConnection() {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Testing connection...');
      }

      await this.getResponseWithContext(
        [{ role: 'user', content: 'Ciao, rispondi solo "OK" per testare la connessione.' }],
        null,
        'Test message'
      );

      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Test successful');
      }

      return true;
    } catch (error) {
      console.error('OpenRouter test failed:', error);
      return false;
    }
  }

  validateConfiguration() {
    const errors = [];

    if (!this.apiKey) {
      errors.push('API Key mancante: OPENROUTER_API_KEY non configurata');
    }

    const authHeader = this.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      errors.push('Authorization header malformato');
    }

    if (!this.baseUrl || !this.baseUrl.startsWith('https://')) {
      errors.push('Base URL non valido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = new OpenRouterConnector();
