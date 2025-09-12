// src/services/clock.ts
export type NowInfo = {
  now: Date;
  tz: string;            // timezone (es. "Europe/Rome")
  iso: string;           // ISO con offset corretto
  dateLabel: string;     // "dd/MM/yyyy"
  timeLabel: string;     // "HH:mm"
  weekdayLabel: string;  // "lunedì/martedì/..." in italiano
  todayISO: string;      // 2025-08-13 (per compatibilità)
  nowISO: string;        // 2025-08-13T11:45:00+02:00 (per compatibilità)
  todayHuman: string;    // mer 13/08/2025 (per compatibilità)
};

import { getLocalTZ, now, formatDateShortIT, formatTimeIT } from './time';

export function getNow(timezoneFallback = 'Europe/Rome'): NowInfo {
  
  const tz = getLocalTZ();
  const currentNow = now(tz);

  // Formattazione usando il nuovo servizio
  const dateLabel = formatDateShortIT(currentNow, tz);
  const timeLabel = formatTimeIT(currentNow, tz);
  const weekdayLabel = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    timeZone: tz
  }).format(currentNow);

  // ISO strings per compatibilità
  const todayISO = currentNow.toISOString().split('T')[0];
  const nowISO = currentNow.toISOString();

  // Formato compatibilità
  const todayHuman = new Intl.DateTimeFormat('it-IT', {
    weekday: 'short', 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    timeZone: tz,
  }).format(currentNow);

  return { 
    now: currentNow, 
    tz, 
    iso: nowISO, 
    dateLabel, 
    timeLabel, 
    weekdayLabel,
    todayISO, 
    nowISO, 
    todayHuman 
  };
}

// Funzione per formattare un range di date
export function formatRange(startISO: string, endISO: string, timezone?: string): string {
  try {
    const tz = timezone || 'Europe/Rome';
    const startDate = new Date(startISO);
    const endDate = new Date(endISO);
    
    const formatter = new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz
    });
    
    const startFormatted = formatter.format(startDate);
    const endFormatted = formatter.format(endDate);
    
    return `${startFormatted} → ${endFormatted}`;
  } catch (error) {
    console.warn('[CLOCK] Errore formattazione range:', error);
    return `${startISO} → ${endISO}`;
  }
}

// Funzione per determinare la parte del giorno (deprecata - usa partOfDay da time.ts)
export async function dayPart(now: Date): Promise<string> {
  const { partOfDay } = await import('./time');
  return partOfDay(now);
}
