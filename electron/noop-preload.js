console.log('🟢 NOOP PRELOAD SCRIPT STARTED');

// Preload noop che espone solo un electronAPI vuoto
// Questo evita il crash "process.cwd is not a function" e rimuove le dipendenze da window.electronAPI

const { contextBridge } = require('electron');

console.log('🔗 Esponendo electronAPI vuoto...');

// Esponi un electronAPI vuoto per evitare errori nel renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Metodi vuoti per evitare errori
  ping: () => Promise.resolve('noop'),
  getAppVersion: () => Promise.resolve('1.0.0'),
  // Tutti gli altri metodi sono undefined
});

console.log('✅ NOOP PRELOAD SCRIPT COMPLETED - electronAPI vuoto disponibile');
