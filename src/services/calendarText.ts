// src/services/calendarText.ts
export function cleanSummary(text: string, maxLen = 200): string {
  if (!text) return "";
  // rimuovi virgolette tipiche
  let s = text.replace(/^["""]+|["""]+$/g, "");
  // normalizza spazi
  s = s.replace(/\s+/g, " ").trim();
  // taglio soft per evitare titoli chilometrici (Google consente molto, ma teniamolo umano)
  if (s.length > maxLen) s = s.slice(0, maxLen).trim();
  return s;
}

/**
 * Sceglie il miglior titolo:
 * - Usa modelTitle se ha almeno 2 parole e ≥ 6 caratteri dopo trim
 * - Altrimenti usa userText (pulito da virgolette e spazi doppi)
 */
export function pickCalendarTitle(modelTitle: string | undefined, userText: string): string {
  if (!modelTitle) {
    return cleanSummary(userText);
  }
  
  const candidate = cleanSummary(modelTitle);
  
  // Verifica se il candidato è abbastanza buono
  const hasMultipleWords = candidate.split(" ").length >= 2;
  const isLongEnough = candidate.length >= 6;
  
  if (hasMultipleWords && isLongEnough) {
    return candidate;
  }
  
  // Fallback alla frase utente
  return cleanSummary(userText);
}
