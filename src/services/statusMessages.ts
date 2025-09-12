// src/services/statusMessages.ts

export const naturalStatusMessages = {
  starting: "🔍 Sto aprendo la pagina per te...",
  analyzing: "👁️ Sto guardando la pagina e cercando dove cliccare...",
  clicking: "🖱️ Ho trovato il punto giusto, sto cliccando...",
  typing: (query: string) => `⌨️ Sto digitando "${query}"...`,
  searching: "🔍 Sto avviando la ricerca...",
  processing: "🧠 Sto analizzando i risultati che vedo...",
  completed: "✅ Perfetto! Ecco cosa ho trovato:",
  error: "😅 Ops, qualcosa non ha funzionato. Riprovo in modo diverso...",
  retrying: "🔄 Riprovo con un approccio diverso...",
  fallback: "🔄 Passo al metodo tradizionale...",
  vision_success: "👁️ Computer Vision ha funzionato perfettamente!",
  vision_fallback: "🔄 Computer Vision non ha funzionato, uso i metodi tradizionali...",
  browser_open: "👀 Browser rimane aperto per 30 secondi per review...",
  browser_closing: "🔒 Chiudo il browser...",
  cache_hit: "⚡ Usando pattern già riconosciuti...",
  cache_miss: "🆕 Analizzando nuova pagina...",
  screenshot_captured: "📸 Screenshot catturato, analizzando...",
  coordinates_found: (x: number, y: number) => `🎯 Trovato elemento alle coordinate (${x}, ${y})`,
  confidence_level: (level: number) => `📊 Livello di confidenza: ${Math.round(level * 100)}%`,
  human_typing: "⌨️ Digitazione umana in corso...",
  waiting_results: "⏳ Attendo i risultati...",
  results_analyzed: "🧠 Risultati analizzati con successo!"
};

export const getStatusMessage = (key: string, params?: any): string => {
  const message = naturalStatusMessages[key as keyof typeof naturalStatusMessages];
  
  if (typeof message === 'function' && params) {
    return message(params);
  }
  
  return message || "🔄 Operazione in corso...";
};

export const getRandomStatusMessage = (key: string, params?: any): string => {
  const baseMessage = getStatusMessage(key, params);
  
  // Aggiungi variazioni casuali per rendere più naturale
  const variations = {
    starting: [
      "🔍 Sto aprendo la pagina per te...",
      "🌐 Connessione al sito in corso...",
      "🚀 Avvio navigazione..."
    ],
    analyzing: [
      "👁️ Sto guardando la pagina e cercando dove cliccare...",
      "🔍 Analizzando la struttura della pagina...",
      "👀 Esamino gli elementi visibili..."
    ],
    clicking: [
      "🖱️ Ho trovato il punto giusto, sto cliccando...",
      "🎯 Elemento trovato, clicco ora...",
      "👆 Clicco sull'elemento identificato..."
    ]
  };
  
  const variationsForKey = variations[key as keyof typeof variations];
  if (variationsForKey) {
    return variationsForKey[Math.floor(Math.random() * variationsForKey.length)];
  }
  
  return baseMessage;
}; 