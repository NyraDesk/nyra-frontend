// src/services/factChecker.ts
// Sistema di fact checking automatico con fallback web scraping

export interface FactCheckResult {
  isUpToDate: boolean;
  verifiedInfo?: {
    title: string;
    name: string;
    startDate: string;
    source: string;
  };
  needsVerification: boolean;
  fallbackUrl?: string;
  message: string;
}

export interface ScrapingResult {
  success: boolean;
  data?: {
    title: string;
    name: string;
    startDate: string;
  };
  url?: string;
  error?: string;
}

export class FactChecker {
  private readonly factPatterns = {
    president: {
      patterns: [
        /presidente.*stati uniti/i,
        /presidente.*usa/i,
        /president.*united states/i,
        /chi è il presidente/i,
        /chi è presidente/i
      ],
      searchTerms: ['president of the united states', 'presidente stati uniti'],
      sources: [
        'https://en.wikipedia.org/wiki/President_of_the_United_States',
        'https://ballotpedia.org/President_of_the_United_States'
      ]
    },
    primeMinister: {
      patterns: [
        /primo ministro.*italia/i,
        /presidente.*consiglio/i,
        /chi è il premier/i,
        /chi è premier/i
      ],
      searchTerms: ['prime minister of italy', 'presidente del consiglio italia'],
      sources: [
        'https://en.wikipedia.org/wiki/Prime_Minister_of_Italy',
        'https://en.wikipedia.org/wiki/List_of_prime_ministers_of_Italy'
      ]
    },
    mayor: {
      patterns: [
        /sindaco.*roma/i,
        /sindaco.*milano/i,
        /sindaco.*napoli/i,
        /chi è il sindaco/i
      ],
      searchTerms: ['mayor of rome', 'mayor of milan', 'sindaco roma', 'sindaco milano'],
      sources: [
        'https://en.wikipedia.org/wiki/Mayor_of_Rome',
        'https://en.wikipedia.org/wiki/Mayor_of_Milan'
      ]
    }
  };

  /**
   * Analizza se la domanda richiede fact checking
   */
  needsFactChecking(question: string): boolean {
    const lowerQuestion = question.toLowerCase();
    
    // Controlla se contiene parole chiave che indicano fatti aggiornabili
    const factKeywords = [
      'presidente', 'president', 'primo ministro', 'premier', 'sindaco', 'mayor',
      'chi è', 'who is', 'attuale', 'current', 'oggi', 'today', 'ora', 'now'
    ];
    
    return factKeywords.some(keyword => lowerQuestion.includes(keyword));
  }

  /**
   * Identifica il tipo di fatto da verificare
   */
  identifyFactType(question: string): string | null {
    const lowerQuestion = question.toLowerCase();
    
    for (const [factType, config] of Object.entries(this.factPatterns)) {
      if (config.patterns.some(pattern => pattern.test(question))) {
        return factType;
      }
    }
    
    return null;
  }

  /**
   * Verifica se le informazioni sono aggiornate
   */
  async checkFact(question: string): Promise<FactCheckResult> {
    try {
      console.log('🔍 FactChecker: Analisi domanda:', question);
      
      if (!this.needsFactChecking(question)) {
        return {
          isUpToDate: true,
          needsVerification: false,
          message: 'Domanda non richiede fact checking'
        };
      }

      const factType = this.identifyFactType(question);
      if (!factType) {
        return {
          isUpToDate: false,
          needsVerification: true,
          message: 'Richiede verifica ma tipo non identificato'
        };
      }

      console.log('🎯 FactChecker: Tipo fatto identificato:', factType);
      
      // Prova a fare scraping per ottenere informazioni aggiornate
      const scrapingResult = await this.scrapeFactInfo(factType, question);
      
      if (scrapingResult.success && scrapingResult.data) {
        return {
          isUpToDate: true,
          verifiedInfo: {
            title: scrapingResult.data.title,
            name: scrapingResult.data.name,
            startDate: scrapingResult.data.startDate,
            source: scrapingResult.url || 'Web scraping'
          },
          needsVerification: false,
          message: `Informazione verificata: ${scrapingResult.data.name} (${scrapingResult.data.startDate})`
        };
      } else {
        // Fallback: apri sito per verifica manuale
        const fallbackUrl = this.getFallbackUrl(factType);
        return {
          isUpToDate: false,
          needsVerification: true,
          fallbackUrl,
          message: `Non riesco a verificare automaticamente. Controlla qui: ${fallbackUrl}`
        };
      }
      
    } catch (error) {
      console.error('❌ FactChecker: Errore nel fact checking:', error);
      return {
        isUpToDate: false,
        needsVerification: true,
        message: 'Errore durante la verifica. Controlla manualmente.'
      };
    }
  }

  /**
   * Esegue scraping per ottenere informazioni aggiornate
   */
  private async scrapeFactInfo(factType: string, question: string): Promise<ScrapingResult> {
    try {
      console.log('🔍 FactChecker: Avvio scraping per:', factType);
      
      // Verifica che window.electronAPI sia disponibile
      if (!window.electronAPI) {
        throw new Error('ElectronAPI non disponibile per scraping');
      }
      
      // Usa il sistema di scraping esistente
      const result = await window.electronAPI.scrapeFactInfo({
        factType,
        question,
        sources: this.factPatterns[factType as keyof typeof this.factPatterns]?.sources || []
      });
      
      if (result.success && result.data) {
        console.log('✅ FactChecker: Scraping completato:', result.data);
        return {
          success: true,
          data: result.data,
          url: result.url
        };
      } else {
        console.log('❌ FactChecker: Scraping fallito:', result.error);
        return {
          success: false,
          error: result.error || 'Errore sconosciuto nello scraping'
        };
      }
      
    } catch (error) {
      console.error('❌ FactChecker: Errore nello scraping:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto'
      };
    }
  }

  /**
   * Ottiene URL di fallback per verifica manuale
   */
  private getFallbackUrl(factType: string): string {
    const config = this.factPatterns[factType as keyof typeof this.factPatterns];
    return config?.sources[0] || 'https://www.google.com';
  }

  /**
   * Formatta la risposta con informazioni verificate
   */
  formatVerifiedResponse(result: FactCheckResult): string {
    if (result.isUpToDate && result.verifiedInfo) {
      return `✅ **Informazione verificata**: ${result.verifiedInfo.name} è ${result.verifiedInfo.title} dal ${result.verifiedInfo.startDate}. Fonte: ${result.verifiedInfo.source}`;
    } else if (result.needsVerification && result.fallbackUrl) {
      return `⚠️ **Richiede verifica**: ${result.message}`;
    } else {
      return `❓ **Non posso verificare**: ${result.message}`;
    }
  }
}

// Esporta un'istanza singleton
export const factChecker = new FactChecker(); 