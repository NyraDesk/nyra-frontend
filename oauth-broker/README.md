# NYRA OAuth2 Token Broker

Servizio OAuth2 per la gestione dei token Google per NYRA, con supporto completo per Gmail e Google Calendar.

## Caratteristiche

- **Gestione Token Separata**: Supporto per servizi Gmail e Google Calendar separati
- **Database SQLite**: Archiviazione sicura dei token con audit trail completo
- **Auto-refresh**: Rinnovo automatico dei token scaduti
- **Sicurezza**: Rate limiting, IP restrictions, validazione parametri
- **Logging Completo**: Audit trail per tutte le operazioni sui token

## Struttura Database

### Tabella `tokens`
```sql
CREATE TABLE tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(255) NOT NULL,
    service VARCHAR(50) NOT NULL, -- 'gmail' o 'gcal'
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expiry_date DATETIME NOT NULL,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    scope TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, service)
);
```

### Tabella `token_audit_log`
Log completo di tutte le operazioni sui token per audit e debugging.

## Endpoint API

### Autenticazione

#### `GET /auth/google/start`
Avvia il flusso OAuth2 per un utente specifico.
```
GET /auth/google/start?user_id=<user_id>
```

#### `GET /auth/google/callback`
Gestisce il callback OAuth2 e salva automaticamente i token per i servizi autorizzati.

#### `GET /auth/google/status`
Verifica lo stato di autenticazione per Gmail e Google Calendar.
```
GET /auth/google/status?user_id=<user_id>
```

**Risposta:**
```json
{
  "authenticated": true,
  "gmail": { "connected": true, "service": "gmail" },
  "gcal": { "connected": true, "service": "gcal" },
  "message": "User has valid tokens"
}
```

#### `DELETE /auth/google/revoke`
Revoca tutti i token di un utente.

### Gestione Token

#### `POST /oauth/google/save-tokens`
Salva o aggiorna i token per un servizio specifico.
```json
{
  "user_id": "user123",
  "service": "gmail",
  "access_token": "ya29.a0...",
  "refresh_token": "1//04...",
  "expiry_date": "2024-12-31T23:59:59.000Z"
}
```

#### `GET /oauth/google/access-token`
Recupera i token per un servizio specifico.
```
GET /oauth/google/access-token?user_id=<user_id>&service=<gmail|gcal>
```

**Risposta:**
```json
{
  "success": true,
  "user_id": "user123",
  "service": "gmail",
  "access_token": "ya29.a0...",
  "refresh_token": "1//04...",
  "expiry_date": "2024-12-31T23:59:59.000Z",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "https://www.googleapis.com/auth/gmail.send"
}
```

**Errori:**
- `404`: Token non trovati
- `401`: Token scaduti

#### `POST /oauth/google/access-token` (con refresh)
Recupera token validi con auto-refresh se necessario.
```json
{
  "user_id": "user123",
  "service": "gmail"
}
```

#### `POST /oauth/google/verify`
Verifica la validità di un token con Google API.
```json
{
  "user_id": "user123",
  "service": "gmail"
}
```

#### `GET /oauth/google/scopes`
Restituisce gli scope OAuth2 supportati.

## Configurazione

### Variabili d'Ambiente
```bash
# Database
DATABASE_PATH=./database/tokens.db

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Sicurezza
ALLOWED_IPS=127.0.0.1,::1
CORS_ORIGIN=http://localhost:5173

# Server
PORT=3001
NODE_ENV=development
```

### Installazione
```bash
npm install
npm start
```

## Flusso di Autenticazione

1. **Avvio**: `GET /auth/google/start?user_id=<user_id>`
2. **Redirect**: Utente viene reindirizzato a Google per autorizzazione
3. **Callback**: Google reindirizza a `/auth/google/callback` con il codice
4. **Scambio**: Il codice viene scambiato con i token
5. **Salvataggio**: I token vengono salvati per ogni servizio autorizzato
6. **Completamento**: L'utente viene reindirizzato all'app con conferma

## Gestione Token

### Salvataggio
- I token vengono salvati separatamente per Gmail e Google Calendar
- Supporto per upsert (INSERT OR REPLACE)
- Timestamp automatici per created_at e updated_at

### Refresh Automatico
- Controllo automatico della scadenza
- Refresh automatico tramite refresh_token
- Aggiornamento del database con nuovi token

### Revoca
- Revoca remota con Google API
- Rimozione locale dal database
- Logging completo dell'operazione

## Sicurezza

### Rate Limiting
- Protezione contro abuso degli endpoint
- Configurabile per ambiente

### IP Restrictions
- Limitazione accesso per endpoint sensibili
- Configurabile tramite variabili d'ambiente

### Validazione
- Validazione completa dei parametri
- Sanitizzazione input
- Controlli di sicurezza

### Audit Trail
- Log di tutte le operazioni
- Tracciamento IP e User-Agent
- Dettagli completi per debugging

## Monitoraggio

### Health Check
```
GET /health
```

### Logging
- Console logging per sviluppo
- Database logging per produzione
- Rotazione automatica log

### Cleanup
- Pulizia automatica token scaduti
- Esecuzione ogni ora
- Logging delle operazioni

## Sviluppo

### Test
```bash
# Test endpoint
curl http://localhost:3001/health

# Test salvataggio token
curl -X POST http://localhost:3001/oauth/google/save-tokens \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","service":"gmail","access_token":"test","refresh_token":"test","expiry_date":"2024-12-31T23:59:59.000Z"}'
```

### Database
```bash
# Verifica struttura
sqlite3 database/tokens.db ".schema"

# Verifica token
sqlite3 database/tokens.db "SELECT * FROM tokens;"

# Verifica audit
sqlite3 database/tokens.db "SELECT * FROM token_audit_log ORDER BY timestamp DESC LIMIT 10;"
```

## Troubleshooting

### Token Non Trovati
- Verificare che l'utente abbia completato l'autenticazione
- Controllare il database per token esistenti
- Verificare i log per errori di salvataggio

### Token Scaduti
- I token scaduti restituiscono 401
- Il refresh automatico dovrebbe gestire il rinnovo
- Se il refresh fallisce, l'utente deve re-autenticarsi

### Errori di Connessione
- Verificare le variabili d'ambiente
- Controllare la connessione al database
- Verificare i log per errori specifici

## Supporto

Per problemi o domande, consultare i log del server e del database. Tutte le operazioni sono registrate nell'audit trail per facilitare il debugging.