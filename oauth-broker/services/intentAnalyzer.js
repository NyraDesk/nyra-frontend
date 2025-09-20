/**
 * NYRA Intent Analyzer - Sistema intelligente per analisi intent
 * Analizza i messaggi utente per identificare l'intent prima di chiamare l'AI
 */

class IntentAnalyzer {
  constructor() {
    this.intents = {
      SEND_EMAIL: {
        patterns: [
          // Pattern per invio email - devono essere più specifici
          /invia.*email/i,
          /manda.*mail/i,
          /email.*client/i,
          /invia.*mail/i,
          /spedisci.*email/i,
          /send.*email/i,
          /manda.*a.*cliente/i,
          /invia.*a.*tutti/i,
          /email.*marketing/i,
          /campagna.*email/i,
          /newsletter/i,
          /bulk.*email/i,
          /mass.*email/i,
          /invia.*campagna/i,
          /manda.*messaggio/i,
          /spedisci.*mail/i
        ],
        requiredContext: ['hasEmailAddresses'],
        entities: ['email', 'destinatari', 'cliente', 'tutti', 'marketing', 'campagna'],
        contextBoosters: {
          hasExcelData: 0.3,
          hasEmailAddresses: 0.4,
          hasTemplate: 0.2,
          hasSubject: 0.1
        },
        baseScore: 0.6
      },
      
      ANALYZE_EXCEL: {
        patterns: [
          /analizza.*dati/i,
          /analisi.*excel/i,
          /esamina.*foglio/i,
          /riassumi.*dati/i,
          /statistiche/i,
          /grafici/i,
          /trend/i,
          /insights/i,
          /report.*dati/i,
          /cosa.*mostrano.*dati/i,
          /analizza.*vendite/i,
          /analizza.*clienti/i,
          /analizza.*fatturato/i,
          /analisi.*performance/i,
          /dashboard/i,
          /metriche/i,
          /kpi/i,
          /analisi.*finanziaria/i,
          /analizza.*risultati/i
        ],
        requiredContext: ['hasExcelData'],
        entities: ['dati', 'excel', 'foglio', 'vendite', 'clienti', 'fatturato', 'performance'],
        contextBoosters: {
          hasExcelData: 0.5,
          hasMultipleSheets: 0.2,
          hasNumericData: 0.2,
          hasDateData: 0.1
        },
        baseScore: 0.7
      },
      
      CREATE_EXCEL: {
        patterns: [
          /crea.*excel/i,
          /genera.*foglio/i,
          /nuovo.*excel/i,
          /template.*excel/i,
          /modello.*excel/i,
          /foglio.*di.*lavoro/i,
          /spreadsheet/i,
          /tabella.*excel/i,
          /report.*excel/i,
          /dashboard.*excel/i,
          /budget.*excel/i,
          /inventario.*excel/i,
          /lista.*excel/i,
          /database.*excel/i,
          /archivio.*excel/i,
          /registro.*excel/i,
          /calendario.*excel/i,
          /pianificazione.*excel/i,
          /^crea$/i,
          /^genera$/i,
          /^nuovo$/i,
          /^template$/i,
          /genera.*template/i,
          /crea.*nuovo/i,
          /fai.*un.*excel/i,
          /crea.*un.*foglio/i
        ],
        requiredContext: [],
        entities: ['excel', 'foglio', 'template', 'modello', 'spreadsheet', 'tabella', 'report'],
        contextBoosters: {
          hasTemplateRequest: 0.4,
          hasSpecificFields: 0.3,
          hasDataStructure: 0.2,
          hasFormattingRequest: 0.1
        },
        baseScore: 0.7
      },
      
      PROCESS_DOCUMENT: {
        patterns: [
          /carica.*documento/i,
          /leggi.*file/i,
          /processa.*documento/i,
          /analizza.*documento/i,
          /estraggi.*dati/i,
          /parsa.*file/i,
          /converte.*documento/i,
          /elabora.*pdf/i,
          /elabora.*word/i,
          /elabora.*excel/i,
          /importa.*documento/i,
          /gestisci.*file/i,
          /organizza.*documenti/i,
          /archivia.*documento/i,
          /categorizza.*documento/i,
          /classifica.*documento/i,
          /estrai.*testo/i,
          /estrai.*informazioni/i
        ],
        requiredContext: ['hasDocument'],
        entities: ['documento', 'file', 'pdf', 'word', 'excel', 'dati', 'testo', 'informazioni'],
        contextBoosters: {
          hasDocument: 0.5,
          hasMultipleDocuments: 0.2,
          hasSpecificFormat: 0.2,
          hasProcessingRequest: 0.1
        },
        baseScore: 0.7
      },
      
      GENERAL_CHAT: {
        patterns: [
          /^ciao$/i,
          /^buongiorno$/i,
          /^buonasera$/i,
          /^buonanotte$/i,
          /come.*stai/i,
          /grazie/i,
          /prego/i,
          /scusa/i,
          /aiuto/i,
          /help/i,
          /cosa.*puoi.*fare/i,
          /funzionalità/i,
          /capabilities/i,
          /informazioni/i,
          /spiegami/i,
          /raccontami/i,
          /dimmi/i,
          /parlami/i,
          /consigliami/i,
          /suggerisci/i,
          /^salve$/i,
          /^hey$/i,
          /^hi$/i,
          /^hello$/i,
          /prepara.*report/i,
          /^prepara$/i,
          /dimmi.*le.*funzionalità/i,
          /cosa.*puoi.*fare/i
        ],
        requiredContext: [],
        entities: ['saluto', 'aiuto', 'informazione', 'spiegazione', 'consiglio'],
        contextBoosters: {
          isGreeting: 0.3,
          isQuestion: 0.2,
          isHelpRequest: 0.4,
          isConversational: 0.1
        },
        baseScore: 0.8
      }
    };

    // Parole di contesto per identificare entità
    this.contextWords = {
      email: ['email', 'mail', 'posta', 'messaggio', 'comunicazione'],
      excel: ['excel', 'foglio', 'spreadsheet', 'tabella', 'dati'],
      document: ['documento', 'file', 'pdf', 'word', 'allegato'],
      number: ['numero', 'quantità', 'totale', 'somma', 'conteggio'],
      date: ['data', 'giorno', 'mese', 'anno', 'periodo', 'ora'],
      client: ['cliente', 'utente', 'destinatario', 'persona']
    };

    // Pesi per il calcolo del punteggio
    this.weights = {
      patternMatch: 0.5,
      entityMatch: 0.3,
      contextMatch: 0.15,
      messageLength: 0.05
    };
  }

  /**
   * Analizza un messaggio per identificare l'intent
   * @param {string} message - Il messaggio da analizzare
   * @param {object} context - Contesto della conversazione
   * @returns {object} Risultato dell'analisi
   */
  analyze(message, context = {}) {
    if (!message || typeof message !== 'string') {
      return this.createResult('GENERAL_CHAT', 0.5, {}, 'analyzeMessage', false, ['Messaggio non valido']);
    }

    const normalizedMessage = this.normalizeMessage(message);
    const entities = this.extractEntities(normalizedMessage);
    const enrichedContext = this.enrichContext(context, entities);

    // Gestione speciale per parole singole ambigue
    if (this.isAmbiguousSingleWord(normalizedMessage)) {
      return this.createResult(
        'GENERAL_CHAT',
        0.3,
        enrichedContext,
        'handleGeneralQuery',
        true,
        ['Parola singola ambigua - serve più contesto']
      );
    }

    let bestIntent = 'GENERAL_CHAT';
    let highestScore = 0;
    let intentDetails = {};

    // Analizza ogni intent
    for (const [intentName, intentConfig] of Object.entries(this.intents)) {
      const score = this.calculateScore(normalizedMessage, intentConfig, enrichedContext);
      
      if (score > highestScore) {
        highestScore = score;
        bestIntent = intentName;
        intentDetails = intentConfig;
      }
    }

    // Calcola se serve conferma
    const requiresConfirmation = highestScore < 0.7;
    const suggestedAction = this.getSuggestedAction(bestIntent, enrichedContext);
    const contextualHints = this.generateContextualHints(bestIntent, enrichedContext);

    return this.createResult(
      bestIntent,
      highestScore,
      enrichedContext,
      suggestedAction,
      requiresConfirmation,
      contextualHints
    );
  }

  /**
   * Normalizza il messaggio per l'analisi
   */
  normalizeMessage(message) {
    return message
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Rimuove punteggiatura
      .replace(/\s+/g, ' ') // Normalizza spazi
      .trim();
  }

  /**
   * Verifica se è una parola singola ambigua
   */
  isAmbiguousSingleWord(message) {
    const words = message.split(' ').filter(word => word.length > 0);
    
    // Se c'è più di una parola, non è ambigua
    if (words.length > 1) return false;
    
    // Lista di parole singole che potrebbero essere ambigue
    const ambiguousWords = [
      'mail', 'email', 'excel', 'foglio', 'documento', 'file', 
      'dati', 'report', 'analisi', 'template', 'modello'
    ];
    
    return ambiguousWords.includes(words[0]);
  }

  /**
   * Estrae entità dal messaggio
   */
  extractEntities(message) {
    const entities = {};
    
    for (const [type, words] of Object.entries(this.contextWords)) {
      entities[type] = words.some(word => message.includes(word));
    }

    // Estrai numeri
    entities.hasNumbers = /\d+/.test(message);
    
    // Estrai email addresses
    entities.hasEmailAddresses = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i.test(message);
    
    // Estrai date
    entities.hasDates = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(message) || 
                       /\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\b/i.test(message);

    return entities;
  }

  /**
   * Arricchisce il contesto con le entità estratte
   */
  enrichContext(context, entities) {
    return {
      ...context,
      ...entities,
      // Contesto derivato
      hasExcelData: context.hasExcelData || entities.excel,
      hasDocument: context.hasDocument || entities.document,
      hasEmailAddresses: context.hasEmailAddresses || entities.hasEmailAddresses,
      messageLength: context.messageLength || entities.messageLength,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calcola il punteggio per un intent specifico
   */
  calculateScore(message, intentConfig, context) {
    // Reset score per ogni intent
    let score = 0;

    // 1. Pattern matching (50%) - Più importante
    const patternScore = this.calculatePatternScore(message, intentConfig.patterns);
    score += patternScore * this.weights.patternMatch;

    // 2. Entity matching (30%) - Secondo per importanza
    const entityScore = this.calculateEntityScore(message, intentConfig.entities);
    score += entityScore * this.weights.entityMatch;

    // 3. Context matching (15%) - Solo se ci sono contesti richiesti
    const contextScore = this.calculateContextScore(context, intentConfig);
    score += contextScore * this.weights.contextMatch;

    // 4. Message length bonus (5%) - Meno importante
    const lengthScore = this.calculateLengthScore(message);
    score += lengthScore * this.weights.messageLength;

    // Applica boosters di contesto SOLO se c'è già un pattern match
    if (patternScore > 0) {
      for (const [booster, value] of Object.entries(intentConfig.contextBoosters || {})) {
        if (context[booster]) {
          score += value;
        }
      }
    }

    // Applica il base score solo se c'è almeno un pattern match
    if (patternScore > 0) {
      score += intentConfig.baseScore || 0;
    }

    return Math.min(score, 1.0); // Cap a 1.0
  }

  /**
   * Calcola il punteggio per i pattern
   */
  calculatePatternScore(message, patterns) {
    if (!patterns || patterns.length === 0) return 0;

    let maxMatch = 0;
    let exactMatches = 0;
    
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        // Conta match esatti
        exactMatches++;
        
        // Punteggio basato sulla lunghezza del match
        const match = message.match(pattern);
        if (match) {
          const matchLength = match[0].length;
          const matchRatio = matchLength / message.length;
          maxMatch = Math.max(maxMatch, matchRatio);
        }
      }
    }

    // Se ci sono molti match esatti, aumenta il punteggio
    if (exactMatches > 1) {
      maxMatch *= 1.2; // Bonus per multiple match
    }

    return Math.min(maxMatch, 1.0);
  }

  /**
   * Calcola il punteggio per il contesto
   */
  calculateContextScore(context, intentConfig) {
    if (!intentConfig.requiredContext) return 0.5;

    let contextMatches = 0;
    for (const requiredContext of intentConfig.requiredContext) {
      if (context[requiredContext]) {
        contextMatches++;
      }
    }

    return contextMatches / intentConfig.requiredContext.length;
  }

  /**
   * Calcola il punteggio per le entità
   */
  calculateEntityScore(message, entities) {
    if (!entities || entities.length === 0) return 0.5;

    let entityMatches = 0;
    for (const entity of entities) {
      if (message.includes(entity)) {
        entityMatches++;
      }
    }

    return entityMatches / entities.length;
  }

  /**
   * Calcola il punteggio basato sulla lunghezza del messaggio
   */
  calculateLengthScore(message) {
    const length = message.length;
    
    // Messaggi troppo corti (< 3 caratteri) o troppo lunghi (> 500) hanno punteggio basso
    if (length < 3) return 0.1;
    if (length > 500) return 0.7;
    
    // Punteggio ottimale per messaggi di lunghezza media
    return Math.min(length / 50, 1.0);
  }

  /**
   * Ottiene l'azione suggerita basata sull'intent
   */
  getSuggestedAction(intent, context) {
    const actions = {
      SEND_EMAIL: context.hasTemplate ? 'prepareEmailWithTemplate' : 'prepareEmailBatch',
      ANALYZE_EXCEL: context.hasMultipleSheets ? 'analyzeMultipleSheets' : 'analyzeExcelData',
      CREATE_EXCEL: context.hasSpecificFields ? 'createExcelWithFields' : 'createExcelTemplate',
      PROCESS_DOCUMENT: context.hasMultipleDocuments ? 'processDocumentBatch' : 'processSingleDocument',
      GENERAL_CHAT: 'handleGeneralQuery'
    };

    return actions[intent] || 'handleGeneralQuery';
  }

  /**
   * Genera hint contestuali
   */
  generateContextualHints(intent, context) {
    const hints = [];

    switch (intent) {
      case 'SEND_EMAIL':
        if (context.hasExcelData) hints.push('User has Excel data loaded');
        if (context.hasEmailAddresses) hints.push('Email addresses detected in message');
        if (context.hasTemplate) hints.push('Email template available');
        if (!context.hasEmailAddresses && !context.hasExcelData) {
          hints.push('No email addresses or Excel data detected - may need clarification');
        }
        break;

      case 'ANALYZE_EXCEL':
        if (context.hasExcelData) hints.push('Excel file is loaded and ready for analysis');
        if (context.hasMultipleSheets) hints.push('Multiple sheets detected in Excel file');
        if (!context.hasExcelData) {
          hints.push('No Excel data loaded - user may need to upload file first');
        }
        break;

      case 'CREATE_EXCEL':
        if (context.hasSpecificFields) hints.push('Specific fields mentioned for Excel creation');
        if (context.hasTemplateRequest) hints.push('User requesting template creation');
        break;

      case 'PROCESS_DOCUMENT':
        if (context.hasDocument) hints.push('Document file is available for processing');
        if (context.hasMultipleDocuments) hints.push('Multiple documents detected');
        break;

      case 'GENERAL_CHAT':
        if (context.isGreeting) hints.push('User greeting detected');
        if (context.isQuestion) hints.push('User asking a question');
        if (context.isHelpRequest) hints.push('User requesting help');
        break;
    }

    return hints;
  }

  /**
   * Crea il risultato dell'analisi
   */
  createResult(intent, confidence, entities, suggestedAction, requiresConfirmation, contextualHints) {
    return {
      intent,
      confidence: Math.round(confidence * 100) / 100, // Arrotonda a 2 decimali
      entities,
      suggestedAction,
      requiresConfirmation,
      contextualHints,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Aggiunge un nuovo intent (per estensibilità)
   */
  addIntent(name, config) {
    this.intents[name] = config;
  }

  /**
   * Ottiene statistiche sugli intent
   */
  getIntentStats() {
    return {
      totalIntents: Object.keys(this.intents).length,
      intentNames: Object.keys(this.intents),
      supportedEntities: Object.keys(this.contextWords),
      version: '1.0.0'
    };
  }
}

module.exports = IntentAnalyzer;
