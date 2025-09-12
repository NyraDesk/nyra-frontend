// Utility per normalizzazione date calendario
// Gestisce correttamente le date nel passato e le porta al futuro

/**
 * Verifica se il testo contiene un anno esplicito
 */
export function hasExplicitYear(text: string): boolean {
  const yearPattern = /\b(20\d{2}|19\d{2})\b/;
  return yearPattern.test(text);
}

/**
 * Normalizza una data ISO al futuro se necessario
 * Se la data è nel passato e non c'è anno esplicito, porta all'anno corrente
 */
export function normalizeToFutureISO(iso: string, originalText: string, now = new Date()): string {
  const date = new Date(iso);
  const hasYear = hasExplicitYear(originalText);
  
  // Se c'è un anno esplicito, non modificare
  if (hasYear) {
    return iso;
  }
  
  // Se la data è nel futuro, non modificare
  if (date > now) {
    return iso;
  }
  
  // La data è nel passato, porta all'anno corrente
  const currentYear = now.getFullYear();
  const normalizedDate = new Date(date);
  normalizedDate.setFullYear(currentYear);
  
  // Se ancora nel passato, sposta alla prima occorrenza futura
  if (normalizedDate <= now) {
    normalizedDate.setFullYear(currentYear + 1);
  }
  
  return normalizedDate.toISOString();
}

/**
 * Normalizza startISO e endISO mantenendo la durata
 */
export function normalizeStartEndISO(
  startISO: string, 
  endISO: string, 
  originalText: string, 
  now = new Date()
): { startISO: string; endISO: string } {
  const originalStart = new Date(startISO);
  const originalEnd = new Date(endISO);
  
  // Calcola la durata originale
  const duration = originalEnd.getTime() - originalStart.getTime();
  
  // Normalizza la data di inizio
  const normalizedStart = normalizeToFutureISO(startISO, originalText, now);
  const normalizedStartDate = new Date(normalizedStart);
  
  // Calcola la nuova data di fine mantenendo la durata
  const normalizedEndDate = new Date(normalizedStartDate.getTime() + duration);
  
  return {
    startISO: normalizedStartDate.toISOString(),
    endISO: normalizedEndDate.toISOString()
  };
}

/**
 * Utility per formattare date in Europe/Rome (deprecata - usa formatDateTimeIT da time.ts)
 */
export async function formatDateEuropeRome(iso: string): Promise<string> {
  const { formatDateTimeIT } = await import('./time');
  return formatDateTimeIT(new Date(iso), 'Europe/Rome');
}

/**
 * Utility per formattare solo ora in Europe/Rome (deprecata - usa formatTimeIT da time.ts)
 */
export async function formatTimeEuropeRome(iso: string): Promise<string> {
  const { formatTimeIT } = await import('./time');
  return formatTimeIT(new Date(iso), 'Europe/Rome');
}
