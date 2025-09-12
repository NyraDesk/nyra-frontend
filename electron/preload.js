console.log('🟢 PRELOAD SCRIPT STARTED');
console.log('🔧 Process versions:', process.versions);

const { contextBridge, ipcRenderer } = require('electron');

console.log('🔗 Esponendo ElectronAPI...');

// Verifica che ipcRenderer sia disponibile
if (!ipcRenderer) {
  console.error('❌ ipcRenderer non disponibile');
} else {
  console.log('✅ ipcRenderer disponibile');
}

// Verifica che contextBridge sia disponibile
if (!contextBridge) {
  console.error('❌ contextBridge non disponibile');
} else {
  console.log('✅ contextBridge disponibile');
}

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  sendMessage: (msg) => ipcRenderer.send('send-message', msg),
  closeBrowser: () => ipcRenderer.send('close-browser'),
  resetAutomation: () => ipcRenderer.send('reset-automation'),
  
  // Funzioni aggiuntive per compatibilità
  getPlatform: () => process.platform,
  startAutomation: (type, data) => ipcRenderer.invoke('start-automation', type, data),
  onAutomationStatus: (callback) => 
    ipcRenderer.on('automation-status', (event, data) => callback(data)),
  removeAutomationStatusListener: (callback) =>
    ipcRenderer.removeListener('automation-status', callback),
  log: (message) => ipcRenderer.invoke('log-message', message),
  testIPC: () => ipcRenderer.invoke('test-ipc'),
  
  // NUOVE funzioni Playwright
  playwrightAutomation: (query) => ipcRenderer.invoke('playwright-automation', query),
  closePlaywrightBrowser: () => ipcRenderer.invoke('close-playwright-browser'),
  
  // ActionExecutor per gestione azioni
  executeAction: (actionData) => ipcRenderer.invoke('execute-action', actionData),
  
  // FactChecker per verifica informazioni
  scrapeFactInfo: (factData) => ipcRenderer.invoke('scrape-fact-info', factData),
  
  // Funzioni Playwright aggiuntive per compatibilità
  startAutomation: (query) => ipcRenderer.invoke('start-automation', 'universal-automation', {
    action: 'search_on_site',
    query: query,
    site: 'amazon.com'
  }),
  closeBrowser: () => ipcRenderer.invoke('close-playwright-browser'),
  
  // N8N Integration - Calendar reminders
  createReminder: (payload) => ipcRenderer.invoke('n8n:createReminder', payload),
  
  // N8N Create Reminder via IPC (fallback se fetch fallisce)
  n8nCreateReminder: (payload, url) => ipcRenderer.invoke('n8n:createReminder', payload),
  
  // API per gestione oraria sicura
  getBootTime: () => ipcRenderer.invoke('nyra:getBootTime'),
  getSystemTime: () => ipcRenderer.invoke('nyra:getSystemTime'),

  // OAuth2 integration
  initOAuthDatabase: (dbPath) => ipcRenderer.invoke('init-oauth-database', dbPath),
  generateOAuthUrl: (userId, state) => ipcRenderer.invoke('generate-oauth-url', userId, state),
  startOAuthFlow: (userId, useSystemBrowser) => ipcRenderer.invoke('start-oauth-flow', userId, useSystemBrowser),
  exchangeOAuthCode: (code) => ipcRenderer.invoke('exchange-oauth-code', code),
  refreshOAuthToken: (refreshToken) => ipcRenderer.invoke('refresh-oauth-token', refreshToken),
  verifyOAuthToken: (accessToken) => ipcRenderer.invoke('verify-oauth-token', accessToken),
  getOAuthUserInfo: (accessToken) => ipcRenderer.invoke('get-oauth-user-info', accessToken),
  saveOAuthTokens: (userId, tokenData) => ipcRenderer.invoke('save-oauth-tokens', userId, tokenData),
  getOAuthTokens: (userId) => ipcRenderer.invoke('get-oauth-tokens', userId),
  updateOAuthAccessToken: (userId, accessToken, expiresAt) => ipcRenderer.invoke('update-oauth-access-token', userId, accessToken, expiresAt),
  revokeOAuthTokens: (userId) => ipcRenderer.invoke('revoke-oauth-tokens', userId),
  logOAuthAudit: (userId, action, details) => ipcRenderer.invoke('log-oauth-audit', userId, action, details),
  cleanExpiredOAuthTokens: () => ipcRenderer.invoke('clean-expired-oauth-tokens'),
  getValidOAuthToken: (userId) => ipcRenderer.invoke('get-valid-oauth-token', userId),
  
  // OAuth callback listener
  onOAuthCallback: (callback) => 
    ipcRenderer.on('oauth-callback', (event, data) => callback(data)),
  removeOAuthCallbackListener: (callback) =>
    ipcRenderer.removeListener('oauth-callback', callback),
  
  // OpenRouter sicuro - NUOVO
  openRouterCall: (messages, model) => 
    ipcRenderer.invoke('openrouter:call', messages, model)
});

// Bridge sicuro per apertura Amazon
contextBridge.exposeInMainWorld('ElectronAPI', {
  apriAmazon: (query) => ipcRenderer.invoke('apri-amazon', query)
});

console.log('✅ PRELOAD SCRIPT COMPLETED - ElectronAPI disponibile');
console.log('🔧 Window location:', window.location.href);

// Test immediato che ElectronAPI sia disponibile
setTimeout(() => {
  if (window.electronAPI) {
    console.log('✅ ElectronAPI verificata nel window object');
    console.log('🔧 Metodi disponibili:', Object.keys(window.electronAPI));
    
    // Test di un metodo specifico
    if (window.electronAPI.ping) {
      console.log('✅ Metodo ping disponibile');
    } else {
      console.error('❌ Metodo ping non disponibile');
    }
  } else {
    console.error('❌ ElectronAPI non trovata nel window object');
  }
}, 100); 