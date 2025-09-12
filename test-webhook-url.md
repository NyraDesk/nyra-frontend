# Test Configurazione Webhook URL - NYRA

## Obiettivo
Verificare che l'URL del webhook Google Calendar sia configurato correttamente in tutti i file.

## Configurazione Attuale

### ✅ File di Configurazione
- `env.example` - Template per variabili d'ambiente
- `src/config/n8n.ts` - Configurazione centralizzata React
- `electron/config.js` - Configurazione centralizzata Electron

### ✅ URL Configurato
- **Base URL**: `http://localhost:5678`
- **Webhook Calendar**: `http://localhost:5678/webhook/calendar-agent`
- **Health Check**: `http://localhost:5678/webhook/nyra-health`
- **Workflows**: `http://localhost:5678/webhook/nyra-workflows`

## File Aggiornati

### 1. `src/services/n8nIntegration.ts`
- ✅ Importa configurazione da `../config/n8n`
- ✅ Usa `getCalendarWebhookURL()` per URL dinamico
- ✅ Rimosso URL hardcoded

### 2. `src/services/n8nConnector.ts`
- ✅ Importa configurazione da `../config/n8n`
- ✅ Usa `getCalendarWebhookURL()` per webhook
- ✅ Usa `getN8NBaseURL()` per URL base
- ✅ Rimosso URL hardcoded

### 3. `electron/main.js`
- ✅ Importa configurazione da `./config`
- ✅ Usa `config.N8N.getCalendarWebhookURL()`
- ✅ Rimosso URL hardcoded

### 4. `src/App.tsx`
- ✅ Rimosso log URL hardcoded
- ✅ Usa servizio n8nIntegration per URL dinamico

## Test di Verifica

### 1. Test Configurazione
```bash
# Verifica che il file .env sia configurato
cat .env

# Dovrebbe contenere:
N8N_URL=http://localhost:5678
VITE_N8N_URL=http://localhost:5678
```

### 2. Test Avvio NYRA
```bash
# Avvia NYRA in modalità sviluppo
npm run electron-dev

# Verifica nei log che l'URL sia corretto:
[NYRA] Creating reminder via n8n: http://localhost:5678/webhook/calendar-agent
```

### 3. Test Creazione Reminder
1. Invia messaggio: "Ricorda di chiamare Marco domani alle 15"
2. Verifica nei log che il payload sia inviato all'URL corretto
3. Controlla che n8n riceva la richiesta

### 4. Test Fallback
1. Disconnetti n8n (ferma il servizio)
2. Invia messaggio reminder
3. Verifica che venga mostrato messaggio di errore appropriato
4. Controlla che la chat continui normalmente

## Verifiche Console

### Main Process (Electron)
```
[NYRA] Creating reminder via n8n: http://localhost:5678/webhook/calendar-agent
[NYRA] Payload ricevuto: {
  summary: "Ricorda di chiamare Marco",
  startISO: "2025-01-XXT15:00:00.000Z",
  endISO: "2025-01-XXT16:00:00.000Z"
}
```

### Renderer (React)
```
=== N8N DEBUG ===
Messaggio contiene ricorda? true
Invio a n8n: Ricorda di chiamare Marco domani alle 15
```

## Troubleshooting

### Problemi Comuni
1. **URL non corretto**: Verifica file `.env` e configurazione
2. **Configurazione non caricata**: Riavvia NYRA dopo modifiche
3. **Variabili d'ambiente non lette**: Controlla sintassi file `.env`

### Debug
1. Controlla console per URL utilizzati
2. Verifica che n8n sia attivo su `localhost:5678`
3. Testa webhook direttamente con cURL
4. Controlla configurazione in tutti i file

## Prossimi Passi

### 1. Configurazione Produzione
- [ ] Impostare URL n8n di produzione in `.env`
- [ ] Testare workflow in ambiente produzione
- [ ] Verificare autenticazione Google Calendar

### 2. Test End-to-End
- [ ] Test completo creazione evento
- [ ] Verifica reminder funzionanti
- [ ] Controllo link evento Google Calendar

### 3. Monitoraggio
- [ ] Logging strutturato per analisi
- [ ] Metriche di successo/errore
- [ ] Alert per problemi di connessione

## Note Tecniche

- **Configurazione Centralizzata**: Tutti gli URL sono gestiti da file di configurazione
- **Fallback Automatico**: Se `.env` non esiste, usa valori di default
- **Hot Reload**: Modifiche a `.env` richiedono riavvio NYRA
- **Compatibilità**: Supporta sia sviluppo che produzione
