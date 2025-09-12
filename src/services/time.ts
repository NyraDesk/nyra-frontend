export const DEFAULT_TZ = import.meta.env.VITE_DEFAULT_TIMEZONE || 'Europe/Rome';

export function getLocalTZ(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
  } catch { 
    return DEFAULT_TZ; 
  }
}

export function now(tz = getLocalTZ()): Date {
  // JS Date è sempre UTC inside; per formattazione useremo Intl col tz
  return new Date();
}

export function formatDateTimeIT(d: Date, tz = getLocalTZ()): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit', 
    timeZone: tz
  }).format(d);
}

export function formatDateIT(d: Date, tz = getLocalTZ()): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long', 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric',
    timeZone: tz
  }).format(d);
}

export function partOfDay(d = now(), tz = getLocalTZ()): 'mattina'|'pomeriggio'|'sera'|'notte' {
  // ricava ora nel tz locale
  const hour = Number(new Intl.DateTimeFormat('it-IT', { 
    hour: '2-digit', 
    hour12: false, 
    timeZone: tz 
  }).format(d));
  
  if (hour < 6) return 'notte';
  if (hour < 12) return 'mattina';
  if (hour < 18) return 'pomeriggio';
  return 'sera';
}

export function formatTimeIT(d: Date, tz = getLocalTZ()): string {
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz
  }).format(d);
}

export function formatDateShortIT(d: Date, tz = getLocalTZ()): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: tz
  }).format(d);
}

// Funzione per generare il saluto dinamico in italiano
export function getDynamicGreeting(d = now(), tz = getLocalTZ(), userName?: string): string {
  // Prendi il nome direttamente dal localStorage del login
  let userDisplayName = 'Utente';
  
  try {
    const savedUser = localStorage.getItem('nyra_user');
    console.log('🔍 Saved user data:', savedUser);
    
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      console.log('🔍 Parsed user data:', userData);
      
      if (userData.name && userData.name.trim() !== '') {
        userDisplayName = userData.name;
        console.log('✅ Using userData.name:', userData.name);
      } else if (userData.username && userData.username.trim() !== '') {
        userDisplayName = userData.username;
        console.log('✅ Using userData.username:', userData.username);
      } else {
        console.log('⚠️ No valid name found in userData');
      }
    } else {
      console.log('⚠️ No saved user found in localStorage');
    }
  } catch (error) {
    console.warn('❌ Errore nel caricamento nome utente:', error);
  }
  
  console.log('🎯 Final display name:', userDisplayName);
  return `Ciao ${userDisplayName}, sono NYRA il tuo assistente personale.`;
}
