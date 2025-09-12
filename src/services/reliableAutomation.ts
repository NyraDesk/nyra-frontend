import { ErrorHandler, ErrorResponse } from './errorHandler';
import { NaturalConversation } from './naturalConversation';
import { electronBridge } from './electronBridge';

export interface AutomationResult {
  success: boolean;
  message: string;
  data?: any;
  shouldRetry?: boolean;
  fallback?: boolean;
}

export class ReliableAutomation {
  private conversation = new NaturalConversation();
  private maxRetries = 3;
  private retryDelay = 1000; // 1 secondo
  
  // Automazione robusta con retry automatico
  async executeSearch(query: string, site: string): Promise<AutomationResult> {
    console.log(`🎯 Starting reliable automation for: ${query} on ${site}`);
    
    // Multi-tentativo silenzioso
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${this.maxRetries}`);
        
        const result = await this.tryAutomation(query, site);
        
        if (result.success) {
          console.log(`✅ Automation successful on attempt ${attempt}`);
          return result;
        }
        
        // Se non successo ma non errore, riprova
        if (attempt < this.maxRetries) {
          console.log(`⚠️ Attempt ${attempt} failed, retrying...`);
          await this.delay(this.retryDelay);
        }
        
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed with error:`, error);
        
        if (attempt === this.maxRetries) {
          // Ultimo tentativo fallito - fallback elegante
          return this.createFallbackResponse(query, site, error);
        }
        
        // Pausa prima del retry
        await this.delay(this.retryDelay);
      }
    }
    
    // Se arriviamo qui, tutti i tentativi sono falliti
    return this.createFallbackResponse(query, site, new Error('All attempts failed'));
  }
  
  // Tentativo singolo di automazione
  private async tryAutomation(query: string, site: string): Promise<AutomationResult> {
    try {
      // Verifica se electronBridge è disponibile
      if (!electronBridge.isElectron()) {
        throw new Error('Automazione disponibile solo in desktop app');
      }
      
      // Verifica se le funzioni necessarie esistono
      if (!window.electronAPI || !window.electronAPI.startAutomation) {
        throw new Error('Funzione startAutomation non disponibile');
      }
      
      // Esegui automazione
      const result = await window.electronAPI.startAutomation('universal-automation', {
        action: 'search_on_site',
        query: query,
        site: site
      });
      
      console.log('✅ Automation result:', result);
      
      return {
        success: true,
        message: this.conversation.getCompletedMessage(result?.results?.length || 0),
        data: result
      };
      
    } catch (error) {
      console.error('❌ Automation error:', error);
      
      // Gestisci errori specifici
      const errorResponse = ErrorHandler.handleAutomationError(error, query);
      
      return {
        success: false,
        message: errorResponse.message,
        shouldRetry: errorResponse.shouldRetry,
        fallback: errorResponse.fallback
      };
    }
  }
  
  // Crea risposta di fallback elegante
  private createFallbackResponse(query: string, site: string, error: any): AutomationResult {
    console.log('🔄 Creating fallback response');
    
    const fallbackMessages = [
      "Sto avendo difficoltà tecniche. Posso riprovare o cercare in modo diverso?",
      "Non riesco a completare la ricerca. Posso provare un approccio diverso?",
      "Sto avendo problemi. Posso riprovare o suggerire alternative?",
      "Qualcosa non va. Posso riprovare o cercare altrove?"
    ];
    
    return {
      success: false,
      message: fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)],
      shouldRetry: true,
      fallback: true
    };
  }
  
  // Delay per retry
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Automazione con fallback a Google
  async executeSearchWithFallback(query: string, primarySite: string): Promise<AutomationResult> {
    console.log(`🎯 Starting search with fallback: ${query} on ${primarySite}`);
    
    // Prova sito primario
    const primaryResult = await this.executeSearch(query, primarySite);
    
    if (primaryResult.success) {
      return primaryResult;
    }
    
    // Se fallisce, prova Google
    console.log(`🔄 Primary site failed, trying Google`);
    
    const googleResult = await this.executeSearch(query, 'google.com');
    
    if (googleResult.success) {
      return {
        ...googleResult,
        message: this.conversation.getFallbackMessage(query, 'Google')
      };
    }
    
    // Se anche Google fallisce, ritorna errore elegante
    return {
      success: false,
      message: "Non riesco a trovare risultati. Provo con termini diversi?",
      shouldRetry: true,
      fallback: true
    };
  }
  
  // Verifica se l'automazione è disponibile
  isAutomationAvailable(): boolean {
    try {
      return electronBridge.isElectron() && 
             !!window.electronAPI && 
             !!window.electronAPI.startAutomation;
    } catch (error) {
      console.error('❌ Error checking automation availability:', error);
      return false;
    }
  }
  
  // Reset automazione
  async resetAutomation(): Promise<boolean> {
    try {
      if (!this.isAutomationAvailable()) {
        return false;
      }
      
      const result = await window.electronAPI.resetAutomation();
      console.log('🔄 Automation reset result:', result);
      
      return result?.success || false;
      
    } catch (error) {
      console.error('❌ Error resetting automation:', error);
      return false;
    }
  }
  
  // Chiudi browser
  async closeBrowser(): Promise<boolean> {
    try {
      if (!this.isAutomationAvailable()) {
        return false;
      }
      
      const result = await window.electronAPI.closeBrowser();
      console.log('🔒 Browser close result:', result);
      
      return result?.success || false;
      
    } catch (error) {
      console.error('❌ Error closing browser:', error);
      return false;
    }
  }
  
  // Gestisci status updates
  onStatusUpdate(callback: (status: any) => void): void {
    try {
      if (!this.isAutomationAvailable()) {
        return;
      }
      
      window.electronAPI.onAutomationStatus(callback);
      
    } catch (error) {
      console.error('❌ Error setting up status listener:', error);
    }
  }
  
  // Rimuovi status listener
  removeStatusListener(callback: (status: any) => void): void {
    try {
      if (!this.isAutomationAvailable()) {
        return;
      }
      
      window.electronAPI.removeAutomationStatusListener(callback);
      
    } catch (error) {
      console.error('❌ Error removing status listener:', error);
    }
  }
} 