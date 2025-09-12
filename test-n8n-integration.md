# Test Integrazione N8N - Google Calendar

## Configurazione Completata

✅ **Config centralizzata URL n8n** - `src/config/n8n.ts` aggiornato
✅ **Log della richiesta/risposta** - Logging dettagliato implementato
✅ **Payload allineato** - Solo `{summary, startISO, endISO}`
✅ **Fallback IPC** - Gestione CORS via main process
✅ **Messaggi console chiari** - Formato standardizzato
✅ **Env & script** - Variabili aggiunte in `env.example`

## Test Rapidi

### 1. Avvio App
```bash
npm run electron-dev
```

### 2. Test Comando NYRA
Invia a NYRA:
```
Crea un evento "Prova da NYRA" oggi alle 15 fino alle 16
```

### 3. Log Attesi in DevTools Console

#### Se fetch funziona (renderer):
```
[NYRA] Creating reminder via n8n: http://localhost:5678/webhook/calendar-agent
[NYRA] Payload: { summary: 'Prova da NYRA', startISO: '...', endISO: '...' }
[N8N][REQUEST] URL: http://localhost:5678/webhook/calendar-agent
[N8N][REQUEST] Body: { summary: 'Prova da NYRA', startISO: '...', endISO: '...' }
[N8N][RESPONSE] status: 200 OK
[N8N][RESPONSE] raw: {... "htmlLink": "..."}
[NYRA] n8n OK via fetch
```

#### Se fetch fallisce e usa IPC (main process):
```
[NYRA] Creating reminder via n8n: http://localhost:5678/webhook/calendar-agent
[NYRA] Payload: { summary: 'Prova da NYRA', startISO: '...', endISO: '...' }
[NYRA] Fallback via IPC main process
[NYRA] n8n OK via IPC fallback
```

### 4. Verifica Google Calendar
- L'evento deve essere creato su Google Calendar
- Controllare che l'ora sia corretta (15:00-16:00)
- Verificare che il titolo sia "Prova da NYRA"

## Struttura Payload Corretta

```json
{
  "summary": "Prova da NYRA",
  "startISO": "2025-01-XXT15:00:00Z",
  "endISO": "2025-01-XXT16:00:00Z"
}
```

## Variabili Ambiente

```bash
# .env locale deve contenere:
VITE_N8N_URL=http://localhost:5678
VITE_NYRA_DEBUG_N8N=1
```

## Fallback IPC

Se la fetch dal renderer fallisce per CORS:
1. Automaticamente passa a IPC main process
2. Main process fa la chiamata HTTP a n8n
3. Risposta viene restituita via IPC al renderer
4. Nessun errore CORS per l'utente finale

## Debug

Per disabilitare i log dettagliati:
```bash
VITE_NYRA_DEBUG_N8N=0
```
