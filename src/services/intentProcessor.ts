import { N8NConnector, N8NActionRequest } from './n8nConnector';
import { getNow } from './clock';

export class IntentProcessor {
  private n8n: N8NConnector;

  constructor() {
    this.n8n = new N8NConnector();
  }

  async processUserMessage(message: string): Promise<string> {
    const intent = this.analyzeIntent(message);
    
    // Gestione domande temporali - risposta locale senza LLM
    if (intent.type === 'clock_query') {
      return this.handleClockQuery(intent.parameters.message);
    }
    
    if (intent.requiresAction) {
      const request: N8NActionRequest = {
        intent: intent.type,
        query: message,
        parameters: intent.parameters,
        sessionId: this.generateSessionId()
      };

      const response = await this.n8n.executeAction(request);
      
      if (response.success) {
        return this.formatSuccessResponse(response);
      } else {
        return this.formatErrorResponse(response);
      }
    } else {
      return await this.generateConversationalResponse(message);
    }
  }

  private analyzeIntent(message: string) {
    const lowerMessage = message.toLowerCase();
    
    // Clock/time questions - risposta locale senza LLM
    if (this.matchesClockIntent(lowerMessage)) {
      return {
        type: 'clock_query',
        requiresAction: false,
        parameters: { message: lowerMessage }
      };
    }
    
    // Hotel search patterns
    if (this.matchesHotelIntent(lowerMessage)) {
      return {
        type: 'hotel_search',
        requiresAction: true,
        parameters: this.extractHotelParams(message)
      };
    }
    
    // Flight search patterns
    if (this.matchesFlightIntent(lowerMessage)) {
      return {
        type: 'flight_search',
        requiresAction: true,
        parameters: this.extractFlightParams(message)
      };
    }
    
    // Product search patterns
    if (this.matchesProductIntent(lowerMessage)) {
      return {
        type: 'product_search',
        requiresAction: true,
        parameters: this.extractProductParams(message)
      };
    }

    // Train search patterns
    if (this.matchesTrainIntent(lowerMessage)) {
      return {
        type: 'train_search',
        requiresAction: true,
        parameters: this.extractTrainParams(message)
      };
    }

    // Recipe search patterns
    if (this.matchesRecipeIntent(lowerMessage)) {
      return {
        type: 'recipe_search',
        requiresAction: true,
        parameters: this.extractRecipeParams(message)
      };
    }
    
    // Default conversational
    return {
      type: 'conversation',
      requiresAction: false,
      parameters: {}
    };
  }

  private matchesHotelIntent(message: string): boolean {
    return (message.includes('hotel') || message.includes('albergo') || message.includes('struttura')) && 
           (message.includes('cerca') || message.includes('prenota') || message.includes('trova'));
  }

  private matchesFlightIntent(message: string): boolean {
    return message.includes('volo') || message.includes('aereo') || message.includes('biglietto');
  }

  private matchesProductIntent(message: string): boolean {
    return message.includes('cerca') && 
           (message.includes('amazon') || message.includes('prodotto') || message.includes('acquista'));
  }

  private matchesTrainIntent(message: string): boolean {
    return message.includes('treno') || message.includes('trenitalia') || message.includes('italo');
  }

  private matchesRecipeIntent(message: string): boolean {
    return message.includes('ricetta') || message.includes('cucinare') || message.includes('ingredienti');
  }
  
  private matchesClockIntent(message: string): boolean {
    return /(che\s+(giorno|data)\s+è\s+(oggi)?|che\s+ore\s+sono)/i.test(message);
  }
  
  private async handleClockQuery(message: string): Promise<string> {
    const now = getNow();
    
    // Import dinamico per evitare require
    const timeModule = await import('./time');
    const tz = timeModule.getLocalTZ();
    const todayStr = timeModule.formatDateIT(now.now, tz);
    const lowerMessage = message.toLowerCase();
    
    console.log('[NYRA][CLOCK] answered locally for:', message);
    
    if (lowerMessage.includes('ore') || lowerMessage.includes('ora')) {
      return `Sono le ${timeModule.formatTimeIT(now.now, tz)} (${tz}).`;
    } else {
      return `Oggi è ${todayStr}. Posso aiutarti a pianificare qualcosa?`;
    }
  }

  private extractHotelParams(message: string) {
    const cityMatch = message.match(/(roma|milano|firenze|venezia|napoli|torino|palermo|genova|bologna|catania)/i);
    const datesMatch = message.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/g);
    const guestsMatch = message.match(/(\d+)\s*(persona|persone|ospiti|adulti)/i);
    
    return {
      destination: cityMatch ? cityMatch[1] : null,
      checkIn: datesMatch ? datesMatch[0] : null,
      checkOut: datesMatch && datesMatch[1] ? datesMatch[1] : null,
      guests: guestsMatch ? parseInt(guestsMatch[1]) : 1,
      query: message
    };
  }

  private extractFlightParams(message: string) {
    const cities = message.match(/(roma|milano|firenze|venezia|napoli|torino|palermo|genova|bologna|catania|parigi|londra|barcellona|amsterdam|berlino)/gi);
    const datesMatch = message.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/g);
    
    return {
      origin: cities ? cities[0] : null,
      destination: cities && cities[1] ? cities[1] : null,
      departureDate: datesMatch ? datesMatch[0] : null,
      returnDate: datesMatch && datesMatch[1] ? datesMatch[1] : null,
      query: message
    };
  }

  private extractProductParams(message: string) {
    const priceMatch = message.match(/(\d+)\s*(euro|€|dollari|\$)/i);
    const categoryMatch = message.match(/(libro|elettronica|abbigliamento|casa|giardino|sport)/i);
    
    return {
      searchTerm: message.replace(/(cerca|amazon|prodotto|acquista)/gi, '').trim(),
      maxPrice: priceMatch ? parseInt(priceMatch[1]) : null,
      category: categoryMatch ? categoryMatch[1] : null,
      query: message
    };
  }

  private extractTrainParams(message: string) {
    const cities = message.match(/(roma|milano|firenze|venezia|napoli|torino|palermo|genova|bologna|catania)/gi);
    const datesMatch = message.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/g);
    const timeMatch = message.match(/(\d{1,2}):(\d{2})/);
    
    return {
      origin: cities ? cities[0] : null,
      destination: cities && cities[1] ? cities[1] : null,
      date: datesMatch ? datesMatch[0] : null,
      time: timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : null,
      query: message
    };
  }

  private extractRecipeParams(message: string) {
    const ingredientsMatch = message.match(/(con|usando|ingredienti)\s+([^.!?]+)/i);
    const cuisineMatch = message.match(/(italiana|francese|cinese|messicana|indiana|greca)/i);
    
    return {
      ingredients: ingredientsMatch ? ingredientsMatch[2].trim() : null,
      cuisine: cuisineMatch ? cuisineMatch[1] : null,
      query: message
    };
  }

  private formatSuccessResponse(response: any): string {
    if (response.data && typeof response.data === 'object') {
      return `✅ ${response.message}\n\n${this.formatResponseData(response.data)}`;
    }
    return `✅ ${response.message}`;
  }

  private formatResponseData(data: any): string {
    if (data.results && Array.isArray(data.results)) {
      return data.results.slice(0, 3).map((item: any, index: number) => 
        `${index + 1}. ${item.title || item.name || 'Risultato'}\n   ${item.description || item.details || ''}`
      ).join('\n\n');
    }
    
    if (data.url) {
      return `🔗 Link: ${data.url}`;
    }
    
    return data.summary || JSON.stringify(data, null, 2);
  }

  private formatErrorResponse(response: any): string {
    const fallbackMessages = [
      "Mi dispiace, non sono riuscito a completare la richiesta al momento.",
      "C'è stato un problema con l'elaborazione. Puoi riprovare?",
      "Servizio temporaneamente non disponibile. Riprova tra poco.",
      "Non riesco a connettermi al servizio richiesto."
    ];
    
    const randomMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    return `❌ ${randomMessage}`;
  }

  private async generateConversationalResponse(message: string): Promise<string> {
    try {
      // Usa OpenRouter per generare risposte naturali
      const { openRouter } = await import('./openrouter');
      
      const response = await openRouter.getResponse([
        { role: 'user', content: message }
      ]);
      
      return response;
    } catch (error) {
      console.error('Errore OpenRouter:', error);
      return 'Mi dispiace, non sono riuscito a elaborare la richiesta. Riprova tra poco.';
    }
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async testN8NConnection(): Promise<boolean> {
    return await this.n8n.testConnection();
  }
}