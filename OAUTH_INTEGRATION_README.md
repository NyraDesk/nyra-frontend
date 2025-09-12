# Integrazione OAuth-Broker in Electron - NYRA Desktop

## Panoramica

L'oauth-broker è stato completamente integrato in Electron per creare un singolo eseguibile vendibile. Non ci sono più processi separati - tutto funziona all'interno dell'app Electron.

## Struttura Finale

```
nyra/
├── src/
│   ├── electron/
│   │   ├── main.ts (processo principale Electron)
│   │   ├── oauth-server.ts (oauth-broker integrato)
│   │   ├── preload.js (sicurezza)
│   │   └── tsconfig.json (configurazione TypeScript)
│   └── [resto dell'app React]
├── electron-builder.json (configurazione packaging)
└── package.json
```

## Funzionalità Integrate

### 1. Server OAuth Integrato
- **Porta**: 3001 (solo localhost)
- **Funzioni**: Google OAuth, Gmail, Calendar, OpenRouter proxy
- **Sicurezza**: CORS configurato per localhost only

### 2. API Esposte via IPC
- `oauthHealthCheck()` - Verifica stato server
- `oauthStart(userId)` - Avvia processo OAuth
- `oauthStatus(userId)` - Verifica autenticazione
- `oauthSaveTokens(userId, tokens)` - Salva token
- `gmailSend(userId, to, subject, body)` - Invia email
- `calendarCreate(userId, summary, description, startTime, endTime)` - Crea evento
- `openrouterRequest(requestBody)` - Proxy OpenRouter

### 3. Sicurezza
- Context isolation abilitata
- Node integration disabilitata
- Preload script per API sicure
- CORS configurato per localhost

## Comandi di Sviluppo

```bash
# Sviluppo completo
npm run electron-dev

# Build Electron TypeScript
npm run build-electron

# Build produzione
npm run build-electron-prod

# Packaging per distribuzione
npm run electron-pack
```

## Variabili d'Ambiente

Crea un file `.env` nella root del progetto:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
OPENROUTER_API_KEY=your_openrouter_api_key
```

## Flusso OAuth

1. **Avvio**: L'app Electron avvia il server OAuth integrato sulla porta 3001
2. **Autenticazione**: L'utente clicca su "Connect Google" nel frontend
3. **Redirect**: Il browser si apre con l'URL di autorizzazione Google
4. **Callback**: Google reindirizza a `localhost:3001/auth/google/callback`
5. **Token**: I token vengono salvati in memoria e resi disponibili per le API
6. **Utilizzo**: Le API Gmail e Calendar utilizzano i token salvati

## Vantaggi dell'Integrazione

### ✅ Vantaggi
- **Singolo eseguibile**: Un solo file .app/.exe per la distribuzione
- **Nessun processo esterno**: Tutto integrato in Electron
- **Sicurezza migliorata**: Nessuna esposizione di porte esterne
- **Facilità di distribuzione**: Un solo pacchetto da installare
- **Performance**: Comunicazione IPC invece di HTTP

### ⚠️ Considerazioni
- **Memoria**: I token sono salvati in memoria (si perdono al riavvio)
- **Porta fissa**: Il server OAuth usa sempre la porta 3001
- **Dipendenze**: Aggiunte dipendenze Express e Google APIs

## Troubleshooting

### Server OAuth non si avvia
```bash
# Verifica porta 3001
lsof -i :3001

# Verifica variabili d'ambiente
echo $GOOGLE_CLIENT_ID
```

### Errori di autenticazione
- Verifica che le credenziali Google siano corrette
- Controlla che il redirect URI sia configurato in Google Console
- Verifica che l'API OpenRouter sia attiva

### Build fallisce
```bash
# Pulisci cache
rm -rf node_modules package-lock.json
npm install

# Ricompila
npm run build-electron
```

## Distribuzione

Il comando `npm run electron-pack` crea:

- **macOS**: .dmg e .zip (x64 + ARM64)
- **Windows**: .exe installer e portable
- **Linux**: AppImage e .deb

Tutti i file sono nella cartella `dist-electron/`.

## Migrazione da oauth-broker separato

1. **Backup**: Salva la cartella `oauth-broker/` per riferimento
2. **Configurazione**: Copia le variabili d'ambiente nel nuovo `.env`
3. **Test**: Verifica che tutte le funzionalità OAuth funzionino
4. **Rimozione**: Elimina la cartella `oauth-broker/` e il processo separato

## Supporto

Per problemi o domande:
1. Verifica i log nella console Electron (DevTools)
2. Controlla i log del server OAuth integrato
3. Verifica la configurazione delle variabili d'ambiente
4. Testa le API individualmente tramite IPC
