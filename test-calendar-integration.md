# Test Integrazione Calendario - NYRA

## Obiettivo
Verificare che l'integrazione con Google Calendar funzioni correttamente tramite n8n.

## Pre-requisiti
1. **n8n attivo** con workflow configurato
2. **NYRA avviato** (`npm run electron-dev`)
3. **Variabili d'ambiente** configurate correttamente

## Test 1: Creazione Evento Base
**Input utente:** "Ricorda di chiamare Marco domani alle 15"

**Risultato atteso:**
- ✅ Payload corretto inviato a n8n con:
  - `summary`: "Ricorda di chiamare Marco"
  - `startISO`: "2025-01-XXT15:00:00.000Z" (domani alle 15)
  - `endISO`: "2025-01-XXT16:00:00.000Z" (domani alle 16)
- ✅ Evento creato in Google Calendar
- ✅ Reminder impostato a 30 minuti prima
- ✅ Risposta: "✅ Promemoria impostato. [Apri evento](link)"

## Test 2: Creazione Evento con Ora Specifica
**Input utente:** "Meeting con team alle 10:30"

**Risultato atteso:**
- ✅ Payload corretto con:
  - `summary`: "Meeting con team"
  - `startISO`: "2025-01-XXT10:30:00.000Z"
  - `endISO`: "2025-01-XXT11:30:00.000Z"
- ✅ Evento creato con ora precisa
- ✅ Durata di 1 ora

## Test 3: Gestione Date Passate
**Input utente:** "Riunione alle 8" (se sono già le 9)

**Risultato atteso:**
- ✅ Evento spostato automaticamente a domani
- ✅ `startISO`: "2025-01-XXT08:00:00.000Z" (domani)
- ✅ `endISO`: "2025-01-XXT09:00:00.000Z" (domani)

## Test 4: Gestione Errori n8n
**Simulazione:** n8n non disponibile

**Risultato atteso:**
- ⚠️ Messaggio: "⚠️ Servizio reminder temporaneamente non disponibile: [errore specifico]"
- ✅ Chat continua normalmente
- ❌ Nessun blocco dell'applicazione

## Verifiche Console

### Main Process (Electron)
```
[NYRA] Creating reminder via n8n: https://your-n8n-url.com/webhook/calendar-agent
[NYRA] Payload ricevuto: {
  summary: "Ricorda di chiamare Marco",
  startISO: "2025-01-XXT15:00:00.000Z",
  endISO: "2025-01-XXT16:00:00.000Z",
  userId: "user",
  userName: "Nome Utente"
}
[NYRA] Risposta n8n: { ok: true, eventLink: "https://calendar.google.com/..." }
```

### Renderer (React)
```
=== N8N DEBUG ===
Messaggio contiene ricorda? true
Invio a n8n: Ricorda di chiamare Marco domani alle 15
URL webhook: https://your-n8n-url.com/webhook/calendar-agent
```

## Verifiche n8n

### 1. Webhook Ricevuto
- Controlla che il payload contenga tutti i campi richiesti
- Verifica formato ISO delle date

### 2. Nodo Google Calendar
- Controlla che l'evento sia creato
- Verifica che il reminder sia impostato a 30 minuti
- Controlla che `htmlLink` sia presente nella risposta

### 3. Webhook Response
- Verifica che il codice di risposta sia 200
- Controlla che il body contenga `ok: true` e `eventLink`

## Test di Produzione

### 1. Configurazione URL
```bash
# .env
N8N_URL=https://your-production-n8n-url.com
VITE_N8N_URL=https://your-production-n8n-url.com
```

### 2. Test End-to-End
1. Invia messaggio con parole chiave reminder
2. Verifica creazione evento in Google Calendar
3. Controlla che il link all'evento sia cliccabile
4. Verifica che il reminder funzioni

### 3. Fallback
1. Disconnetti n8n
2. Invia messaggio reminder
3. Verifica messaggio di errore appropriato
4. Controlla che la chat continui normalmente

## Metriche di Successo

- ✅ **100%** degli eventi creati correttamente
- ✅ **100%** dei reminder impostati a 30 minuti
- ✅ **100%** dei link evento restituiti
- ✅ **0%** di blocchi dell'applicazione
- ✅ **< 2 secondi** tempo di risposta n8n

## Troubleshooting

### Problemi Comuni
1. **Date non valide**: Verifica formato ISO 8601
2. **Campi mancanti**: Controlla parsing del messaggio
3. **Autenticazione Google**: Verifica credenziali n8n
4. **Timeout**: Controlla configurazione n8n

### Debug
1. Abilita log dettagliati in n8n
2. Controlla console NYRA per payload e risposte
3. Verifica workflow n8n per errori
4. Testa webhook direttamente con cURL
