# Test Integrazione n8n via IPC - NYRA

## Obiettivo
Verificare che l'integrazione n8n funzioni senza errori CORS usando Electron come proxy.

## Setup Pre-test
1. **Avvia n8n** (workflow attivo su `/webhook/calendar-agent`)
2. **Avvia NYRA** (`npm run electron-dev`)

## Test 1: Creazione Reminder Base
**Input utente:** "Ricordami di chiamare Marco domani alle 15"

**Risultato atteso:**
- ✅ Bubble verde "✅ Reminder creato nel tuo calendario!" (se n8n funziona)
- ✅ Risposta normale di NYRA (OpenRouter)
- ❌ Nessun errore CORS in console

## Test 2: Fallback API
**Input utente:** "Reminder per meeting con team alle 10"

**Risultato atteso:**
- ✅ Bubble verde "✅ Reminder creato nel tuo calendario!" (se n8n funziona)
- ✅ Risposta normale di NYRA (OpenRouter)
- ❌ Nessun errore CORS in console

## Test 3: Gestione Errori
**Input utente:** "Meeting con cliente alle 14"

**Risultato atteso:**
- ⚠️ Bubble warning "⚠️ Servizio reminder temporaneamente non disponibile" (se n8n non funziona)
- ✅ Risposta normale di NYRA (OpenRouter) - NON bloccata
- ❌ Nessun errore CORS in console

## Verifiche Console
1. **Main Process:** Dovrebbe mostrare log `[NYRA] Creating reminder via n8n: http://localhost:5678/webhook/calendar-agent`
2. **Renderer:** Nessun errore CORS o fetch
3. **IPC:** Comunicazione fluida tra renderer e main process

## Variabili d'Ambiente
- `N8N_URL` (opzionale, default: `http://localhost:5678`)
- `NYRA_ENABLE_AUTOMATION` (opzionale, per funzionalità automation)

## Fallback
Se `window.electronAPI.createReminder` non è disponibile, il sistema usa `fetch` diretto (richiede CORS su n8n).

## Note
- L'integrazione è non-blocking: anche se n8n fallisce, la chat continua normalmente
- I messaggi di conferma sono locali e non bloccano il flusso LLM
- Il sistema è retrocompatibile con l'API precedente
