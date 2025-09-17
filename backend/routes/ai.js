const express = require('express');
const openrouterService = require('../services/openrouter');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'NYRA Backend'
  });
});

// POST /api/ai/chat - Chat with OpenRouter
router.post('/chat', async (req, res) => {
  try {
    const { messages, model, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Messages array is required' 
      });
    }

    // Add context if provided
    let processedMessages = messages;
    if (context) {
      processedMessages = [
        { role: 'system', content: `Contesto: ${context}` },
        ...messages
      ];
    }

    const response = await openrouterService.getResponseWithContext(
      processedMessages,
      req.user || null,
      messages[messages.length - 1]?.content || '',
      model || 'anthropic/claude-3.5-sonnet'
    );

    // Formato compatibile con OpenRouter che il frontend si aspetta
    res.json({
      choices: [{
        message: {
          content: response
        }
      }],
      model: model || 'anthropic/claude-3.5-sonnet',
      usage: {}  // OpenRouter lo include ma possiamo lasciarlo vuoto
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      error: 'AI chat failed',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// GET /api/ai/test - Test AI connection
router.get('/test', async (req, res) => {
  try {
    const testMessages = [
      { role: 'user', content: 'Ciao, rispondi solo "OK" per testare la connessione.' }
    ];

    const response = await openrouterService.getResponse(testMessages);
    const isWorking = response.toLowerCase().includes('ok');

    res.json({
      success: true,
      status: isWorking ? 'connected' : 'error',
      response,
      timestamp: new Date().toISOString(),
      model: 'anthropic/claude-3.5-sonnet'
    });

  } catch (error) {
    console.error('AI test error:', error);
    res.status(500).json({ 
      success: false,
      status: 'error',
      error: 'AI connection test failed',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// POST /api/ai/analyze-text - Analyze text with AI
router.post('/analyze-text', async (req, res) => {
  try {
    const { text, analysisType } = req.body;

    if (!text) {
      return res.status(400).json({ 
        error: 'Text is required' 
      });
    }

    const analysisPrompts = {
      sentiment: 'Analizza il sentiment del seguente testo (positivo, negativo, neutro):',
      summary: 'Riassumi il seguente testo in poche frasi:',
      keywords: 'Estrai le parole chiave principali dal seguente testo:',
      intent: 'Identifica l\'intento principale del seguente testo:',
      language: 'Identifica la lingua del seguente testo:',
      custom: 'Analizza il seguente testo secondo le tue conoscenze:'
    };

    const prompt = analysisPrompts[analysisType] || analysisPrompts.custom;
    const fullPrompt = `${prompt}\n\n"${text}"`;

    const response = await openrouterService.getResponse([
      { role: 'user', content: fullPrompt }
    ]);

    res.json({
      success: true,
      analysis: response,
      type: analysisType || 'custom',
      textLength: text.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({ 
      error: 'Text analysis failed',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// POST /api/ai/generate-content - Generate content with AI
router.post('/generate-content', async (req, res) => {
  try {
    const { prompt, contentType, length, style } = req.body;

    if (!prompt) {
      return res.status(400).json({ 
        error: 'Prompt is required' 
      });
    }

    const contentTypes = {
      email: 'email professionale',
      report: 'report dettagliato',
      summary: 'riassunto conciso',
      list: 'lista organizzata',
      description: 'descrizione dettagliata',
      custom: 'contenuto personalizzato'
    };

    const styles = {
      formal: 'tono formale e professionale',
      casual: 'tono casual e amichevole',
      technical: 'tono tecnico e preciso',
      creative: 'tono creativo e originale',
      default: 'tono appropriato al contesto'
    };

    const lengthOptions = {
      short: 'breve e conciso',
      medium: 'lunghezza media',
      long: 'dettagliato e completo',
      default: 'lunghezza appropriata'
    };

    const enhancedPrompt = `
      Genera un ${contentTypes[contentType] || contentTypes.custom} basato su questa richiesta: "${prompt}"
      
      ${style ? `Stile: ${styles[style] || styles.default}` : ''}
      ${length ? `Lunghezza: ${lengthOptions[length] || lengthOptions.default}` : ''}
      
      Assicurati che il contenuto sia:
      - Coerente e ben strutturato
      - Appropriato al contesto
      - Facile da leggere e comprendere
    `;

    const response = await openrouterService.getResponse([
      { role: 'system', content: 'Sei un assistente per la generazione di contenuti. Genera contenuti di alta qualità.' },
      { role: 'user', content: enhancedPrompt }
    ]);

    res.json({
      success: true,
      content: response,
      contentType: contentType || 'custom',
      style: style || 'default',
      length: length || 'default',
      wordCount: response.split(' ').length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({ 
      error: 'Content generation failed',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

module.exports = router;
