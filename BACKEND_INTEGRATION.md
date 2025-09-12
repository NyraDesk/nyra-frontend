# 🔄 NYRA Backend Integration Guide

## 📋 Panoramica

È stato creato un backend Node.js/Express completo che sostituisce Electron per deployment web. Il backend fornisce tutte le funzionalità di NYRA tramite API REST.

## 🏗️ Struttura Creata

```
backend/
├── server.js              # Server Express principale
├── package.json           # Dipendenze e script
├── .env.example          # Template configurazione
├── test-api.js           # Script di test API
├── routes/               # Route API
│   ├── auth.js          # Autenticazione Google OAuth
│   ├── email.js         # Gestione email e Excel
│   └── ai.js            # AI e OpenRouter
├── services/            # Servizi business logic
│   ├── openrouter.js    # Servizio OpenRouter (convertito da TS)
│   ├── gmail.js         # Servizio Gmail (convertito da TS)
│   └── excel.js         # Servizio Excel (convertito da TS)
├── middleware/          # Middleware
│   └── auth.js          # Autenticazione JWT
└── uploads/             # Directory per file upload
```

## 🚀 Avvio Backend

### 1. Installazione Dipendenze
```bash
cd backend
npm install
```

### 2. Configurazione
```bash
cp .env.example .env
# Modifica .env con i tuoi valori:
# - OPENROUTER_API_KEY
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET
# - JWT_SECRET
```

### 3. Avvio Server
```bash
# Development (con auto-reload)
npm run dev

# Production
npm start
```

### 4. Test API
```bash
# Testa tutte le API
node test-api.js
```

## 📡 API Endpoints Disponibili

### 🔐 Autenticazione
- `POST /api/auth/google` - Login Google OAuth
- `GET /api/auth/verify` - Verifica JWT token
- `POST /api/auth/refresh` - Refresh Google tokens
- `GET /api/auth/google-url` - URL OAuth Google

### 📧 Email
- `POST /api/email/generate` - Genera email con AI
- `POST /api/email/send` - Invia email via Gmail
- `POST /api/email/parse-excel` - Parse Excel per email
- `POST /api/email/bulk-generate` - Genera email multiple

### 🤖 AI
- `POST /api/ai/chat` - Chat con OpenRouter
- `GET /api/ai/test` - Test connessione AI
- `POST /api/ai/analyze-text` - Analizza testo
- `POST /api/ai/generate-content` - Genera contenuto

### 🏥 Health
- `GET /health` - Health check

## 🔄 Integrazione Frontend

### 1. Modifica Configurazione Frontend

Nel file `src/config/n8n.ts`, aggiungi:
```typescript
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
```

### 2. Crea Servizio Backend

Crea `src/services/backendService.ts`:
```typescript
const BACKEND_URL = 'http://localhost:3001';

export class BackendService {
  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    return response.json();
  }

  // AI Chat
  async chat(messages: any[], context?: string) {
    return this.request('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, context })
    });
  }

  // Email Generation
  async generateEmail(prompt: string, emailType?: string) {
    return this.request('/api/email/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, emailType })
    });
  }

  // Send Email
  async sendEmail(emailData: any, accessToken: string) {
    return this.request('/api/email/send', {
      method: 'POST',
      body: JSON.stringify({ ...emailData, accessToken })
    });
  }

  // Parse Excel
  async parseExcel(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${BACKEND_URL}/api/email/parse-excel`, {
      method: 'POST',
      body: formData
    });
    
    return response.json();
  }
}

export const backendService = new BackendService();
```

### 3. Sostituisci Chiamate Dirette

Nel frontend, sostituisci le chiamate dirette a OpenRouter con:
```typescript
// Prima (diretta)
const response = await openRouter.getResponse(messages);

// Dopo (tramite backend)
const response = await backendService.chat(messages);
```

## 🔧 Configurazione Variabili d'Ambiente

### Frontend (.env)
```bash
VITE_BACKEND_URL=http://localhost:3001
VITE_OPENROUTER_API_KEY=your_key_here
```

### Backend (.env)
```bash
PORT=3001
NODE_ENV=development
OPENROUTER_API_KEY=your_key_here
OPENROUTER_REFERER=http://localhost:3001
OPENROUTER_TITLE=NYRA Backend
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```

## 🚀 Deployment

### 1. Build Frontend
```bash
npm run build
```

### 2. Deploy Backend
```bash
cd backend
npm install --production
npm start
```

### 3. Configurazione Produzione
- Modifica `CORS_ORIGIN` con il dominio del frontend
- Configura `NODE_ENV=production`
- Usa HTTPS per produzione

## 🔄 Migrazione Graduale

### Fase 1: Test Backend
1. Avvia backend: `cd backend && npm run dev`
2. Testa API: `node test-api.js`
3. Verifica funzionalità base

### Fase 2: Integrazione Parziale
1. Crea `backendService.ts` nel frontend
2. Sostituisci alcune chiamate AI
3. Testa integrazione

### Fase 3: Migrazione Completa
1. Sostituisci tutte le chiamate dirette
2. Implementa autenticazione JWT
3. Testa funzionalità complete

## 🛡️ Sicurezza

- **CORS**: Configurato per frontend specifico
- **JWT**: Autenticazione sicura
- **Input Validation**: Validazione dati input
- **Error Handling**: Gestione errori sicura
- **File Upload**: Limitazioni dimensioni file

## 📊 Monitoraggio

### Health Check
```bash
curl http://localhost:3001/health
```

### Logs
- Development: Log dettagliati in console
- Production: Configurare logging esterno (es. Winston)

## 🔧 Sviluppo

### Hot Reload
```bash
cd backend
npm run dev  # Usa nodemon per auto-reload
```

### Debug
```bash
# Abilita debug logs
NODE_ENV=development npm run dev
```

## 📝 Note Importanti

1. **Conversione TypeScript → JavaScript**: Tutti i servizi sono stati convertiti da TS a JS
2. **Compatibilità**: Mantiene la stessa logica del frontend originale
3. **Sicurezza**: Implementa controlli di sicurezza aggiuntivi
4. **Scalabilità**: Pronto per deployment su server web
5. **Manutenibilità**: Struttura modulare e ben documentata

Il backend è ora pronto per sostituire Electron e permettere deployment web di NYRA! 🚀
