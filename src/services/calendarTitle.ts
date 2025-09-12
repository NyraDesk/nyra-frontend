// Helper centralizzato per la gestione dei titoli calendario
// Evita troncamenti e gestisce virgolette correttamente

export function extractQuotedTitle(text: string): string | null {
  if (!text) return null;
  const m = text.match(/["""']([^"""]{2,})["""']/);
  return m?.[1]?.trim() || null;
}

export function cleanTitle(s?: string | null): string {
  if (!s) return "";
  return s
    .replace(/^["'""''\s]*/, "")  // rimuove virgolette e spazi iniziali
    .replace(/\s*["'""'']$/, "")  // rimuove virgolette e spazi finali
    .replace(/\s+/g, " ")         // normalizza spazi multipli
    .trim();
}

/**
 * Regole per titolo breve:
 * 1) Se l'utente ha messo virgolette → usa quello (pulito).
 * 2) Altrimenti estrai solo l'ultima parola o la parte dopo "alle XX".
 * 3) Se ancora vuoto → fallback a "Evento".
 */
export function pickFinalTitle(userText: string, modelSummary?: string, modelTitle?: string): string {
  const quoted = extractQuotedTitle(userText);
  if (quoted) {
    return cleanTitle(quoted);
  }

  // Estrai titolo breve dal testo utente
  const shortTitle = extractShortTitle(userText);
  if (shortTitle) {
    return shortTitle;
  }

  // Fallback
  return "Evento";
}

/**
 * Estrae un titolo breve dal messaggio utente
 * - Cerca "alle XX" e usa tutto il testo dopo
 * - Altrimenti prende l'ultima parola
 * - Capitalizza la prima lettera
 */
function extractShortTitle(message: string): string {
  if (!message) return "";
  
  // Pattern per trovare "alle XX" seguito da tutto il resto
  const allePattern = /alle\s+\d{1,2}(?::\d{2})?\s+(.+)/i;
  const alleMatch = message.match(allePattern);
  
  if (alleMatch && alleMatch[1]) {
    // Se trova "alle XX testo", usa tutto il testo dopo
    const title = alleMatch[1].trim();
    // Rimuovi punteggiatura finale
    const cleanTitle = title.replace(/[.,!?;:]+$/, '');
    if (cleanTitle.length > 0) {
      return cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    }
  }
  
  // Altrimenti prendi l'ultima parola del messaggio
  const words = message.split(' ').filter(word => word.trim().length > 0);
  if (words.length > 0) {
    const lastWord = words[words.length - 1].trim();
    // Rimuovi punteggiatura
    const cleanWord = lastWord.replace(/[.,!?;:]/g, '');
    if (cleanWord.length > 0) {
      return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
    }
  }
  
  return "";
}

/**
 * Funzione principale per costruire il titolo definitivo
 * - Pulisce solo le virgolette intorno (non taglia in mezzo)
 * - Se modelSummary ha almeno 2 parole e ≥ 8 caratteri, usa modelSummary
 * - Altrimenti fallback a originalText normalizzato
 * - Non taglia mai su simboli o emoji; consente emoji nel titolo
 * - Limita lunghezza max a 120 char con ellissi, ma mai prima parola sola
 */
export function buildFinalTitle(originalText: string, modelSummary?: string): string {
  // Pulisci il testo originale
  const cleanOriginal = cleanTitle(originalText);
  
  // Se non c'è modelSummary, usa l'originale
  if (!modelSummary) {
    return truncateTitle(cleanOriginal);
  }
  
  // Pulisci il modelSummary
  const cleanModel = cleanTitle(modelSummary);
  
  // Verifica se il modelSummary è abbastanza buono
  const hasMultipleWords = cleanModel.split(" ").length >= 2;
  const isLongEnough = cleanModel.length >= 8;
  
  if (hasMultipleWords && isLongEnough) {
    return truncateTitle(cleanModel);
  }
  
  // Fallback all'originale
  return truncateTitle(cleanOriginal);
}

/**
 * Tronca il titolo in modo intelligente
 * - Non taglia mai su simboli o emoji
 * - Non taglia mai la prima parola sola
 * - Limita a 120 caratteri con ellissi
 */
function truncateTitle(title: string): string {
  if (title.length <= 120) {
    return title;
  }
  
  // Trova l'ultimo spazio prima del limite
  let lastSpace = title.lastIndexOf(" ", 120);
  
  // Se non c'è spazio o è troppo vicino all'inizio, usa il limite esatto
  if (lastSpace <= 0 || lastSpace < 100) {
    lastSpace = 120;
  }
  
  // Tronca e aggiungi ellissi
  return title.substring(0, lastSpace) + "…";
}
