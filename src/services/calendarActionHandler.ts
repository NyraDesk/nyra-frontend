import { buildFinalTitle } from './calendarTitle';
import { normalizeStartEndISO } from './calendarDates';
import { getNow } from './clock';

// Utility per il parsing sicuro di JSON
export function safeParseJSON<T = unknown>(s: string): T | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// Interfaccia per le azioni calendario
export interface CalendarAction {
  action: "create-calendar-event";
  platform: "google";
  summary?: string; // Campo opzionale per il summary
  title?: string;   // Campo opzionale per il titolo
  originalText: string; // Frase originale dell'utente (obbligatoria)
  startISO: string;
  endISO: string;
}

// Funzione per verificare se una risposta è un'azione calendario
export function isCalendarAction(response: unknown): response is CalendarAction {
  return (
    response &&
    typeof response === 'object' &&
    response.action === 'create-calendar-event' &&
    response.platform === 'google' &&
    typeof response.originalText === 'string' &&
    typeof response.startISO === 'string' &&
    typeof response.endISO === 'string'
  );
}

// Helper per correggere gli anni sbagliati
function coerceToCurrentYearIfNeeded(dateISO: string, userText: string, tz: string): string {
  try {
    const now = getNow(tz);
    const inDate = new Date(dateISO);
    const userSpecifiedYear = /\b(20\d{2})\b/.test(userText);

    if (!userSpecifiedYear) {
      // Se l'anno è diverso da quello corrente e la richiesta è tipo "oggi/domani"
      const mentionsRelative = /(oggi|domani|dopodomani)/i.test(userText);
      if (mentionsRelative) {
        const y = now.todayISO.slice(0,4);
        const isoNoYear = dateISO.replace(/^\d{4}/, y);
        const coerced = new Date(isoNoYear);
        // Se ancora nel passato, sposta all'occorrenza futura (es. +1 anno)
        if (coerced.getTime() < now.now.getTime()) {
          const nextYear = String(Number(y) + 1);
          return isoNoYear.replace(/^\d{4}/, nextYear);
        }
        return isoNoYear;
      }
    }
    return dateISO;
  } catch {
    return dateISO;
  }
}

// Funzione per normalizzare le date ISO
export function normalizeCalendarDates(startISO: string, endISO?: string): {
  startISO: string;
  endISO: string;
} {
  const start = new Date(startISO);
  
  // Se manca endISO, imposta durata default di 1 ora
  let end: Date;
  if (endISO) {
    end = new Date(endISO);
  } else {
    end = new Date(start.getTime() + 60 * 60 * 1000); // +1 ora
  }
  
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString()
  };
}

// Funzione per creare il payload per n8n
export function createN8NPayload(action: CalendarAction): {
  title: string;
  summary: string;
  startISO: string;
  endISO: string;
  timezone: string;
} {
  const { summary, title, originalText, startISO, endISO } = action;
  
  // Ottieni data e ora reali del sistema
  const now = getNow();
  
  // Correggi gli anni se necessario
  let correctedStartISO = startISO;
  let correctedEndISO = endISO;
  
  if (startISO) {
    correctedStartISO = coerceToCurrentYearIfNeeded(startISO, originalText, now.tz);
  }
  if (endISO) {
    correctedEndISO = coerceToCurrentYearIfNeeded(endISO, originalText, now.tz);
  }
  
  // Normalizza le date al futuro se necessario
  const normalized = normalizeStartEndISO(correctedStartISO, correctedEndISO, originalText);
  
  const finalTitle = buildFinalTitle(originalText, summary);
  
  // Log per debug
  console.log('[NYRA][TITLE] original=', originalText, 'model=', summary, 'final=', finalTitle);
  console.log('[NYRA][DATES] corrected', { 
    original: { startISO, endISO }, 
    corrected: { startISO: correctedStartISO, endISO: correctedEndISO },
    normalized: { startISO: normalized.startISO, endISO: normalized.endISO }
  });
  
  // Log di correzione se necessario
  if (startISO !== correctedStartISO || endISO !== correctedEndISO) {
    console.log('[DATE FIX] tz=', now.tz, 'user=', originalText, 'start=', correctedStartISO, 'end=', correctedEndISO);
  }
  
  return {
    title: finalTitle,        // Sempre presente
    summary: finalTitle,      // Ridondanza voluta per n8n
    startISO: normalized.startISO,
    endISO: normalized.endISO,
    timezone: now.tz
  };
}
