export interface ErrorResponse {
  success: boolean;
  message: string;
  shouldRetry?: boolean;
  fallback?: boolean;
  technicalError?: string; // Solo per logging interno
}

export class ErrorHandler {
  
  // MAI mostrare errori tecnici all'utente
  static handleTechnicalError(error: any, context: string): ErrorResponse {
    console.error(`Technical error in ${context}:`, error);
    
    // Messaggi naturali per l'utente
    const userMessages = [
      "Sto avendo qualche difficoltà. Riprovo subito per te",
      "Qualcosa non va. Posso riprovare?",
      "Sto avendo problemi tecnici. Riprovo tra un momento",
      "Non riesco a completare l'operazione. Riprovo?",
      "Sto avendo difficoltà. Posso provare in modo diverso?"
    ];
    
    const randomMessage = userMessages[Math.floor(Math.random() * userMessages.length)];
    
    return {
      success: false,
      message: randomMessage,
      shouldRetry: true,
      technicalError: error?.message || error?.toString() || 'Unknown error'
    };
  }
  
  // Gestione errori di automazione
  static handleAutomationError(error: any, query: string): ErrorResponse {
    console.error('Automation error:', error);
    
    const contextMessages = {
      'network': "Problemi di connessione. Riprovo?",
      'timeout': "Sta impiegando troppo tempo. Riprovo?",
      'blocked': "Il sito sembra aver bloccato la ricerca. Provo con Google?",
      'notfound': `Non riesco a trovare ${query}. Provo con altri termini?`,
      'selector': "Il sito ha cambiato layout. Provo con un approccio diverso?",
      'navigation': "La pagina non si carica. Riprovo tra un momento?"
    };
    
    // Determina tipo di errore
    let errorType = 'unknown';
    const errorString = error?.toString()?.toLowerCase() || '';
    
    if (errorString.includes('timeout') || errorString.includes('timed out')) {
      errorType = 'timeout';
    } else if (errorString.includes('network') || errorString.includes('connection')) {
      errorType = 'network';
    } else if (errorString.includes('blocked') || errorString.includes('forbidden')) {
      errorType = 'blocked';
    } else if (errorString.includes('not found') || errorString.includes('404')) {
      errorType = 'notfound';
    } else if (errorString.includes('selector') || errorString.includes('element')) {
      errorType = 'selector';
    } else if (errorString.includes('navigation') || errorString.includes('page')) {
      errorType = 'navigation';
    }
    
    return {
      success: false,
      message: contextMessages[errorType] || contextMessages['unknown'],
      shouldRetry: errorType !== 'blocked' && errorType !== 'notfound',
      technicalError: error?.message || error?.toString()
    };
  }
  
  // Gestione errori di funzione mancante
  static handleMissingFunction(functionName: string): ErrorResponse {
    console.error(`Missing function: ${functionName}`);
    
    return {
      success: false,
      message: "Sto avendo difficoltà tecniche. Posso riprovare o cercare in modo diverso?",
      shouldRetry: true,
      fallback: true,
      technicalError: `Function ${functionName} not available`
    };
  }
  
  // Gestione errori di browser
  static handleBrowserError(error: any): ErrorResponse {
    console.error('Browser error:', error);
    
    const browserMessages = [
      "Il browser non risponde. Riprovo?",
      "Problemi con il browser. Posso riprovare?",
      "Il browser sembra bloccato. Riprovo tra un momento?",
      "Sto avendo problemi con il browser. Riprovo?"
    ];
    
    return {
      success: false,
      message: browserMessages[Math.floor(Math.random() * browserMessages.length)],
      shouldRetry: true,
      technicalError: error?.message || error?.toString()
    };
  }
  
  // Gestione errori generici con retry
  static handleGenericError(error: any, maxRetries: number = 3): ErrorResponse {
    console.error('Generic error:', error);
    
    const genericMessages = [
      "Qualcosa non va. Riprovo?",
      "Sto avendo problemi. Posso riprovare?",
      "Non riesco a completare l'operazione. Riprovo?",
      "Sto avendo difficoltà. Riprovo tra un momento?"
    ];
    
    return {
      success: false,
      message: genericMessages[Math.floor(Math.random() * genericMessages.length)],
      shouldRetry: true,
      technicalError: error?.message || error?.toString()
    };
  }
  
  // Verifica se un errore è recuperabile
  static isRecoverableError(error: any): boolean {
    const errorString = error?.toString()?.toLowerCase() || '';
    
    // Errori non recuperabili
    const nonRecoverable = [
      'permission denied',
      'access denied',
      'forbidden',
      'unauthorized',
      'not found',
      '404'
    ];
    
    return !nonRecoverable.some(term => errorString.includes(term));
  }
  
  // Crea messaggio di fallback elegante
  static createFallbackMessage(originalQuery: string): string {
    const fallbackMessages = [
      `Non riesco a trovare ${originalQuery}. Provo con termini simili?`,
      `Sto avendo difficoltà con ${originalQuery}. Posso cercare alternative?`,
      `Non trovo risultati per ${originalQuery}. Provo con una ricerca diversa?`,
      `Sto avendo problemi con ${originalQuery}. Posso suggerire alternative?`
    ];
    
    return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
  }
} 