// oauth-broker/routes/openrouter.js

const express = require('express');
const router = express.Router();

// Middleware per logging delle richieste
router.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  console.log(`[OpenRouter][${timestamp}] ${req.method} ${req.path} - IP: ${clientIP} - UA: ${userAgent}`);
  
  // Log del body per debug (senza dati sensibili)
  if (req.body && req.body.messages) {
    console.log(`[OpenRouter] Richiesta con ${req.body.messages.length} messaggi`);
  }
  
  next();
});

// Endpoint principale per OpenRouter
router.post('/api/openrouter', async (req, res) => {
  try {
    // Verifica API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('[OpenRouter] API key mancante nel broker');
      return res.status(500).json({ 
        error: 'OpenRouter service unavailable',
        message: 'Servizio temporaneamente non disponibile'
      });
    }

    // 1. DEBUG: Logga cosa arriva da n8n
    console.log('[DEBUG] Body da n8n:', JSON.stringify(req.body, null, 2));

    // 2. Trasforma il body per OpenRouter
    let openRouterPayload;
    
    if (req.body.messages && req.body.model) {
      // Se ha già il formato corretto, usalo
      openRouterPayload = req.body;
      console.log('[OpenRouter] Usando formato esistente');
    } else {
      // Altrimenti crea formato standard
      openRouterPayload = {
        model: req.body.model || "anthropic/claude-3.5-sonnet",
        messages: req.body.messages || [
          {
            role: "system", 
            content: "Sei un assistente AI che aiuta a creare e gestire eventi calendario. Analizza i dati forniti e fornisci una risposta utile."
          },
          {
            role: "user", 
            content: `Dati evento: ${JSON.stringify(req.body, null, 2)}`
          }
        ]
      };
      console.log('[OpenRouter] Payload trasformato per OpenRouter:', JSON.stringify(openRouterPayload, null, 2));
    }

    // Chiamata sicura a OpenRouter
    console.log('[OpenRouter] Chiamata a OpenRouter API...');
    
    const response = await fetch('https://nyra-backend-c7zi.onrender.com/api/ai/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'NYRA OAuth Broker'
      },
      body: JSON.stringify(openRouterPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenRouter] Errore API:', response.status, errorText);
      
      return res.status(response.status).json({
        error: 'OpenRouter API error',
        message: `Errore del servizio AI: ${response.status}`,
        details: errorText
      });
    }

    // Risposta di successo
    const data = await response.json();
    console.log('[OpenRouter] Chiamata completata con successo');
    
    res.json(data);
    
  } catch (error) {
    console.error('[OpenRouter] Errore interno:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Errore interno del servizio',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Errore sconosciuto'
    });
  }
});

// Health check per OpenRouter
router.get('/api/openrouter/health', (req, res) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  res.json({
    status: apiKey ? 'healthy' : 'unhealthy',
    service: 'OpenRouter Proxy',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!apiKey
  });
});

module.exports = router;
