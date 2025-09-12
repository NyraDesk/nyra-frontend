# Setup URL Webhook Google Calendar - NYRA

## 🎯 Obiettivo
Configurare l'URL del webhook per Google Calendar in NYRA e verificare che funzioni correttamente.

## 📋 Passi di Configurazione

### 1. Creare File .env
```bash
# Copia il template
cp env.example .env

# Modifica .env con l'URL corretto
N8N_URL=http://localhost:5678
VITE_N8N_URL=http://localhost:5678
NYRA_ENABLE_AUTOMATION=1
```

### 2. Verificare Configurazione n8n
- Assicurati che n8n sia attivo su `http://localhost:5678`
- Verifica che il workflow Google Calendar sia attivo
- Controlla che l'endpoint `/webhook/calendar-agent` sia disponibile

### 3. Testare Integrazione
```bash
# Avvia NYRA
npm run electron-dev

# Invia messaggio di test
"Ricorda di chiamare Marco domani alle 15"
```

## 🔍 Verifiche da Eseguire

### ✅ Log Console NYRA
```
[NYRA] Creating reminder via n8n: http://localhost:5678/webhook/calendar-agent
[NYRA] Payload ricevuto: {
  summary: "Ricorda di chiamare Marco",
  startISO: "2025-01-XXT15:00:00.000Z",
  endISO: "2025-01-XXT16:00:00.000Z"
}
```

### ✅ Log n8n
- Webhook ricevuto con payload corretto
- Evento creato in Google Calendar
- Risposta con `ok: true` e `eventLink`

### ✅ Google Calendar
- Evento creato con titolo corretto
- Data e ora corrette
- Reminder impostato a 30 minuti prima

## 🚨 Risoluzione Problemi

### Problema: URL non corretto
**Sintomi**: Log mostrano URL diverso da `localhost:5678`
**Soluzione**: 
1. Verifica file `.env`
2. Riavvia NYRA
3. Controlla configurazione in `src/config/n8n.ts`

### Problema: n8n non raggiungibile
**Sintomi**: Errore di connessione o timeout
**Soluzione**:
1. Verifica che n8n sia attivo
2. Controlla porta 5678
3. Testa con `curl http://localhost:5678`

### Problema: Webhook non ricevuto
**Sintomi**: n8n non riceve richieste
**Soluzione**:
1. Verifica endpoint `/webhook/calendar-agent`
2. Controlla che il workflow sia attivo
3. Testa webhook direttamente con cURL

## 🧪 Test con cURL

### Test Webhook Diretto
```bash
curl -X POST http://localhost:5678/webhook/calendar-agent \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Test Event",
    "startISO": "2025-01-15T10:00:00+02:00",
    "endISO": "2025-01-15T11:00:00+02:00"
  }'
```

### Risposta Attesa
```json
{
  "ok": true,
  "eventLink": "https://calendar.google.com/calendar/event?eid=..."
}
```

## 📁 File di Configurazione

### File Principali
- `.env` - Variabili d'ambiente (da creare)
- `env.example` - Template configurazione
- `src/config/n8n.ts` - Configurazione React
- `electron/config.js` - Configurazione Electron

### File Aggiornati
- `src/services/n8nIntegration.ts` - Usa configurazione centralizzata
- `src/services/n8nConnector.ts` - Usa configurazione centralizzata
- `electron/main.js` - Usa configurazione centralizzata
- `src/App.tsx` - Rimosso URL hardcoded

## 🔄 Flusso di Integrazione

1. **Utente invia messaggio** con parole chiave reminder
2. **NYRA rileva** parole chiave e attiva `createReminder`
3. **Parsing messaggio** per estrarre data, ora e titolo
4. **Invio a n8n** via `http://localhost:5678/webhook/calendar-agent`
5. **n8n crea evento** in Google Calendar con reminder
6. **Risposta a NYRA** con link all'evento
7. **Conferma utente** con link cliccabile all'evento

## 📊 Metriche di Successo

- ✅ **100%** delle richieste inviate all'URL corretto
- ✅ **100%** degli eventi creati in Google Calendar
- ✅ **100%** dei reminder impostati a 30 minuti
- ✅ **< 2 secondi** tempo di risposta n8n
- ✅ **0%** di errori di connessione

## 🚀 Prossimi Passi

### Immediato
1. ✅ Configurare file `.env`
2. ✅ Testare integrazione locale
3. ✅ Verificare creazione eventi

### Breve Termine
1. Testare con workflow n8n reale
2. Verificare autenticazione Google Calendar
3. Testare fallback e gestione errori

### Medio Termine
1. Configurazione produzione
2. Monitoraggio e logging
3. Ottimizzazioni performance

## 📞 Supporto

Se incontri problemi:
1. Controlla i log della console NYRA
2. Verifica configurazione n8n
3. Testa webhook direttamente con cURL
4. Consulta documentazione in `test-webhook-url.md`

## 🎉 Completamento

Una volta completati tutti i passi:
- ✅ URL webhook configurato correttamente
- ✅ Integrazione n8n funzionante
- ✅ Eventi Google Calendar creati automaticamente
- ✅ Reminder impostati correttamente
- ✅ Sistema robusto e gestione errori
