# Test Integrazione Calendario con Intent

## Implementazione Completata ✅

### 1. System Prompt Aggiornato
- **File**: `src/services/openrouter.ts`
- **Modifica**: Aggiunte regole speciali per calendario nel system prompt
- **Comportamento**: Quando l'utente chiede di creare eventi, il modello restituisce solo JSON

### 2. Utility Calendario
- **File**: `src/services/calendarActionHandler.ts`
- **Funzioni**:
  - `safeParseJSON()` - Parsing sicuro di JSON
  - `isCalendarAction()` - Verifica se è un'azione calendario
  - `createN8NPayload()` - Crea payload per n8n
  - `normalizeCalendarDates()` - Normalizza date ISO

### 3. Intercettazione in App.tsx
- **File**: `src/App.tsx`
- **Modifica**: Aggiunta logica per intercettare JSON calendario
- **Flusso**: LLM → JSON → Parsing → n8n → Conferma utente

## Test Manuale

### 1. Avvio App
```bash
npm run electron-dev
```

### 2. Test Comandi Calendario
Invia a NYRA uno di questi comandi:

```
Crea un evento in calendario per domani alle 15:00 dal titolo 'Test n8n'
```

```
Programma un meeting per venerdì alle 10:00 fino alle 11:00 chiamato 'Review progetto'
```

```
Aggiungi al calendario: 'Dentista' giovedì alle 14:30
```

### 3. Comportamento Atteso

#### Se il modello restituisce JSON:
```
[NYRA] Intercettata azione calendario: { action: "create-calendar-event", ... }
[NYRA] Dispatching calendar event to n8n: { summary: "...", startISO: "...", endISO: "..." }
[NYRA] n8n OK
✅ Evento creato: "Test n8n" (13/01/2025, 15:00 → 16:00)
```

#### Se il modello non restituisce JSON:
- Procede normalmente con la conversazione
- Nessuna azione calendario eseguita

### 4. Verifica Google Calendar
- L'evento deve essere creato su Google Calendar
- Controllare che l'ora sia corretta
- Verificare che il titolo sia quello specificato

## Struttura JSON Attesa

```json
{
  "action": "create-calendar-event",
  "platform": "google",
  "summary": "Test n8n",
  "startISO": "2025-01-13T15:00:00Z",
  "endISO": "2025-01-13T16:00:00Z"
}
```

## Log Attesi in DevTools

### Intercettazione JSON:
```
[NYRA] Intercettata azione calendario: {...}
[NYRA] Dispatching calendar event to n8n: {...}
```

### Chiamata n8n:
```
[N8N][REQUEST] URL: http://localhost:5678/webhook/calendar-agent
[N8N][REQUEST] Body: { summary: "...", startISO: "...", endISO: "..." }
[N8N][RESPONSE] status: 200 OK
[N8N][RESPONSE] raw: {... "htmlLink": "..."}
```

### Risultato:
```
[NYRA] n8n OK
✅ Evento creato: "..." (... → ...)
```

## Fallback e Gestione Errori

### Se n8n fallisce:
```
[NYRA] n8n FAILED: <error message>
⚠️ Errore nel creare l'evento. Riprovo più tardi o fallo manualmente.
```

### Se il JSON non è valido:
- Procede normalmente con la conversazione
- Nessuna azione eseguita

## Criteri di Successo

✅ **Intent riconosciuto**: Frasi "crea un evento..." producono JSON
✅ **JSON intercettato**: App riconosce e processa l'azione calendario
✅ **n8n chiamato**: Endpoint corretto con payload corretto
✅ **Evento creato**: Appare su Google Calendar
✅ **Logging completo**: Console mostra tutto il flusso
✅ **Fallback robusto**: Gestione errori senza crash

## Debug

Per verificare che tutto funzioni:
1. Controlla che `VITE_NYRA_DEBUG_N8N=1` in `.env`
2. Verifica che n8n sia attivo su `http://localhost:5678`
3. Controlla i log in DevTools Console
4. Verifica Google Calendar per gli eventi creati
