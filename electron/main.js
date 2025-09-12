const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const config = require('./config');
const OAuthDatabase = require('./modules/oauthDatabase');
const GoogleOAuthService = require('./modules/googleOAuth');
const OpenRouterService = require('./modules/openRouterService');

// Import node-fetch for HTTP requests (fallback to global fetch if available)
let fetch = null;
try {
  const nodeFetch = require('node-fetch');
  fetch = nodeFetch.default || nodeFetch;
  console.log('[NYRA] node-fetch loaded successfully');
} catch (error) {
  // Use global fetch if available (Node 18+)
  if (global.fetch) {
    fetch = global.fetch;
    console.log('[NYRA] Using global fetch');
  } else {
    console.error('[NYRA] No fetch available, HTTP requests will fail');
  }
}

// System browser integration only - Puppeteer automation removed

require('dotenv').config();

// Initialize OAuth services
let oauthDb = null;
let googleOAuth = null;

async function initializeOAuth() {
  try {
    const dbPath = process.env.OAUTH_DATABASE_PATH || 'nyra-oauth.db';
    oauthDb = new OAuthDatabase(dbPath);
    await oauthDb.init();
    
    googleOAuth = new GoogleOAuthService();
    
    console.log('[OAuth] Initialized OAuth services successfully');
  } catch (error) {
    console.error('[OAuth] Failed to initialize OAuth services:', error);
  }
}

// Variabili globali
let mainWindow;
let devServerProcess;
let automationInProgress = false;

// Sistema di privacy e sicurezza
class PrivacyManager {
  constructor() {
    this.sensitiveData = new Set(['password', 'token', 'key', 'secret', 'auth']);
    this.dataRetention = {
      logs: 7 * 24 * 60 * 60 * 1000, // 7 giorni
      sessions: 30 * 24 * 60 * 60 * 1000, // 30 giorni
      testResults: 24 * 60 * 60 * 1000 // 24 ore
    };
  }

  sanitizeData(data) {
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.sensitiveData.has(key.toLowerCase())) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          sanitized[key] = this.sanitizeData(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    return data;
  }

  validateDataRetention() {
    const now = Date.now();
    
    // Pulisci log vecchi
    logger.logs = logger.logs.filter(log => 
      now - new Date(log.timestamp).getTime() < this.dataRetention.logs
    );
    
    // Pulisci sessioni scadute
    sessionManager.cleanupExpiredSessions();
    
    // Pulisci test results vecchi
    if (automationTester && automationTester.testResults) {
      const testResults = automationTester.testResults;
      for (const [website, result] of testResults.entries()) {
        if (now - result.timestamp > this.dataRetention.testResults) {
          testResults.delete(website);
        }
      }
    }
    
    logger.log('info', 'Data retention cleanup completed');
  }

  encryptSensitiveData(data) {
    // Implementazione base di cifratura per dati sensibili
    // In produzione, usare librerie di crittografia robuste
    if (typeof data === 'string') {
      return Buffer.from(data).toString('base64');
    }
    return data;
  }

  decryptSensitiveData(encryptedData) {
    try {
      return Buffer.from(encryptedData, 'base64').toString();
    } catch (error) {
      logger.log('warn', 'Failed to decrypt data:', error.message);
      return encryptedData;
    }
  }
}

const privacyManager = new PrivacyManager();

// Sistema di gestione sessioni sicuro
class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.sessionTimeout = 30 * 60 * 1000; // 30 minuti
  }

  createSession(userId, data = {}) {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      userId,
      data,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    
    this.sessions.set(sessionId, session);
    logger.log('info', `Session created for user ${userId}`);
    return sessionId;
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    // Verifica timeout
    if (Date.now() - session.lastActivity > this.sessionTimeout) {
      this.sessions.delete(sessionId);
      logger.log('warn', `Session ${sessionId} expired`);
      return null;
    }
    
    // Aggiorna attività
    session.lastActivity = Date.now();
    return session;
  }

  updateSession(sessionId, data) {
    const session = this.getSession(sessionId);
    if (session) {
      session.data = { ...session.data, ...data };
      session.lastActivity = Date.now();
      logger.log('info', `Session ${sessionId} updated`);
    }
  }

  destroySession(sessionId) {
    this.sessions.delete(sessionId);
    logger.log('info', `Session ${sessionId} destroyed`);
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        logger.log('info', `Cleaned up expired session ${sessionId}`);
      }
    }
  }
}

const sessionManager = new SessionManager();

// Miglioramento della gestione sessioni con privacy
class SecureSessionManager extends SessionManager {
  constructor() {
    super();
    this.privacyManager = privacyManager;
  }

  createSession(userId, data = {}) {
    // Sanitizza dati sensibili
    const sanitizedData = this.privacyManager.sanitizeData(data);
    
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      userId,
      data: sanitizedData,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      encrypted: false
    };
    
    this.sessions.set(sessionId, session);
    logger.log('info', `Secure session created for user ${userId}`);
    return sessionId;
  }

  updateSession(sessionId, data) {
    const session = this.getSession(sessionId);
    if (session) {
      const sanitizedData = this.privacyManager.sanitizeData(data);
      session.data = { ...session.data, ...sanitizedData };
      session.lastActivity = Date.now();
      logger.log('info', `Secure session ${sessionId} updated`);
    }
  }

  storeSensitiveData(sessionId, key, value) {
    const session = this.getSession(sessionId);
    if (session) {
      const encryptedValue = this.privacyManager.encryptSensitiveData(value);
      session.data[key] = encryptedValue;
      session.encrypted = true;
      session.lastActivity = Date.now();
      logger.log('info', `Sensitive data stored for session ${sessionId}`);
    }
  }

  getSensitiveData(sessionId, key) {
    const session = this.getSession(sessionId);
    if (session && session.data[key] && session.encrypted) {
      return this.privacyManager.decryptSensitiveData(session.data[key]);
    }
    return session?.data[key];
  }
}

// Sostituisci il sessionManager esistente
const secureSessionManager = new SecureSessionManager();

// Sistema di gestione errori centralizzato
class ErrorHandler {
  constructor() {
    this.errorTypes = {
      NETWORK: 'network_error',
      TIMEOUT: 'timeout_error',
      SELECTOR: 'selector_error',
      VISION: 'vision_error',
      AUTHENTICATION: 'auth_error',
      RATE_LIMIT: 'rate_limit_error'
    };
  }

  classifyError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return this.errorTypes.NETWORK;
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return this.errorTypes.TIMEOUT;
    }
    if (message.includes('selector') || message.includes('element not found')) {
      return this.errorTypes.SELECTOR;
    }
    if (message.includes('vision') || message.includes('api')) {
      return this.errorTypes.VISION;
    }
    if (message.includes('auth') || message.includes('unauthorized')) {
      return this.errorTypes.AUTHENTICATION;
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return this.errorTypes.RATE_LIMIT;
    }
    
    return 'unknown_error';
  }

  getErrorMessage(errorType, context = '') {
    const messages = {
      [this.errorTypes.NETWORK]: 'Problema di connessione. Verifica la tua connessione internet.',
      [this.errorTypes.TIMEOUT]: 'Il sito sta impiegando troppo tempo a rispondere. Riprova tra qualche secondo.',
      [this.errorTypes.SELECTOR]: 'Il sito ha cambiato struttura. Aggiornamento in corso...',
      [this.errorTypes.VISION]: 'Sistema di visione temporaneamente non disponibile. Uso metodo alternativo.',
      [this.errorTypes.AUTHENTICATION]: 'Problema di autenticazione. Verifica le credenziali.',
      [this.errorTypes.RATE_LIMIT]: 'Troppe richieste. Aspetta un momento prima di riprovare.'
    };
    
    return messages[errorType] || 'Si è verificato un errore imprevisto. Riprova.';
  }

  async handleError(error, context = '') {
    const errorType = this.classifyError(error);
    const userMessage = this.getErrorMessage(errorType, context);
    
    logger.log('error', `Error in ${context}:`, {
      type: errorType,
      message: error.message,
      stack: error.stack
    });
    
    return {
      success: false,
      errorType,
      userMessage,
      technicalMessage: error.message,
      context
    };
  }
}

const errorHandler = new ErrorHandler();

// Sistema di monitoraggio per rilevare attività sospette
class SecurityMonitor {
  constructor() {
    this.suspiciousPatterns = [
      /rate.*limit/i,
      /too.*many.*requests/i,
      /blocked.*ip/i,
      /suspicious.*activity/i
    ];
    this.alertThreshold = 5;
    this.alerts = [];
  }

  checkForSuspiciousActivity(error, context) {
    const message = error.message.toLowerCase();
    
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(message)) {
        this.recordAlert({
          type: 'suspicious_activity',
          context,
          error: error.message,
          timestamp: Date.now()
        });
        return true;
      }
    }
    
    return false;
  }

  recordAlert(alert) {
    this.alerts.push(alert);
    
    if (this.alerts.length > this.alertThreshold) {
      logger.log('warn', 'Multiple security alerts detected', {
        count: this.alerts.length,
        recentAlerts: this.alerts.slice(-3)
      });
    }
    
    logger.log('warn', 'Security alert recorded:', alert);
  }

  getAlerts() {
    return this.alerts;
  }

  clearAlerts() {
    this.alerts = [];
  }
}

const securityMonitor = new SecurityMonitor();

// Miglioramento dell'ErrorHandler con monitoraggio sicurezza
class SecureErrorHandler extends ErrorHandler {
  constructor() {
    super();
    this.securityMonitor = securityMonitor;
  }

  async handleError(error, context = '') {
    // Controlla attività sospette
    this.securityMonitor.checkForSuspiciousActivity(error, context);
    
    const errorType = this.classifyError(error);
    const userMessage = this.getErrorMessage(errorType, context);
    
    // Sanitizza dati sensibili nei log
    const sanitizedError = privacyManager.sanitizeData({
      type: errorType,
      message: error.message,
      stack: error.stack
    });
    
    logger.log('error', `Error in ${context}:`, sanitizedError);
    
    return {
      success: false,
      errorType,
      userMessage,
      technicalMessage: error.message,
      context
    };
  }
}

// Sostituisci l'errorHandler esistente
const secureErrorHandler = new SecureErrorHandler();

// Sistema di rate limiting per prevenire abusi
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.maxRequests = 10; // Max 10 richieste per minuto
    this.windowMs = 60 * 1000; // 1 minuto
  }

  isAllowed(userId) {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Rimuovi richieste vecchie
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      logger.log('warn', `Rate limit exceeded for user ${userId}`);
      return false;
    }
    
    // Aggiungi nuova richiesta
    recentRequests.push(now);
    this.requests.set(userId, recentRequests);
    
    return true;
  }

  getRemainingRequests(userId) {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxRequests - recentRequests.length);
  }
}

const rateLimiter = new RateLimiter();

// Sistema di logging avanzato per debugging
class AutomationLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      sessionId: this.getSessionId()
    };
    
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
  }

  getSessionId() {
    return Date.now().toString(36);
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}

const logger = new AutomationLogger();

// Sistema di retry e fallback robusto
class RetryManager {
  constructor() {
    this.maxRetries = 3;
    this.baseDelay = 1000;
  }

  async executeWithRetry(operation, context = '') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.log('info', `Attempt ${attempt}/${this.maxRetries} for ${context}`);
        return await operation();
      } catch (error) {
        lastError = error;
        logger.log('warn', `Attempt ${attempt} failed for ${context}:`, error.message);
        
        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          logger.log('info', `Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    logger.log('error', `All ${this.maxRetries} attempts failed for ${context}:`, lastError.message);
    throw new Error(`Operation failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }
}

const retryManager = new RetryManager();

// Sistema di fallback per selettori DOM
class SelectorFallback {
  constructor() {
    this.fallbackSelectors = {
      'amazon': {
        search: [
          '#twotabsearchtextbox',
          'input[name="field-keywords"]',
          'input[type="text"]',
          'input[placeholder*="search"]',
          'input[placeholder*="Search"]'
        ],
        results: [
          '[data-component-type="s-search-result"]',
          '.s-result-item',
          '[data-asin]',
          '.sg-col-inner'
        ]
      },
      'generic': {
        search: [
          'input[type="text"]',
          'input[type="search"]',
          'input[name*="search"]',
          'input[name*="q"]',
          'input[placeholder*="search"]',
          'input[placeholder*="Search"]'
        ],
        results: [
          'a[href]',
          '.result',
          '.item',
          '.product',
          '[data-testid]'
        ]
      }
    };
  }

  async findElementWithFallback(page, selectors, context = '') {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          logger.log('info', `Found element with selector: ${selector} in ${context}`);
          return element;
        }
      } catch (error) {
        logger.log('warn', `Selector failed: ${selector} in ${context}:`, error.message);
      }
    }
    
    logger.log('error', `No element found with any selector in ${context}`);
    return null;
  }

  getFallbackSelectors(website, elementType) {
    const siteSelectors = this.fallbackSelectors[website.toLowerCase()] || this.fallbackSelectors.generic;
    return siteSelectors[elementType] || siteSelectors.search;
  }
}

const selectorFallback = new SelectorFallback();

// Classe Computer Vision AI migliorata
// Browser automation functionality removed - using system browser only

// Funzione per creare finestra principale
function createWindow() {
  console.log('[MAIN] Preload path:', path.join(__dirname, 'preload.js'));
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false
  });

  // Carica app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools(); // Decommentare per debug
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers MINIMAL
ipcMain.handle('ping', async () => {
  return 'pong';
});

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

// Handler per funzioni orarie sicure
ipcMain.handle('nyra:getBootTime', async () => {
  return new Date().toISOString();
});

ipcMain.handle('nyra:getSystemTime', async () => {
  return {
    now: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome'
  };
});

// N8N Integration Handler - Proxy for calendar reminders
ipcMain.handle('n8n:createReminder', async (_evt, payload) => {
  try {
    if (!fetch) {
      console.error('[NYRA] Fetch not available in main process');
      return { ok: false, status: 0, error: 'HTTP client not available' };
    }

    // URL hardcoded per ora (verrà aggiornato con la nuova config)
    const webhookUrl = 'http://localhost:5678/webhook/nyra/text';
    console.log(`[NYRA] Creating reminder via n8n: ${webhookUrl}`);
    console.log(`[NYRA] Payload:`, payload);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const status = response.status;
    const ok = response.ok;
    const text = await response.text().catch(() => '');
    
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Se fallisce il parse JSON, lascia json = null
    }
    
    console.log('[N8N][MAIN][RESPONSE]', status, text.slice(0, 500));
    
    return { 
      ok: ok, 
      status: status, 
      body: text, 
      json: json 
    };
    
  } catch (err) {
    console.error('[N8N][MAIN][ERROR]', err);
    throw err;
  }
});

// OpenRouter Handler - NUOVO
ipcMain.handle('openrouter:call', async (event, messages, model) => {
  try {
    const openRouter = new OpenRouterService();
    
    // Valida configurazione
    openRouter.validateConfiguration();
    
    // Chiama OpenRouter
    const response = await openRouter.chat(messages, { model });
    
    console.log('[OpenRouter][IPC] Chiamata completata con successo');
    return { success: true, content: response };
    
  } catch (error) {
    console.error('[OpenRouter][IPC] Errore:', error);
    return { 
      success: false, 
      error: error.message || 'Errore sconosciuto OpenRouter' 
    };
  }
});

// System browser handler - opens URLs externally
ipcMain.handle('start-automation', async (event, type, data) => {
  try {
    console.log('🚀 Starting API-based automation for:', type, data);
    
    if (automationInProgress) {
      return { success: false, message: 'Automazione già in corso' };
    }

    automationInProgress = true;
    
    if (type === 'universal-automation') {
      const { action, query, site } = data;
      console.log(`Action: "${action}"`);
      console.log(`Query: "${query}"`);
      console.log(`Site: "${site}"`);
      
      // Validazione input
      if (!query || query.trim() === '' || query === 'undefined') {
        console.error('❌ Invalid query detected:', query);
        automationInProgress = false;
        return {
          success: false,
          message: 'Query di ricerca mancante o non valida',
          error: 'Invalid query'
        };
      }
      
      if (!site || site === 'undefined' || site.includes('undefined')) {
        console.error('❌ Invalid site URL detected:', site);
        automationInProgress = false;
        return { 
          success: false, 
          error: 'Invalid site URL',
          message: 'URL del sito non valido o mancante'
        };
      }
      
      // Status update
      event.sender.send('automation-status', `Sto preparando l'automazione via API...`);
      
      try {
        // Costruzione URL per apertura nel browser di sistema
        let targetUrl;
        
        if (action === 'search_on_site' && site.toLowerCase().includes('amazon')) {
          // Estrai termini di ricerca per Amazon
          let searchTerms = query.replace(/\b(cerca|trova|fammi vedere|compra|apri|mostra|cercami|acquista|su|in|da)\b/gi, '').trim();
          searchTerms = searchTerms.replace(/amazon/gi, '').trim();
          
          if (!searchTerms) searchTerms = query;
          
          targetUrl = `https://www.amazon.it/s?k=${encodeURIComponent(searchTerms)}`;
        } else {
          // URL generico per altri siti
          targetUrl = site.startsWith('http') ? site : `https://${site}`;
        }
        
        console.log(`🌐 Opening URL in system browser: ${targetUrl}`);
        event.sender.send('automation-status', `Apro ${targetUrl} nel browser di sistema...`);
        
        // Apri nel browser di sistema invece di automazione
        await shell.openExternal(targetUrl);
        
        automationInProgress = false;
        return { 
          success: true, 
          message: `Ho aperto ${targetUrl} nel browser di sistema`,
          data: { url: targetUrl, method: 'system_browser' }
        };
        
      } catch (error) {
        console.error('❌ API automation error:', error);
        automationInProgress = false;
        return { 
          success: false, 
          error: error.message,
          message: 'Errore nell\'apertura del sito'
        };
      }
    }
    
    return { success: false, error: 'Invalid automation type' };

  } catch (error) {
    console.error('API automation setup error:', error);
    automationInProgress = false;
    return { success: false, error: error.message };
  }
});
        

          



          

          


        

        


// 🔧 FIX: Handler per chiudere manualmente il browser
ipcMain.handle('close-browser', async (event) => {
  try {
    console.log('🔄 Closing browser manually...');
    
    // Reset automation state
    automationInProgress = false;
    
            event.sender.send('automation-status', 'Browser chiuso manualmente');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error closing browser:', error);
    return { success: false, error: error.message };
  }
});

// 🔧 FIX: Handler per reset automation
ipcMain.handle('reset-automation', async (event) => {
  try {
    automationInProgress = false;
    event.sender.send('automation-status', 'Sistema resettato');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 🔧 FIX: Handler per test IPC
ipcMain.handle('test-ipc', async (event) => {
  return { success: true, message: 'IPC connection successful' };
});

// 🔧 FIX: Handler per send message
ipcMain.handle('send-message', async (event, message) => {
  console.log('📨 Received message:', message);
  return { success: true, received: message };
});

// Handler per log messages
ipcMain.handle('log-message', async (event, message) => {
  console.log('🖥️ Renderer log:', message);
  return { success: true };
});

// Handler per send message (event listener)
ipcMain.on('send-message', (event, message) => {
  console.log('📨 Received message from renderer:', message);
});

// Handler per close browser (event listener)
ipcMain.on('close-browser', (event) => {
  console.log('🔒 Closing browser...');
  // Implementazione per chiudere browser se necessario
});

// Handler per reset automation (event listener)
ipcMain.on('reset-automation', (event) => {
  console.log('🔄 Resetting automation...');
  automationInProgress = false;
});

// Handler per store operations
ipcMain.handle('store-get', async (event, key) => {
  try {
    // Implementazione semplice per ora
    return null;
  } catch (error) {
    console.error('❌ Store get error:', error);
    return null;
  }
});

ipcMain.handle('store-set', async (event, key, value) => {
  try {
    // Implementazione semplice per ora
    return true;
  } catch (error) {
    console.error('❌ Store set error:', error);
    return false;
  }
});

// Vision monitoring handlers removed - functionality not used

// Sistema di testing semplificato (solo apertura browser)
class SimpleTester {
  constructor() {
    this.testResults = new Map();
  }

  // Testing methods disabled - system browser only
  
  getTestResults() {
    return [];
  }
  
  async runAllTests() {
    return { success: false, error: 'Browser automation testing disabled' };
  }
}

// Automation testing handlers removed - functionality not used

// Miglioramento della funzione startAutomation con gestione errori robusta
ipcMain.handle('startAutomation', async (event, { action, site, query }) => {
  try {
    const userId = event.sender.id;
    
    // Rate limiting
    if (!rateLimiter.isAllowed(userId)) {
      return secureErrorHandler.handleError(
        new Error('Rate limit exceeded'),
        'startAutomation'
      );
    }
    
    // Validazione input
    if (!site || site === 'undefined' || site.includes('undefined')) {
      return secureErrorHandler.handleError(
        new Error('Invalid site parameter'),
        'startAutomation'
      );
    }
    
    logger.log('info', `Starting automation: ${action} on ${site} with query: ${query}`);
    
    // System browser automation - open URL externally
    let targetUrl;
    
    if (site.toLowerCase().includes('amazon')) {
      const searchTerms = query.replace(/\b(cerca|trova|fammi vedere|compra|apri|mostra|cercami|acquista|su|in|da)\b/gi, '').trim();
      targetUrl = `https://www.amazon.it/s?k=${encodeURIComponent(searchTerms)}`;
    } else {
      targetUrl = site.startsWith('http') ? site : `https://${site}`;
    }
    
    await shell.openExternal(targetUrl);
    logger.log('info', `Opened ${targetUrl} in system browser`);
    
    const result = {
      success: true,
      message: `Opened ${targetUrl} in system browser`,
      url: targetUrl
    };
    return { success: true, result };
    
  } catch (error) {
    return await secureErrorHandler.handleError(error, 'startAutomation');
  }
});



// Sistema di pulizia automatica dei dati
setInterval(() => {
  privacyManager.validateDataRetention();
}, 60 * 60 * 1000); // Ogni ora

// Miglioramento delle funzioni IPC esistenti con i nuovi sistemi
ipcMain.handle('get-logs', async (event) => {
  try {
    const logs = logger.getLogs();
    const sanitizedLogs = privacyManager.sanitizeData(logs);
    return {
      success: true,
      logs: sanitizedLogs
    };
  } catch (error) {
    return await secureErrorHandler.handleError(error, 'get-logs');
  }
});

ipcMain.handle('clear-logs', async (event) => {
  try {
    logger.clearLogs();
    return { success: true };
  } catch (error) {
    return await secureErrorHandler.handleError(error, 'clear-logs');
  }
});

ipcMain.handle('get-security-alerts', async (event) => {
  try {
    const alerts = securityMonitor.getAlerts();
    return {
      success: true,
      alerts
    };
  } catch (error) {
    return await secureErrorHandler.handleError(error, 'get-security-alerts');
  }
});

ipcMain.handle('clear-security-alerts', async (event) => {
  try {
    securityMonitor.clearAlerts();
    return { success: true };
  } catch (error) {
    return await secureErrorHandler.handleError(error, 'clear-security-alerts');
  }
});



// Handler per ActionExecutor
ipcMain.handle('execute-action', async (event, actionData) => {
  try {
    console.log('🎯 ActionExecutor: Esecuzione azione:', actionData);
    
    const { intent, platform, query, actionRequired, userConfirmed, reasoning } = actionData;
    
    if (intent === 'search_product' && platform === 'amazon') {
      // Apertura Amazon nel browser di sistema
      const searchTerms = query.replace(/\b(cerca|trova|fammi vedere|compra|apri|mostra|cercami|acquista|su|in|da)\b/gi, '').trim();
      const amazonUrl = `https://www.amazon.it/s?k=${encodeURIComponent(searchTerms)}`;
      
      try {
        await shell.openExternal(amazonUrl);
        return {
          success: true,
          message: `Ho aperto Amazon con la ricerca: "${searchTerms}"`,
          data: { url: amazonUrl, method: 'system_browser' }
        };
      } catch (error) {
        return {
          success: false,
          message: 'Errore nell\'apertura di Amazon',
          error: error.message
        };
      }
    } else if (intent === 'apply_price_filter' && platform === 'amazon') {
      return {
        success: false,
        message: 'Filtri prezzo non ancora supportati. Apri Amazon e applica i filtri manualmente.'
      };
    } else if (intent === 'browser_automation') {
      return {
        success: false,
        message: 'Browser automation removed. Using system browser only.'
      };
    } else {
      return {
        success: false,
        message: `Intent "${intent}" o piattaforma "${platform}" non ancora supportati.`
      };
    }
    
  } catch (error) {
    console.error('❌ ActionExecutor: Errore nell\'esecuzione azione:', error);
    return {
      success: false,
      message: 'Si è verificato un errore nell\'esecuzione dell\'azione. Riprova.',
      error: error.message
    };
  }
});

// Handler per apertura Amazon sicura
ipcMain.handle('apri-amazon', async (event, queryOrUrl) => {
  try {
    console.log('🛒 Apertura Amazon per query/URL:', queryOrUrl);
    
    let amazonUrl;
    let finalQuery = '';
    
    // Controlla se è già un URL completo
    if (queryOrUrl.startsWith('http')) {
      amazonUrl = queryOrUrl;
      console.log('🔗 Apertura URL Amazon personalizzato:', amazonUrl);
    } else {
      // Normalizza la query
      const normalizedQuery = queryOrUrl
        .replace(/\b(cerca|trova|cercami|mostrami|apri|vai su|su amazon|su google)\b/gi, '')
        .replace(/\b(e|mi|un|una|il|la|lo|gli|le|sto|stavo|vorrei|serve|bisogno)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Correggi nomi prodotti
      const productCorrections = {
        'iphone 16': 'iPhone 16',
        'iphone 15': 'iPhone 15',
        'iphone 14': 'iPhone 14',
        'iphone 13': 'iPhone 13',
        'iphone 12': 'iPhone 12',
        'iphone 11': 'iPhone 11',
        'iphone se': 'iPhone SE',
        'iphone pro': 'iPhone Pro',
        'iphone pro max': 'iPhone Pro Max'
      };
      
      finalQuery = normalizedQuery;
      Object.entries(productCorrections).forEach(([wrong, correct]) => {
        const regex = new RegExp(wrong, 'gi');
        finalQuery = finalQuery.replace(regex, correct);
      });
      
      // Costruisci URL standard
      amazonUrl = `https://www.amazon.it/s?k=${encodeURIComponent(finalQuery)}`;
      console.log('🔗 Apertura URL Amazon standard:', amazonUrl);
    }
    
    // Apri nel browser di sistema
    await shell.openExternal(amazonUrl);
    
    return {
      success: true,
      message: `Ho aperto Amazon con la ricerca: "${finalQuery || 'URL personalizzato'}"`,
      url: amazonUrl
    };
    
  } catch (error) {
    console.error('❌ Errore apertura Amazon:', error);
    return {
      success: false,
      message: 'Errore nell\'apertura di Amazon',
      error: error.message
    };
  }
});

// Handler per fact checking (apertura sito per verifica manuale)
ipcMain.handle('scrape-fact-info', async (event, factData) => {
  try {
    console.log('🔍 FactChecker: Apertura sito per verifica manuale:', factData.factType);
    
    const { factType, question, sources } = factData;
    
    // Apri sito nel browser di sistema per verifica manuale
    console.log('⚠️ FactChecker: Apertura sito per verifica manuale');
    await shell.openExternal(sources[0]);
    
    return {
      success: true,
      message: 'Sito aperto nel browser per verifica manuale',
      url: sources[0]
    };
    
  } catch (error) {
    console.error('❌ FactChecker: Errore nell\'apertura del sito:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Funzioni di estrazione non più necessarie (solo apertura browser)
async function extractPresidentInfo() {
  return null;
}

async function extractPrimeMinisterInfo() {
  return null;
}

async function extractMayorInfo() {
  return null;
}



// OAuth IPC Handlers
ipcMain.handle('init-oauth-database', async (event, dbPath) => {
  try {
    if (!oauthDb) {
      oauthDb = new OAuthDatabase(dbPath);
      await oauthDb.init();
    }
    return { success: true };
  } catch (error) {
    console.error('[OAuth] Database initialization error:', error);
    throw error;
  }
});

ipcMain.handle('generate-oauth-url', async (event, userId, state) => {
  try {
    if (!googleOAuth) {
      throw new Error('OAuth service not initialized');
    }
    const authUrl = googleOAuth.generateAuthUrl(userId, state);
    return authUrl;
  } catch (error) {
    console.error('[OAuth] Error generating auth URL:', error);
    throw error;
  }
});

ipcMain.handle('start-oauth-flow', async (event, userId, useSystemBrowser = true) => {
  try {
    if (!googleOAuth) {
      throw new Error('OAuth service not initialized');
    }
    return await googleOAuth.startOAuthFlow(userId, useSystemBrowser);
  } catch (error) {
    console.error('[OAuth] Error starting OAuth flow:', error);
    throw error;
  }
});

ipcMain.handle('exchange-oauth-code', async (event, code) => {
  try {
    if (!googleOAuth) {
      throw new Error('OAuth service not initialized');
    }
    return await googleOAuth.exchangeCodeForTokens(code);
  } catch (error) {
    console.error('[OAuth] Error exchanging OAuth code:', error);
    throw error;
  }
});

ipcMain.handle('refresh-oauth-token', async (event, refreshToken) => {
  try {
    if (!googleOAuth) {
      throw new Error('OAuth service not initialized');
    }
    return await googleOAuth.refreshAccessToken(refreshToken);
  } catch (error) {
    console.error('[OAuth] Error refreshing token:', error);
    throw error;
  }
});

ipcMain.handle('verify-oauth-token', async (event, accessToken) => {
  try {
    if (!googleOAuth) {
      throw new Error('OAuth service not initialized');
    }
    return await googleOAuth.verifyToken(accessToken);
  } catch (error) {
    console.error('[OAuth] Error verifying token:', error);
    throw error;
  }
});

ipcMain.handle('get-oauth-user-info', async (event, accessToken) => {
  try {
    if (!googleOAuth) {
      throw new Error('OAuth service not initialized');
    }
    return await googleOAuth.getUserInfo(accessToken);
  } catch (error) {
    console.error('[OAuth] Error getting user info:', error);
    throw error;
  }
});

ipcMain.handle('save-oauth-tokens', async (event, userId, tokenData) => {
  try {
    if (!oauthDb) {
      throw new Error('OAuth database not initialized');
    }
    return await oauthDb.saveTokens(userId, tokenData);
  } catch (error) {
    console.error('[OAuth] Error saving tokens:', error);
    throw error;
  }
});

ipcMain.handle('get-oauth-tokens', async (event, userId) => {
  try {
    if (!oauthDb) {
      throw new Error('OAuth database not initialized');
    }
    return await oauthDb.getTokens(userId);
  } catch (error) {
    console.error('[OAuth] Error getting tokens:', error);
    throw error;
  }
});

ipcMain.handle('update-oauth-access-token', async (event, userId, accessToken, expiresAt) => {
  try {
    if (!oauthDb) {
      throw new Error('OAuth database not initialized');
    }
    return await oauthDb.updateAccessToken(userId, accessToken, expiresAt);
  } catch (error) {
    console.error('[OAuth] Error updating access token:', error);
    throw error;
  }
});

ipcMain.handle('revoke-oauth-tokens', async (event, userId) => {
  try {
    if (!oauthDb) {
      throw new Error('OAuth database not initialized');
    }
    return await oauthDb.revokeTokens(userId);
  } catch (error) {
    console.error('[OAuth] Error revoking tokens:', error);
    throw error;
  }
});

ipcMain.handle('log-oauth-audit', async (event, userId, action, details) => {
  try {
    if (!oauthDb) {
      throw new Error('OAuth database not initialized');
    }
    return await oauthDb.logAudit(userId, action, details);
  } catch (error) {
    console.error('[OAuth] Error logging audit:', error);
    throw error;
  }
});

ipcMain.handle('clean-expired-oauth-tokens', async (event) => {
  try {
    if (!oauthDb) {
      throw new Error('OAuth database not initialized');
    }
    return await oauthDb.cleanExpiredTokens();
  } catch (error) {
    console.error('[OAuth] Error cleaning expired tokens:', error);
    throw error;
  }
});

// Get valid OAuth token with auto-refresh for n8n
ipcMain.handle('get-valid-oauth-token', async (event, userId) => {
  try {
    if (!oauthDb || !googleOAuth) {
      throw new Error('OAuth services not initialized');
    }

    // Get tokens from database
    const tokens = await oauthDb.getTokens(userId);
    
    if (!tokens) {
      return {
        success: false,
        error: 'No tokens found for user',
        requires_auth: true
      };
    }

    // Check if token needs refresh
    if (googleOAuth.needsRefresh(tokens.expires_at)) {
      console.log(`[OAuth] Token needs refresh for user: ${userId}`);
      
      try {
        // Refresh the access token
        const refreshedTokens = await googleOAuth.refreshAccessToken(tokens.refresh_token);
        
        // Update tokens in database
        await oauthDb.updateAccessToken(
          userId,
          refreshedTokens.access_token,
          refreshedTokens.expires_at
        );
        
        // Log token refresh
        await oauthDb.logAudit(userId, 'token_refreshed', JSON.stringify({
          old_expires_at: tokens.expires_at,
          new_expires_at: refreshedTokens.expires_at
        }));
        
        console.log(`[OAuth] Token refreshed successfully for user: ${userId}`);
        
        // Return refreshed token
        return {
          success: true,
          access_token: refreshedTokens.access_token,
          token_type: refreshedTokens.token_type,
          expires_at: refreshedTokens.expires_at,
          scope: tokens.scope,
          refreshed: true
        };
        
      } catch (refreshError) {
        console.error('[OAuth] Failed to refresh token:', refreshError);
        
        // Log refresh failure
        await oauthDb.logAudit(userId, 'refresh_failed', JSON.stringify({
          error: refreshError.message
        }));
        
        // If refresh fails, the user needs to re-authenticate
        return {
          success: false,
          error: 'Token refresh failed',
          requires_auth: true
        };
      }
    }
    
    // Token is still valid, return current token
    const now = new Date();
    const expiresAt = new Date(tokens.expires_at);
    
    if (now < expiresAt) {
      // Log token access
      await oauthDb.logAudit(userId, 'token_accessed');
      
      return {
        success: true,
        access_token: tokens.access_token,
        token_type: tokens.token_type,
        expires_at: tokens.expires_at,
        scope: tokens.scope,
        refreshed: false
      };
    }
    
    // Token is expired and couldn't be refreshed
    return {
      success: false,
      error: 'Token expired and could not be refreshed',
      requires_auth: true
    };

  } catch (error) {
    console.error('[OAuth] Error in get-valid-oauth-token:', error);
    return {
      success: false,
      error: 'Internal error retrieving token'
    };
  }
});

// Custom protocol handler for OAuth callback
app.setAsDefaultProtocolClient('nyra');

app.on('open-url', async (event, url) => {
  event.preventDefault();
  
  if (url.startsWith('nyra://oauth/callback')) {
    console.log('[OAuth] Received OAuth callback:', url);
    
    try {
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const error = urlObj.searchParams.get('error');
      const state = urlObj.searchParams.get('state');

      if (mainWindow) {
        mainWindow.webContents.send('oauth-callback', {
          code,
          error,
          state,
          url
        });
      }
    } catch (parseError) {
      console.error('[OAuth] Error parsing callback URL:', parseError);
    }
  }
});

// Handle OAuth callback on Windows/Linux
app.on('second-instance', (event, argv) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    
    // Check for OAuth callback URL in argv
    const oauthUrl = argv.find(arg => arg.startsWith('nyra://oauth/callback'));
    if (oauthUrl) {
      console.log('[OAuth] Received OAuth callback from second instance:', oauthUrl);
      
      try {
        const urlObj = new URL(oauthUrl);
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');
        const state = urlObj.searchParams.get('state');

        mainWindow.webContents.send('oauth-callback', {
          code,
          error,
          state,
          url: oauthUrl
        });
      } catch (parseError) {
        console.error('[OAuth] Error parsing callback URL from second instance:', parseError);
      }
    }
  }
});

// Event listeners app
app.whenReady().then(async () => {
  await initializeOAuth();
  createWindow();
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  // Clean shutdown
  if (oauthDb) {
    oauthDb.close();
  }
});

console.log('🚀 Electron app avviata'); 