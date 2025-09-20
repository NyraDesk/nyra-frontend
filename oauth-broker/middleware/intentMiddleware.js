/**
 * NYRA Intent Middleware - Intercetta e analizza le richieste chat
 * Integra l'Intent Analyzer prima di chiamare OpenRouter
 */

const IntentAnalyzer = require('../services/intentAnalyzer');

class IntentMiddleware {
  constructor() {
    this.intentAnalyzer = new IntentAnalyzer();
    this.sessionStore = new Map(); // Store per sessione (in produzione usare Redis)
  }

  /**
   * Middleware principale per analisi intent
   */
  analyzeIntent() {
    return async (req, res, next) => {
      try {
        // Estrai il messaggio dalla richiesta
        const message = this.extractMessage(req);
        if (!message) {
          return next(); // Se non c'è messaggio, continua senza analisi
        }

        // Ottieni o crea il contesto della sessione
        const sessionId = this.getSessionId(req);
        const context = this.getSessionContext(sessionId, req);

        // Analizza l'intent
        const intentResult = this.intentAnalyzer.analyze(message, context);

        // Salva l'intent nella sessione
        this.saveIntentToSession(sessionId, intentResult);

        // Arricchisci la richiesta con i risultati dell'analisi
        req.intentAnalysis = intentResult;
        req.sessionId = sessionId;

        // Log dell'analisi
        this.logIntentAnalysis(intentResult, message, sessionId);

        // Se serve conferma e l'intent ha confidence bassa, gestisci
        if (intentResult.requiresConfirmation && intentResult.confidence < 0.7) {
          return this.handleLowConfidenceIntent(req, res, intentResult);
        }

        // Continua al prossimo middleware
        next();

      } catch (error) {
        console.error('[IntentMiddleware] Errore nell\'analisi intent:', error);
        
        // In caso di errore, continua senza bloccare la richiesta
        req.intentAnalysis = {
          intent: 'GENERAL_CHAT',
          confidence: 0.5,
          entities: {},
          suggestedAction: 'handleGeneralQuery',
          requiresConfirmation: false,
          contextualHints: ['Errore nell\'analisi intent'],
          timestamp: new Date().toISOString(),
          error: error.message
        };
        
        next();
      }
    };
  }

  /**
   * Estrae il messaggio dalla richiesta
   */
  extractMessage(req) {
    // Prova diverse fonti del messaggio
    if (req.body && req.body.messages && Array.isArray(req.body.messages)) {
      // Formato OpenRouter standard
      const lastMessage = req.body.messages[req.body.messages.length - 1];
      if (lastMessage && lastMessage.content) {
        return lastMessage.content;
      }
    }

    if (req.body && req.body.message) {
      // Formato diretto
      return req.body.message;
    }

    if (req.body && req.body.text) {
      // Formato alternativo
      return req.body.text;
    }

    if (req.body && req.body.content) {
      // Formato contenuto diretto
      return req.body.content;
    }

    return null;
  }

  /**
   * Ottiene l'ID della sessione
   */
  getSessionId(req) {
    // Prova diverse fonti per l'ID sessione
    if (req.headers['x-session-id']) {
      return req.headers['x-session-id'];
    }

    if (req.body && req.body.sessionId) {
      return req.body.sessionId;
    }

    if (req.query.sessionId) {
      return req.query.sessionId;
    }

    // Usa l'IP come fallback (non ideale per produzione)
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    return `session_${clientIP}_${Date.now()}`;
  }

  /**
   * Ottiene il contesto della sessione
   */
  getSessionContext(sessionId, req) {
    // Ottieni contesto esistente dalla sessione
    const existingContext = this.sessionStore.get(sessionId) || {};

    // Arricchisci con informazioni dalla richiesta
    const enrichedContext = {
      ...existingContext,
      hasExcelData: this.detectExcelData(req),
      hasEmailAddresses: this.detectEmailAddresses(req),
      hasDocument: this.detectDocuments(req),
      hasTemplate: this.detectTemplates(req),
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || `req_${Date.now()}`,
      ip: req.ip || req.connection.remoteAddress
    };

    return enrichedContext;
  }

  /**
   * Rileva dati Excel nella richiesta
   */
  detectExcelData(req) {
    if (req.body && req.body.messages) {
      const messageText = JSON.stringify(req.body.messages);
      return /excel|spreadsheet|foglio|tabella/i.test(messageText);
    }
    return false;
  }

  /**
   * Rileva indirizzi email nella richiesta
   */
  detectEmailAddresses(req) {
    if (req.body && req.body.messages) {
      const messageText = JSON.stringify(req.body.messages);
      return /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i.test(messageText);
    }
    return false;
  }

  /**
   * Rileva documenti nella richiesta
   */
  detectDocuments(req) {
    if (req.body && req.body.messages) {
      const messageText = JSON.stringify(req.body.messages);
      return /documento|file|pdf|word|allegato/i.test(messageText);
    }
    return false;
  }

  /**
   * Rileva template nella richiesta
   */
  detectTemplates(req) {
    if (req.body && req.body.messages) {
      const messageText = JSON.stringify(req.body.messages);
      return /template|modello|bozza/i.test(messageText);
    }
    return false;
  }

  /**
   * Salva l'intent nella sessione
   */
  saveIntentToSession(sessionId, intentResult) {
    const existingSession = this.sessionStore.get(sessionId) || {
      intents: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    // Aggiungi il nuovo intent
    existingSession.intents.push({
      ...intentResult,
      timestamp: new Date().toISOString()
    });

    // Mantieni solo gli ultimi 10 intent per evitare crescita eccessiva
    if (existingSession.intents.length > 10) {
      existingSession.intents = existingSession.intents.slice(-10);
    }

    existingSession.lastActivity = new Date().toISOString();

    this.sessionStore.set(sessionId, existingSession);
  }

  /**
   * Gestisce intent con confidence bassa
   */
  handleLowConfidenceIntent(req, res, intentResult) {
    const clarificationResponse = {
      intent: 'CLARIFICATION_NEEDED',
      confidence: intentResult.confidence,
      message: this.generateClarificationMessage(intentResult),
      suggestedQuestions: this.generateSuggestedQuestions(intentResult),
      originalIntent: intentResult.intent,
      requiresUserInput: true
    };

    return res.status(200).json({
      success: true,
      clarification: clarificationResponse,
      message: 'Richiesta di chiarimento necessaria'
    });
  }

  /**
   * Genera messaggio di chiarimento
   */
  generateClarificationMessage(intentResult) {
    const messages = {
      SEND_EMAIL: 'Non sono sicura se vuoi inviare delle email. Potresti specificare meglio?',
      ANALYZE_EXCEL: 'Vuoi che analizzi dei dati Excel? Potresti caricare il file o fornire più dettagli?',
      CREATE_EXCEL: 'Vuoi che crei un nuovo file Excel? Che tipo di contenuto dovrebbe avere?',
      PROCESS_DOCUMENT: 'Vuoi che elabori un documento? Che tipo di operazione dovrei fare?',
      GENERAL_CHAT: 'Potresti essere più specifico su cosa vorresti che facessi?'
    };

    return messages[intentResult.intent] || 'Potresti fornire più dettagli sulla tua richiesta?';
  }

  /**
   * Genera domande suggerite per chiarimenti
   */
  generateSuggestedQuestions(intentResult) {
    const questions = {
      SEND_EMAIL: [
        'Vuoi inviare email ai clienti?',
        'Hai una lista di destinatari?',
        'Che tipo di email vuoi inviare?'
      ],
      ANALYZE_EXCEL: [
        'Vuoi analizzare dati di vendita?',
        'Hai un file Excel da caricare?',
        'Che tipo di analisi ti serve?'
      ],
      CREATE_EXCEL: [
        'Vuoi un template per budget?',
        'Hai bisogno di un inventario?',
        'Che colonne dovrebbe avere?'
      ],
      PROCESS_DOCUMENT: [
        'Vuoi estrarre testo da un PDF?',
        'Hai un documento da convertire?',
        'Che tipo di elaborazione serve?'
      ],
      GENERAL_CHAT: [
        'Posso aiutarti con email o Excel?',
        'Vuoi creare qualcosa?',
        'Hai bisogno di analizzare dei dati?'
      ]
    };

    return questions[intentResult.intent] || ['Come posso aiutarti?'];
  }

  /**
   * Log dell'analisi intent
   */
  logIntentAnalysis(intentResult, message, sessionId) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      sessionId,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      messageLength: message.length,
      messagePreview: message.substring(0, 100),
      requiresConfirmation: intentResult.requiresConfirmation,
      suggestedAction: intentResult.suggestedAction,
      contextualHints: intentResult.contextualHints
    };

    console.log('[IntentAnalysis]', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Arricchisce il prompt per OpenRouter con il contesto dell'intent
   */
  enrichPromptWithIntent(originalMessages, intentResult) {
    if (!originalMessages || !Array.isArray(originalMessages)) {
      return originalMessages;
    }

    const systemMessage = originalMessages.find(msg => msg.role === 'system') || {
      role: 'system',
      content: 'Sei NYRA, un assistente AI che aiuta con email, Excel e gestione documenti.'
    };

    // Arricchisci il system message con il contesto dell'intent
    const enrichedSystemMessage = {
      ...systemMessage,
      content: this.buildEnrichedSystemPrompt(systemMessage.content, intentResult)
    };

    // Sostituisci o aggiungi il system message arricchito
    const otherMessages = originalMessages.filter(msg => msg.role !== 'system');
    return [enrichedSystemMessage, ...otherMessages];
  }

  /**
   * Costruisce un system prompt arricchito con il contesto dell'intent
   */
  buildEnrichedSystemPrompt(basePrompt, intentResult) {
    const intentContext = this.getIntentContext(intentResult);
    
    return `${basePrompt}

CONTESTO INTENT ANALISI:
- Intent rilevato: ${intentResult.intent}
- Confidence: ${(intentResult.confidence * 100).toFixed(1)}%
- Azione suggerita: ${intentResult.suggestedAction}
- Hint contestuali: ${intentResult.contextualHints.join(', ')}

${intentContext}

Rispondi in modo appropriato al contesto identificato.`;
  }

  /**
   * Ottiene il contesto specifico per l'intent
   */
  getIntentContext(intentResult) {
    const contexts = {
      SEND_EMAIL: 'L\'utente vuole inviare email. Fornisci assistenza per la preparazione e invio di email, inclusi template e destinatari.',
      ANALYZE_EXCEL: 'L\'utente vuole analizzare dati Excel. Fornisci insights, statistiche e visualizzazioni sui dati.',
      CREATE_EXCEL: 'L\'utente vuole creare un nuovo file Excel. Aiuta con la struttura, template e formattazione.',
      PROCESS_DOCUMENT: 'L\'utente vuole elaborare documenti. Fornisci assistenza per l\'estrazione e elaborazione di contenuti.',
      GENERAL_CHAT: 'L\'utente sta chattando in modo generale. Sii utile e proattivo nel suggerire funzionalità disponibili.'
    };

    return contexts[intentResult.intent] || 'Fornisci assistenza generale all\'utente.';
  }

  /**
   * Ottiene statistiche delle sessioni
   */
  getSessionStats() {
    const sessions = Array.from(this.sessionStore.values());
    const totalIntents = sessions.reduce((sum, session) => sum + session.intents.length, 0);
    
    const intentCounts = {};
    sessions.forEach(session => {
      session.intents.forEach(intent => {
        intentCounts[intent.intent] = (intentCounts[intent.intent] || 0) + 1;
      });
    });

    return {
      totalSessions: this.sessionStore.size,
      totalIntents,
      intentDistribution: intentCounts,
      averageConfidence: this.calculateAverageConfidence(sessions)
    };
  }

  /**
   * Calcola la confidence media
   */
  calculateAverageConfidence(sessions) {
    const allIntents = sessions.flatMap(session => session.intents);
    if (allIntents.length === 0) return 0;
    
    const totalConfidence = allIntents.reduce((sum, intent) => sum + intent.confidence, 0);
    return Math.round((totalConfidence / allIntents.length) * 100) / 100;
  }

  /**
   * Pulisce le sessioni vecchie
   */
  cleanupOldSessions(maxAgeHours = 24) {
    const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
    
    for (const [sessionId, session] of this.sessionStore.entries()) {
      if (new Date(session.lastActivity) < cutoffTime) {
        this.sessionStore.delete(sessionId);
      }
    }
  }
}

module.exports = IntentMiddleware;
