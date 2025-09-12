# Test degli Endpoint OAuth Broker

## Prerequisiti
- Server OAuth broker in esecuzione su porta 3001
- Database SQLite configurato correttamente
- Variabili d'ambiente configurate

## Test degli Endpoint

### 1. Health Check
```bash
curl http://localhost:3001/health
```

### 2. Salvataggio Token (POST /oauth/google/save-tokens)
```bash
curl -X POST http://localhost:3001/oauth/google/save-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_123",
    "service": "gmail",
    "access_token": "test_access_token_gmail",
    "refresh_token": "test_refresh_token_gmail",
    "expiry_date": "2024-12-31T23:59:59.000Z"
  }'
```

```bash
curl -X POST http://localhost:3001/oauth/google/save-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_123",
    "service": "gcal",
    "access_token": "test_access_token_gcal",
    "refresh_token": "test_refresh_token_gcal",
    "expiry_date": "2024-12-31T23:59:59.000Z"
  }'
```

### 3. Recupero Access Token (GET /oauth/google/access-token)
```bash
# Test Gmail
curl "http://localhost:3001/oauth/google/access-token?user_id=test_user_123&service=gmail"

# Test Google Calendar
curl "http://localhost:3001/oauth/google/access-token?user_id=test_user_123&service=gcal"

# Test con servizio non valido
curl "http://localhost:3001/oauth/google/access-token?user_id=test_user_123&service=invalid"

# Test con utente non esistente
curl "http://localhost:3001/oauth/google/access-token?user_id=nonexistent&service=gmail"
```

### 4. Verifica Token (POST /oauth/google/verify)
```bash
curl -X POST http://localhost:3001/oauth/google/verify \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_123",
    "service": "gmail"
  }'
```

### 5. Status Autenticazione (GET /auth/google/status)
```bash
curl "http://localhost:3001/auth/google/status?user_id=test_user_123"
```

### 6. Access Token con Refresh (POST /oauth/google/access-token)
```bash
curl -X POST http://localhost:3001/oauth/google/access-token \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_123",
    "service": "gmail"
  }'
```

## Test di Scenari

### Test Token Scaduti
1. Salva token con data di scadenza nel passato
2. Verifica che GET /oauth/google/access-token restituisca 401
3. Verifica che POST /oauth/google/access-token tenti il refresh

### Test Servizi Separati
1. Salva token solo per Gmail
2. Verifica che status mostri Gmail connesso e GCal non connesso
3. Salva token per GCal
4. Verifica che status mostri entrambi connessi

### Test Logging e Audit
1. Esegui operazioni sui token
2. Verifica che i log siano presenti nel database
3. Verifica che l'audit trail sia completo

## Risultati Attesi

### Struttura Database
- Tabella `tokens` con campi: user_id, service, access_token, refresh_token, expiry_date
- UNIQUE constraint su (user_id, service)
- Indici per performance

### Endpoint
- ✅ POST /oauth/google/save-tokens - Salva/aggiorna token
- ✅ GET /oauth/google/access-token - Recupera token (401 se scaduto)
- ✅ POST /oauth/google/verify - Verifica validità token
- ✅ GET /auth/google/status - Status autenticazione per entrambi i servizi
- ✅ GET /auth/google/callback - Gestisce OAuth e salva token

### Sicurezza
- Validazione parametri
- Logging completo
- Audit trail
- Rate limiting
- IP restrictions (se configurato)

## Comandi di Verifica Database

```bash
# Verifica struttura tabella
sqlite3 oauth-broker/database/tokens.db ".schema tokens"

# Verifica token salvati
sqlite3 oauth-broker/database/tokens.db "SELECT * FROM tokens;"

# Verifica audit log
sqlite3 oauth-broker/database/tokens.db "SELECT * FROM token_audit_log ORDER BY timestamp DESC LIMIT 10;"
```
