/**
 * NYRA Chat Routes - Gestisce le richieste chat con analisi intent
 * Integra Intent Middleware per analisi intelligente prima di chiamare OpenRouter
 */

const express = require('express');
const IntentMiddleware = require('../middleware/intentMiddleware');

const router = express.Router();

// Inizializza il middleware per l'analisi intent
const intentMiddleware = new IntentMiddleware();

// Middleware per logging delle richieste chat
router.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  console.log(`[Chat][${timestamp}] ${req.method} ${req.path} - IP: ${clientIP} - UA: ${userAgent}`);
  
  // Log del body per debug (senza dati sensibili)
  if (req.body && req.body.messages) {
    console.log(`[Chat] Richiesta con ${req.body.messages.length} messaggi`);
  }
  
  next();
});

// Applica il middleware di analisi intent a tutte le richieste POST
router.use(intentMiddleware.analyzeIntent());

// Endpoint principale per chat con analisi intent
router.post('/api/chat', async (req, res) => {
  try {
    // Verifica API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('[Chat] API key mancante nel broker');
      return res.status(500).json({ 
        error: 'Chat service unavailable',
        message: 'Servizio temporaneamente non disponibile'
      });
    }

    // Ottieni l'analisi dell'intent dal middleware
    const intentAnalysis = req.intentAnalysis;
    const sessionId = req.sessionId;

    console.log(`[Chat] Intent analizzato: ${intentAnalysis.intent} (confidence: ${intentAnalysis.confidence})`);

    // 1. DEBUG: Logga cosa arriva
    console.log('[Chat] Body ricevuto:', JSON.stringify(req.body, null, 2));

    // 2. Prepara il payload per OpenRouter
    let openRouterPayload;
    
    if (req.body.messages && req.body.model) {
      // Arricchisci i messaggi con il contesto dell'intent
      openRouterPayload = {
        ...req.body,
        messages: intentMiddleware.enrichPromptWithIntent(req.body.messages, intentAnalysis)
      };
      console.log('[Chat] Payload arricchito con intent context');
    } else {
      // Crea formato standard con contesto intent
      const systemPrompt = intentMiddleware.buildEnrichedSystemPrompt(
        "Sei NYRA, un assistente AI specializzato in email, Excel e gestione documenti.",
        intentAnalysis
      );

      openRouterPayload = {
        model: req.body.model || "anthropic/claude-3.5-sonnet",
        messages: [
          {
            role: "system", 
            content: systemPrompt
          },
          {
            role: "user", 
            content: `Dati richiesta: ${JSON.stringify(req.body, null, 2)}`
          }
        ]
      };
      console.log('[Chat] Payload creato con sistema intent-aware');
    }

    // 3. Aggiungi metadati dell'intent al payload
    openRouterPayload.intentMetadata = {
      analyzedIntent: intentAnalysis.intent,
      confidence: intentAnalysis.confidence,
      suggestedAction: intentAnalysis.suggestedAction,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    };

    // 4. Chiamata a OpenRouter con payload arricchito
    console.log('[Chat] Chiamata a OpenRouter API...');
    
    const response = await fetch('https://nyra-backend-c7zi.onrender.com/api/ai/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'NYRA Chat Service',
        'X-Intent': intentAnalysis.intent,
        'X-Confidence': intentAnalysis.confidence.toString(),
        'X-Session-Id': sessionId
      },
      body: JSON.stringify(openRouterPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Chat] Errore API:', response.status, errorText);
      
      return res.status(response.status).json({
        error: 'Chat API error',
        message: `Errore del servizio AI: ${response.status}`,
        details: errorText,
        intent: intentAnalysis.intent
      });
    }

    // 5. Risposta di successo con metadati intent
    const data = await response.json();
    console.log('[Chat] Chiamata completata con successo');
    
    // Arricchisci la risposta con i metadati dell'intent
    const enrichedResponse = {
      ...data,
      intentAnalysis: {
        intent: intentAnalysis.intent,
        confidence: intentAnalysis.confidence,
        suggestedAction: intentAnalysis.suggestedAction,
        contextualHints: intentAnalysis.contextualHints
      },
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    };
    
    res.json(enrichedResponse);
    
  } catch (error) {
    console.error('[Chat] Errore interno:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Errore interno del servizio chat',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Errore sconosciuto',
      intent: req.intentAnalysis?.intent || 'UNKNOWN'
    });
  }
});

// Endpoint per statistiche intent
router.get('/api/chat/intent-stats', (req, res) => {
  try {
    const stats = intentMiddleware.getSessionStats();
    const analyzerStats = intentMiddleware.intentAnalyzer.getIntentStats();
    
    res.json({
      sessionStats: stats,
      analyzerStats: analyzerStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Chat] Errore nel recupero statistiche:', error);
    res.status(500).json({
      error: 'Statistics error',
      message: 'Errore nel recupero delle statistiche'
    });
  }
});

// Endpoint per test dell'analisi intent
router.post('/api/chat/test-intent', (req, res) => {
  try {
    const { message, context = {} } = req.body;
    
    if (!message) {
      return res.status(400).json({
        error: 'Missing message',
        message: 'Messaggio richiesto per il test'
      });
    }

    const intentResult = intentMiddleware.intentAnalyzer.analyze(message, context);
    
    res.json({
      success: true,
      result: intentResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Chat] Errore nel test intent:', error);
    res.status(500).json({
      error: 'Intent test error',
      message: 'Errore nel test dell\'analisi intent',
      details: error.message
    });
  }
});

// Endpoint per cleanup sessioni
router.post('/api/chat/cleanup', (req, res) => {
  try {
    const { maxAgeHours = 24 } = req.body;
    
    intentMiddleware.cleanupOldSessions(maxAgeHours);
    
    const stats = intentMiddleware.getSessionStats();
    
    res.json({
      success: true,
      message: 'Cleanup completato',
      remainingSessions: stats.totalSessions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Chat] Errore nel cleanup:', error);
    res.status(500).json({
      error: 'Cleanup error',
      message: 'Errore nel cleanup delle sessioni'
    });
  }
});

// Health check per il servizio chat
router.get('/api/chat/health', (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const stats = intentMiddleware.getSessionStats();
  
  res.json({
    status: apiKey ? 'healthy' : 'unhealthy',
    service: 'NYRA Chat Service with Intent Analysis',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!apiKey,
    activeSessions: stats.totalSessions,
    totalIntentsAnalyzed: stats.totalIntents,
    averageConfidence: stats.averageConfidence
  });
});

// Endpoint per aggiungere nuovi intent (per estensibilità)
router.post('/api/chat/add-intent', (req, res) => {
  try {
    const { name, config } = req.body;
    
    if (!name || !config) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'Nome e configurazione intent richiesti'
      });
    }

    intentMiddleware.intentAnalyzer.addIntent(name, config);
    
    res.json({
      success: true,
      message: `Intent '${name}' aggiunto con successo`,
      totalIntents: intentMiddleware.intentAnalyzer.getIntentStats().totalIntents,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Chat] Errore nell\'aggiunta intent:', error);
    res.status(500).json({
      error: 'Add intent error',
      message: 'Errore nell\'aggiunta del nuovo intent'
    });
  }
});

module.exports = router;
