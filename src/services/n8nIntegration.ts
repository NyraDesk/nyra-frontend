import { NYRA_DEBUG_N8N } from '../config/n8n';

export interface CalendarResponse {
  success: boolean;
  data?: any;
  error?: string;
  eventLink?: string;
}

// Helper per parsing JSON sicuro
function tryParseJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function createReminder(message: string, userId?: string, userName?: string): Promise<CalendarResponse> {
  // Estrai informazioni dal messaggio per creare l'evento
  const calendarData = parseMessageForCalendar(message);
  
  if (!calendarData) {
    return { success: false, error: 'Impossibile estrarre informazioni calendario dal messaggio' };
  }

  // Estrai l'email dell'utente loggato dallo stato globale
  const getCurrentUserEmail = (): string | null => {
    try {
      // Prova a ottenere l'utente dal localStorage
      const userData = localStorage.getItem('nyra_user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.email || null;
      }
      return null;
    } catch (error) {
      console.warn('[NYRA] Errore nel recupero email utente:', error);
      return null;
    }
  };

  const userEmail = getCurrentUserEmail();

  // Payload esatto richiesto da n8n - include title, summary e user_id
  const payload = {
    title: calendarData.summary,      // Usa summary come title
    summary: calendarData.summary,    // Mantieni summary per compatibilità
    startISO: calendarData.startISO,
    endISO: calendarData.endISO,
    user_id: userEmail                // Aggiunto: email dell'utente loggato
  };




  // Log della richiesta
  if (NYRA_DEBUG_N8N) {
    const webhookUrl = getN8NWebhookUrl();
    console.log('[NYRA] Creating reminder via n8n:', webhookUrl);
    console.log('[NYRA] Payload:', payload);
  }

  // 1) Canale sicuro via Electron (niente CORS)
  if (window.electronAPI?.n8nCreateReminder) {
    try {
      const res = await window.electronAPI.n8nCreateReminder(payload);
      
      // Nuova logica di successo: se ok === true oppure status >= 200 && status < 300
      if (res.ok === true || (res.status >= 200 && res.status < 300)) {
        // Prova a determinare info evento
        const evt = res.json ?? tryParseJSON(res.body);
        
        // Estrai informazioni utili
        const eventInfo = {
          status: res.status,
          id: evt?.id,
          start: evt?.start?.dateTime,
          htmlLink: evt?.htmlLink
        };
        
        console.log('[NYRA][n8n OK]', eventInfo);
        
        return { 
          success: true, 
          data: evt,
          eventLink: evt?.htmlLink || evt?.id
        };
      }
      
      // Fallimento se status >= 400 || ok === false
      console.warn('[NYRA][n8n FAIL]', { 
        status: res.status, 
        body: res.body?.slice(0, 500) 
      });
      
      return { success: false, error: `n8n error: status ${res.status}` };
      
    } catch (err: any) {
      if (NYRA_DEBUG_N8N) {
        console.log('[NYRA] n8n IPC ERROR:', err?.message);
      }
      return { success: false, error: err?.message ?? 'IPC error' };
    }
  }

  // 2) Fallback fetch (richiede CORS lato n8n)
  try {
    getN8NWebhookUrl()
    console.log("[NYRA][REQUEST URL]", webhookUrl);
    
    // Validazione JSON prima della chiamata
    let jsonString: string;
    try {
      jsonString = JSON.stringify(payload);
      console.log('📤 n8n Integration - JSON validation: ✅ Valid');
      console.log('📤 n8n Integration - JSON length:', jsonString.length, 'characters');
    } catch (error) {
      console.error('📤 n8n Integration - JSON validation: ❌ Invalid JSON:', error);
      throw new Error('Invalid JSON payload');
    }
    
    if (NYRA_DEBUG_N8N) {
      console.log('[N8N][REQUEST] Final URL:', webhookUrl);
      console.log('[N8N][REQUEST] Body:', payload);
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString
    });
    
    const resText = await response.text().catch(() => '');
    
    if (NYRA_DEBUG_N8N) {
      console.log('[N8N][RESPONSE] status:', response.status, response.statusText);
      console.log('[N8N][RESPONSE] raw:', resText);
    }
    
    if (!response.ok) {
      const bodyFirst200 = resText.slice(0, 200);
      const errorMsg = `n8n error ${response.status}: ${bodyFirst200}`;
      if (NYRA_DEBUG_N8N) {
        console.log('[NYRA] n8n FAILED:', errorMsg);
      }
      throw new Error(errorMsg);
    }
    
    let data;
    try {
      data = JSON.parse(resText);
    } catch {
      data = { message: 'Non-JSON response from n8n', raw: resText };
    }
    
    // Gestione risposta corretta: se status è 200 → considera success = true
    if (response.ok) {
      try {
        const data = await response.json();
        if (data.success === false) {
          throw new Error(data.error || "n8n responded with success=false");
        }
        return { success: true, data };
      } catch {
        // Se non riesce a parsare JSON o non ha success=false, considera OK
        return { success: true, data: null };
      }
    } else {
      throw new Error(`n8n failed: ${response.status} ${response.statusText}`);
    }
    
  } catch (err: any) {
    if (NYRA_DEBUG_N8N) {
      console.log('[NYRA] n8n FAILED:', err?.message);
    }
    
    // 3) Fallback via IPC main process se fetch fallisce
    // @ts-ignore
    const viaIpc = window?.ElectronAPI?.n8nCreateReminder;
    if (viaIpc) {
      try {
        if (NYRA_DEBUG_N8N) {
          console.log('[NYRA] Fallback via IPC main process');
        }
        const webhookUrl = getN8NWebhookUrl();
        const res = await viaIpc({ summary: payload.summary, startISO: payload.startISO, endISO: payload.endISO }, webhookUrl);
        if (res.ok && res.data?.ok) {
          if (NYRA_DEBUG_N8N) {
            console.log('[NYRA] n8n OK via IPC fallback');
          }
          return { 
            success: true, 
            data: res.data,
            eventLink: res.data.eventLink 
          };
        }
        if (NYRA_DEBUG_N8N) {
          console.log('[NYRA] n8n FAILED via IPC fallback:', res.status, res.data?.message || 'Unknown error');
        }
        return { success: false, error: `n8n error: ${res.data?.message || 'Unknown error'}` };
      } catch (ipcErr: any) {
        if (NYRA_DEBUG_N8N) {
          console.log('[NYRA] n8n IPC fallback ERROR:', ipcErr?.message);
        }
        return { success: false, error: ipcErr?.message ?? 'IPC fallback error' };
      }
    }
    
    return { success: false, error: err?.message ?? 'Network error' };
  }
}

// Funzione per estrarre informazioni calendario dal messaggio
function parseMessageForCalendar(message: string): { summary: string, startISO: string, endISO: string } | null {
  const lowerMessage = message.toLowerCase();
  
  // Estrai il titolo/sommario (solo l'ultima parola o la parte dopo "alle XX")
  let summary = '';
  
  // Pattern per trovare "alle XX" seguito da una parola
  const allePattern = /alle\s+\d{1,2}(?::\d{2})?\s+(\w+)/i;
  const alleMatch = message.match(allePattern);
  
  if (alleMatch && alleMatch[1]) {
    // Se trova "alle XX parola", usa quella parola
    summary = alleMatch[1].trim();
  } else {
    // Altrimenti prendi l'ultima parola del messaggio
    const words = message.split(' ').filter(word => word.trim().length > 0);
    if (words.length > 0) {
      summary = words[words.length - 1].trim();
    }
  }
  
  // Capitalizza la prima lettera
  if (summary.length > 0) {
    summary = summary.charAt(0).toUpperCase() + summary.slice(1).toLowerCase();
  }
  
  // Se il summary è vuoto, usa un default
  if (!summary || summary.length === 0) {
    summary = 'Evento';
  }
  
  // Estrai la data e ora
  const timePatterns = [
    // "domani alle 15"
    /domani\s+(?:alle\s+)?(\d{1,2})(?::(\d{2}))?/i,
    // "alle 15"
    /alle\s+(\d{1,2})(?::(\d{2}))?/i,
    // "alle 15:30"
    /alle\s+(\d{1,2}):(\d{2})/i,
    // "alle 15.30"
    /alle\s+(\d{1,2})\.(\d{2})/i,
    // "15:30"
    /(\d{1,2}):(\d{2})/i,
    // "15.30"
    /(\d{1,2})\.(\d{2})/i,
    // "15"
    /(\d{1,2})/i
  ];
  
  let startHour = 9; // Default: 9:00
  let startMinute = 0;
  let isTomorrow = false;
  
  for (const pattern of timePatterns) {
    const match = message.match(pattern);
    if (match) {
      if (pattern.source.includes('domani')) {
        isTomorrow = true;
      }
      
      if (match[1]) startHour = parseInt(match[1]);
      if (match[2]) startMinute = parseInt(match[2]);
      
      // Valida l'ora
      if (startHour >= 0 && startHour <= 23 && startMinute >= 0 && startMinute <= 59) {
        break;
      }
    }
  }
  
  // Calcola le date
  const now = new Date();
  let startDate = new Date(now);
  
  if (isTomorrow) {
    startDate.setDate(startDate.getDate() + 1);
  }
  
  startDate.setHours(startHour, startMinute, 0, 0);
  
  // Se l'ora è già passata oggi, sposta a domani
  if (!isTomorrow && startDate <= now) {
    startDate.setDate(startDate.getDate() + 1);
  }
  
  // Durata default: 1 ora
  const endDate = new Date(startDate);
  endDate.setHours(startDate.getHours() + 1);
  
  // Converti in ISO string
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();
  
  return { summary, startISO, endISO };
}

// Nuova funzione per payload diretto con finalTitle
export async function createCalendarEvent(action: any): Promise<CalendarResponse> {
  console.log('[NYRA][N8N] Creating calendar event with action:', action);
  
  // Importa e usa pickFinalTitle per il titolo corretto
  const { pickFinalTitle } = await import('./calendarTitle');
  
  const finalTitle = pickFinalTitle(action.originalText, action.summary, action.title);
  
  // Estrai l'email dell'utente loggato dallo stato globale
  const getCurrentUserEmail = (): string | null => {
    try {
      // Prova a ottenere l'utente dal localStorage
      const userData = localStorage.getItem('nyra_user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.email || null;
      }
      return null;
    } catch (error) {
      console.warn('[NYRA] Errore nel recupero email utente:', error);
      return null;
    }
  };

  const userEmail = getCurrentUserEmail();
  
  // Ottieni i token OAuth per l'utente
  const getAccessToken = (): string | null => {
    try {
      if (userEmail) {
        // Prima prova localStorage
        const storedTokens = localStorage.getItem(`nyra_oauth_${userEmail}`);
        if (storedTokens) {
          const tokens = JSON.parse(storedTokens);
          const expiresAt = new Date(tokens.expires_at);
          const now = new Date();
          
          if (expiresAt > now) {
            return tokens.access_token;
          }
        }
        
        // Fallback: prova il broker
        return null; // Il broker verrà chiamato da n8n
      }
      return null;
    } catch (error) {
      console.warn('[NYRA] Errore nel recupero access token:', error);
      return null;
    }
  };

  const accessToken = getAccessToken();
  
  const payload = {
    action_type: "calendar",  // QUESTO CAMPO È OBBLIGATORIO
    access_token: accessToken, // Token per Google Calendar
    calendar: {
      title: finalTitle,        // Sempre presente
      summary: finalTitle,      // Ridondanza voluta per n8n
      description: "Evento creato da NYRA", // Descrizione opzionale
      startISO: action.startISO,
      endISO: action.endISO
    },
    user_id: userEmail        // Aggiunto: email dell'utente loggato
  };
  
  console.log('[NYRA][N8N] Sending payload with user_id:', payload);
  if (process.env.NODE_ENV === 'development') {
    console.log('[NYRA][N8N] Access token status:', accessToken ? 'present' : 'not found');
  }
  
  // Log aggiuntivo per verificare la presenza di user_id
  if (payload.user_id) {
    console.log('[NYRA][N8N] ✅ user_id presente nel payload:', payload.user_id);
  } else {
    console.log('[NYRA][N8N] ⚠️ user_id mancante nel payload');
  }
  
  // 1) Canale sicuro via Electron (niente CORS)
  if (window.electronAPI?.n8nCreateReminder) {
    try {
      const res = await window.electronAPI.n8nCreateReminder(payload);
      
      // Nuova logica di successo: se ok === true oppure status >= 200 && status < 300
      if (res.ok === true || (res.status >= 200 && res.status < 300)) {
        // Prova a determinare info evento
        const evt = res.json ?? tryParseJSON(res.body);
        
        // Estrai informazioni utili
        const eventInfo = {
          status: res.status,
          id: evt?.id,
          start: evt?.start?.dateTime,
          htmlLink: evt?.htmlLink
        };
        
        console.log('[NYRA][n8n OK]', eventInfo);
        
        return { 
          success: true, 
          data: evt,
          eventLink: evt?.htmlLink || evt?.id
        };
      }
      
      // Fallimento se status >= 400 || ok === false
      console.warn('[NYRA][n8n FAIL]', { 
        status: res.status, 
        body: res.body?.slice(0, 500) 
      });
      
      return { success: false, error: `n8n error: status ${res.status}` };
    } catch (err: any) {
      if (NYRA_DEBUG_N8N) {
        console.log('[NYRA] n8n IPC ERROR:', err?.message);
      }
      return { success: false, error: err?.message ?? 'IPC error' };
    }
  }

  // 2) Fallback fetch (richiede CORS lato n8n)
  try {
    const webhookUrl = getN8NWebhookUrl();
    console.log("[NYRA][REQUEST URL]", webhookUrl);
    
    // Validazione JSON prima della chiamata
    let jsonString: string;
    try {
      jsonString = JSON.stringify(payload);
      console.log('📤 n8n Email - JSON validation: ✅ Valid');
      console.log('📤 n8n Email - JSON length:', jsonString.length, 'characters');
    } catch (error) {
      console.error('📤 n8n Email - JSON validation: ❌ Invalid JSON:', error);
      throw new Error('Invalid JSON payload');
    }
    
    if (NYRA_DEBUG_N8N) {
      console.log('[N8N][REQUEST] Final URL:', webhookUrl);
      console.log('[N8N][REQUEST] Body:', payload);
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonString
    });
    
    const resText = await response.text().catch(() => '');
    
    if (NYRA_DEBUG_N8N) {
      console.log('[N8N][RESPONSE] status:', response.status, response.statusText);
      console.log('[N8N][RESPONSE] raw:', resText);
    }
    
    if (!response.ok) {
      const bodyFirst200 = resText.slice(0, 200);
      const errorMsg = `n8n error ${response.status}: ${bodyFirst200}`;
      if (NYRA_DEBUG_N8N) {
        console.log('[NYRA] n8n FAILED:', errorMsg);
      }
      throw new Error(errorMsg);
    }
    
    let data;
    try {
      data = JSON.parse(resText);
    } catch {
      data = { message: 'Non-JSON response from n8n', raw: resText };
    }
    
    // Gestione risposta corretta: se status è 200 → considera success = true
    if (response.ok) {
      try {
        const data = await response.json();
        if (data.success === false) {
          throw new Error(data.error || "n8n responded with success=false");
        }
        return { success: true, data };
      } catch {
        // Se non riesce a parsare JSON o non ha success=false, considera OK
        return { success: true, data: null };
      }
    } else {
      throw new Error(`n8n failed: ${response.status} ${response.statusText}`);
    }
    
  } catch (err: any) {
    if (NYRA_DEBUG_N8N)
      console.log('[NYRA] n8n fetch ERROR:', err?.message);
    
    return { 
      success: false, 
      error: err?.message ?? 'Errore di connessione con n8n' 
    };
  }
}
