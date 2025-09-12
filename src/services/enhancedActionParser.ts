import { electronBridge } from './electronBridge';

export interface ParsedAction {
  type: string;
  action: string;
  parameters: any;
  confidence: number;
  context?: AutomationContext;
}

export interface AutomationContext {
  lastIntent: string;
  lastParameters: any;
  timestamp: number;
  conversationId: string;
}

export interface IntentDetection {
  intent: string;
  confidence: number;
  parameters: any;
  requiresContext: boolean;
}

export class EnhancedActionParser {
  private contextMemory: Map<string, AutomationContext> = new Map();
  
  // Safe validation check
  private isValidMessage(message: any): boolean {
    return message && 
           typeof message === 'string' && 
           message.trim().length > 0;
  }
  
  // Safe string operations
  private safeStringOperation(operation: () => string, fallback: string = ''): string {
    try {
      return operation();
    } catch (error) {
      console.warn('String operation failed:', error);
      return fallback;
    }
  }
  
  // Pre-validation check
  private preValidateMessage(message: any): string | null {
    if (!this.isValidMessage(message)) {
      console.warn('Invalid message received:', message);
      return null;
    }
    
    return this.safeStringOperation(() => message.trim().toLowerCase());
  }
  
  // Lightweight semantic parser
  private detectIntent(message: string): IntentDetection {
    const intentKeywords = {
      'search': ['cerca', 'trova', 'ricerca', 'controlla', 'cercare', 'trovare'],
      'train': ['treno', 'trenitalia', 'biglietto', 'viaggio', 'stazione'],
      'phone': ['iphone', 'telefono', 'smartphone', 'cellulare', 'mobile'],
      'open': ['apri', 'apre', 'aprire', 'vai su', 'naviga'],
      'email': ['email', 'mail', 'posta', 'messaggio'],
      'reminder': ['promemoria', 'ricorda', 'ricordami', 'appuntamento'],
      'booking': ['prenota', 'prenotazione', 'hotel', 'albergo', 'booking'],
      'shopping': ['compra', 'acquista', 'negozio', 'amazon', 'ebay'],
      'weather': ['meteo', 'tempo', 'clima', 'previsioni'],
      'news': ['notizie', 'giornale', 'repubblica', 'corriere'],
      'social': ['facebook', 'instagram', 'linkedin', 'twitter', 'social']
    };
    
    let bestIntent = 'unknown';
    let bestConfidence = 0;
    let parameters = {};
    
    // Check each intent category
    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          const confidence = this.calculateKeywordConfidence(message, keyword);
          if (confidence > bestConfidence) {
            bestIntent = intent;
            bestConfidence = confidence;
            parameters = this.extractParameters(message, intent);
          }
        }
      }
    }
    
    // Check if context is needed
    const requiresContext = this.needsContext(message, bestIntent);
    
    return {
      intent: bestIntent,
      confidence: bestConfidence,
      parameters,
      requiresContext
    };
  }
  
  private calculateKeywordConfidence(message: string, keyword: string): number {
    const keywordIndex = message.indexOf(keyword);
    if (keywordIndex === -1) return 0;
    
    // Higher confidence if keyword is at the beginning
    const positionBonus = 1 - (keywordIndex / message.length);
    
    // Higher confidence for longer keywords
    const lengthBonus = keyword.length / 10;
    
    return Math.min(0.9, positionBonus + lengthBonus);
  }
  
  private extractParameters(message: string, intent: string): any {
    const parameters: any = {};
    
    switch (intent) {
      case 'train':
        // Extract train-specific parameters
        const trainPatterns = {
          from: /(da|partenza|da)\s+([a-zA-Z\s]+?)(?:\s+(?:a|per|verso))/i,
          to: /(a|per|verso)\s+([a-zA-Z\s]+?)(?:\s+(?:il|il giorno|quando))/i,
          date: /(il|il giorno|quando)\s+([0-9]{1,2}\/[0-9]{1,2}|oggi|domani|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)/i
        };
        
        for (const [key, pattern] of Object.entries(trainPatterns)) {
          const match = message.match(pattern);
          if (match) {
            parameters[key] = match[2].trim();
          }
        }
        break;
        
      case 'phone':
        // Extract phone-specific parameters
        const phonePatterns = {
          model: /(iphone\s+\d+|samsung|huawei|xiaomi|oneplus|google\s+pixel)/i,
          feature: /(camera|batteria|memoria|schermo|prezzo)/i
        };
        
        for (const [key, pattern] of Object.entries(phonePatterns)) {
          const match = message.match(pattern);
          if (match) {
            parameters[key] = match[1].trim();
          }
        }
        break;
        
      case 'search':
        // Extract search query
        const searchMatch = message.match(/(?:cerca|trova|ricerca)\s+(.+?)(?:\s+(?:su|su amazon|su google))?/i);
        if (searchMatch) {
          parameters.query = searchMatch[1].trim();
        }
        break;
    }
    
    return parameters;
  }
  
  private needsContext(message: string, intent: string): boolean {
    // Check if message is incomplete and needs context
    const incompletePatterns = [
      /\b(va bene|ok|perfetto|sì)\b/i,
      /\b(centrale|stazione|aeroporto)\b/i,
      /\b(apri|vai su)\s+[a-zA-Z]+$/i
    ];
    
    const isIncomplete = incompletePatterns.some(pattern => pattern.test(message));
    
    // Some intents always need context
    const contextRequiredIntents = ['train', 'booking', 'reminder'];
    
    return isIncomplete || contextRequiredIntents.includes(intent);
  }
  
  // Context management
  private getContext(conversationId: string): AutomationContext | null {
    return this.contextMemory.get(conversationId) || null;
  }
  
  private setContext(conversationId: string, context: AutomationContext): void {
    this.contextMemory.set(conversationId, context);
  }
  
  private completeWithContext(message: string, intent: string, conversationId: string): ParsedAction | null {
    const context = this.getContext(conversationId);
    
    if (!context || context.lastIntent !== intent) {
      return null;
    }
    
    // Merge current message with context
    const mergedParameters = { ...context.lastParameters };
    
    // Extract new parameters from current message
    const newParameters = this.extractParameters(message, intent);
    Object.assign(mergedParameters, newParameters);
    
    return {
      type: 'context_completion',
      action: this.getActionForIntent(intent),
      parameters: mergedParameters,
      confidence: 0.8,
      context
    };
  }
  
  private getActionForIntent(intent: string): string {
    const actionMap: { [key: string]: string } = {
      'search': 'search_on_site',
      'train': 'book_train',
      'phone': 'search_phone',
      'open': 'navigate_site',
      'email': 'send_email',
      'reminder': 'create_reminder',
      'booking': 'book_hotel',
      'shopping': 'search_products',
      'weather': 'check_weather',
      'news': 'get_news',
      'social': 'navigate_social'
    };
    
    return actionMap[intent] || 'unknown_action';
  }
  
  // Main parsing function
  parseMessage(message: any, conversationId: string = 'default'): ParsedAction | null {
    // Safe pre-validation
    const validatedMessage = this.preValidateMessage(message);
    if (!validatedMessage) {
      return null;
    }
    
    // Detect intent
    const intentDetection = this.detectIntent(validatedMessage);
    
    // Check if context is needed
    if (intentDetection.requiresContext) {
      const contextCompletion = this.completeWithContext(
        validatedMessage, 
        intentDetection.intent, 
        conversationId
      );
      
      if (contextCompletion) {
        return contextCompletion;
      }
    }
    
    // Create action
    const action = this.createAction(intentDetection, validatedMessage, conversationId);
    
    // Store context for future use
    if (action && intentDetection.confidence > 0.6) {
      this.setContext(conversationId, {
        lastIntent: intentDetection.intent,
        lastParameters: action.parameters,
        timestamp: Date.now(),
        conversationId
      });
    }
    
    return action;
  }
  
  private createAction(intentDetection: IntentDetection, message: string, conversationId: string): ParsedAction | null {
    const { intent, confidence, parameters } = intentDetection;
    
    if (confidence < 0.3) {
      return null;
    }
    
    // Handle incomplete messages
    if (intentDetection.requiresContext && confidence < 0.6) {
      return {
        type: 'incomplete_request',
        action: 'ask_clarification',
        parameters: {
          originalMessage: message,
          detectedIntent: intent,
          confidence
        },
        confidence: 0.5
      };
    }
    
    // Create specific actions based on intent
    switch (intent) {
      case 'train':
        return this.createTrainAction(parameters, message, conversationId);
      case 'phone':
        return this.createPhoneAction(parameters, message);
      case 'search':
        return this.createSearchAction(parameters, message);
      case 'open':
        return this.createOpenAction(parameters, message);
      case 'email':
        return this.createEmailAction(parameters, message);
      case 'reminder':
        return this.createReminderAction(parameters, message);
      default:
        return this.createGenericAction(intent, parameters, message);
    }
  }
  
  private createTrainAction(parameters: any, message: string, conversationId: string): ParsedAction {
    const context = this.getContext(conversationId);
    
    // If we have incomplete train booking, ask for missing info
    if (!parameters.from && !parameters.to) {
      return {
        type: 'train_booking',
        action: 'ask_train_details',
        parameters: {
          message: 'Non ho capito cosa intendi. Vuoi cercare un treno o aprire Trenitalia?',
          originalMessage: message,
          context
        },
        confidence: 0.6
      };
    }
    
    return {
      type: 'train_booking',
      action: 'book_train',
      parameters: {
        from: parameters.from || context?.lastParameters?.from,
        to: parameters.to || context?.lastParameters?.to,
        date: parameters.date || context?.lastParameters?.date || 'oggi',
        originalMessage: message
      },
      confidence: 0.8
    };
  }
  
  private createPhoneAction(parameters: any, message: string): ParsedAction {
    return {
      type: 'product_search',
      action: 'search_phone',
      parameters: {
        query: parameters.model || 'smartphone',
        feature: parameters.feature,
        site: 'amazon.com',
        originalMessage: message
      },
      confidence: 0.7
    };
  }
  
  private createSearchAction(parameters: any, message: string): ParsedAction {
    return {
      type: 'universal_automation',
      action: 'search_on_site',
      parameters: {
        query: parameters.query || this.extractSearchQuery(message),
        website: this.detectWebsite(message) || 'google.com',
        originalMessage: message
      },
      confidence: 0.8
    };
  }
  
  private createOpenAction(parameters: any, message: string): ParsedAction {
    const website = this.detectWebsite(message);
    
    return {
      type: 'universal_automation',
      action: 'navigate_only',
      parameters: {
        website: website || 'google.com',
        originalMessage: message
      },
      confidence: 0.7
    };
  }
  
  private createEmailAction(parameters: any, message: string): ParsedAction {
    return {
      type: 'app_action',
      action: 'open_mail',
      parameters: {
        originalMessage: message
      },
      confidence: 0.8
    };
  }
  
  private createReminderAction(parameters: any, message: string): ParsedAction {
    return {
      type: 'reminder_action',
      action: 'create_reminder',
      parameters: {
        text: this.extractReminderText(message),
        originalMessage: message
      },
      confidence: 0.7
    };
  }
  
  private createGenericAction(intent: string, parameters: any, message: string): ParsedAction {
    return {
      type: 'generic_action',
      action: 'unknown_action',
      parameters: {
        intent,
        originalMessage: message,
        parameters
      },
      confidence: 0.5
    };
  }
  
  // Helper methods
  private extractSearchQuery(message: string): string {
    const searchMatch = message.match(/(?:cerca|trova|ricerca)\s+(.+?)(?:\s+(?:su|su amazon|su google))?/i);
    return searchMatch ? searchMatch[1].trim() : message;
  }
  
  private detectWebsite(message: string): string {
    const websitePatterns = [
      { pattern: /amazon/i, website: 'amazon.com' },
      { pattern: /google/i, website: 'google.com' },
      { pattern: /trenitalia/i, website: 'trenitalia.com' },
      { pattern: /booking/i, website: 'booking.com' },
      { pattern: /netflix/i, website: 'netflix.com' },
      { pattern: /youtube/i, website: 'youtube.com' },
      { pattern: /facebook/i, website: 'facebook.com' },
      { pattern: /instagram/i, website: 'instagram.com' }
    ];
    
    for (const { pattern, website } of websitePatterns) {
      if (pattern.test(message)) {
        return website;
      }
    }
    
    return 'google.com'; // Default fallback
  }
  
  private extractReminderText(message: string): string {
    const reminderMatch = message.match(/(?:ricorda|ricordami|promemoria)\s+(.+)/i);
    return reminderMatch ? reminderMatch[1].trim() : message;
  }
  
  // Execute action
  async executeAction(parsedAction: ParsedAction): Promise<any> {
    if (!parsedAction) {
      return { success: false, message: 'Nessuna azione da eseguire' };
    }
    
    try {
      switch (parsedAction.type) {
        case 'universal_automation':
          return await this.executeUniversalAutomation(parsedAction);
        case 'train_booking':
          return await this.executeTrainBooking(parsedAction);
        case 'product_search':
          return await this.executeProductSearch(parsedAction);
        case 'app_action':
          return await this.executeAppAction(parsedAction);
        case 'reminder_action':
          return await this.executeReminderAction(parsedAction);
        case 'incomplete_request':
          return await this.handleIncompleteRequest(parsedAction);
        default:
          return { success: false, message: 'Tipo di azione non supportato' };
      }
    } catch (error) {
      console.error('Error executing action:', error);
      return { success: false, message: 'Errore durante l\'esecuzione dell\'azione' };
    }
  }
  
  private async executeUniversalAutomation(parsedAction: ParsedAction): Promise<any> {
    const { action, parameters } = parsedAction;
    
    if (!electronBridge.isElectron()) {
      return { success: false, message: 'Automazione disponibile solo nella desktop app' };
    }
    
    try {
      switch (action) {
        case 'search_on_site':
          return await electronBridge.universalSearchOnSite(parameters.website, parameters.query);
        case 'navigate_only':
          return await electronBridge.universalNavigation(parameters.website, 'navigate');
        default:
          return { success: false, message: 'Azione non supportata' };
      }
    } catch (error) {
      return { success: false, message: `Errore: ${error.message}` };
    }
  }
  
  private async executeTrainBooking(parsedAction: ParsedAction): Promise<any> {
    const { parameters } = parsedAction;
    
    if (parsedAction.action === 'ask_train_details') {
      return {
        success: true,
        message: parameters.message,
        type: 'clarification_needed'
      };
    }
    
    // Execute actual train booking
    return await this.executeUniversalAutomation({
      type: 'universal_automation',
      action: 'search_on_site',
      parameters: {
        query: `treno da ${parameters.from} a ${parameters.to} ${parameters.date}`,
        website: 'trenitalia.com'
      },
      confidence: 0.8
    });
  }
  
  private async executeProductSearch(parsedAction: ParsedAction): Promise<any> {
    return await this.executeUniversalAutomation({
      type: 'universal_automation',
      action: 'search_on_site',
      parameters: parsedAction.parameters,
      confidence: 0.8
    });
  }
  
  private async executeAppAction(parsedAction: ParsedAction): Promise<any> {
    // For now, return success message
    return { success: true, message: 'App action would be executed here' };
  }
  
  private async executeReminderAction(parsedAction: ParsedAction): Promise<any> {
    // For now, return success message
    return { success: true, message: 'Reminder would be created here' };
  }
  
  private async handleIncompleteRequest(parsedAction: ParsedAction): Promise<any> {
    const { parameters } = parsedAction;
    
    let clarificationMessage = 'Non ho capito cosa intendi. ';
    
    switch (parameters.detectedIntent) {
      case 'train':
        clarificationMessage += 'Vuoi cercare un treno o aprire Trenitalia?';
        break;
      case 'phone':
        clarificationMessage += 'Vuoi cercare un telefono o aprire un sito?';
        break;
      case 'search':
        clarificationMessage += 'Cosa vorresti cercare?';
        break;
      default:
        clarificationMessage += 'Puoi essere più specifico?';
    }
    
    return {
      success: true,
      message: clarificationMessage,
      type: 'clarification_needed'
    };
  }
  
  // Clear context for a conversation
  clearContext(conversationId: string): void {
    this.contextMemory.delete(conversationId);
  }
  
  // Get all contexts (for debugging)
  getAllContexts(): Map<string, AutomationContext> {
    return new Map(this.contextMemory);
  }
}

export const enhancedActionParser = new EnhancedActionParser(); 