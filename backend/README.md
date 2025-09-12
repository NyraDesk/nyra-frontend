# NYRA Backend API Server

Backend Node.js/Express per NYRA che sostituisce Electron per deployment web.

## 🚀 Quick Start

### 1. Installazione
```bash
cd backend
npm install
```

### 2. Configurazione
```bash
cp .env.example .env
# Modifica .env con i tuoi valori
```

### 3. Avvio
```bash
# Development
npm run dev

# Production
npm start
```

## 📋 API Endpoints

### Authentication
- `POST /api/auth/google` - Login con Google OAuth
- `GET /api/auth/verify` - Verifica JWT token
- `POST /api/auth/refresh` - Refresh Google tokens
- `GET /api/auth/google-url` - Ottieni URL OAuth Google

### Email
- `POST /api/email/generate` - Genera email con AI
- `POST /api/email/send` - Invia email via Gmail
- `POST /api/email/parse-excel` - Parse Excel file per email
- `POST /api/email/bulk-generate` - Genera email multiple da Excel

### AI
- `POST /api/ai/chat` - Chat con OpenRouter
- `GET /api/ai/test` - Test connessione AI
- `POST /api/ai/analyze-text` - Analizza testo con AI
- `POST /api/ai/generate-content` - Genera contenuto con AI

### Health
- `GET /health` - Health check

## 🔧 Configurazione

### Variabili d'Ambiente (.env)
```bash
# Server
PORT=3001
NODE_ENV=development

# OpenRouter AI
OPENROUTER_API_KEY=your_key_here
OPENROUTER_REFERER=http://localhost:3001
OPENROUTER_TITLE=NYRA Backend

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:5173
```

## 📁 Struttura

```
backend/
├── server.js              # Server principale
├── package.json           # Dipendenze e script
├── .env.example          # Template configurazione
├── routes/               # Route API
│   ├── auth.js          # Autenticazione
│   ├── email.js         # Gestione email
│   └── ai.js            # AI e OpenRouter
├── services/            # Servizi business logic
│   ├── openrouter.js    # Servizio OpenRouter
│   ├── gmail.js         # Servizio Gmail
│   └── excel.js         # Servizio Excel
└── middleware/          # Middleware
    └── auth.js          # Autenticazione JWT
```

## 🔐 Autenticazione

Il backend usa JWT per l'autenticazione. Include i token Google OAuth nel JWT per accesso diretto alle API Google.

### Headers Richiesti
```
Authorization: Bearer <jwt_token>
```

## 📧 Gestione Email

### Generazione Email
```javascript
POST /api/email/generate
{
  "prompt": "Genera email per cliente",
  "context": "Contesto aggiuntivo",
  "emailType": "fattura"
}
```

### Invio Email
```javascript
POST /api/email/send
{
  "to": "cliente@email.com",
  "subject": "Oggetto email",
  "body": "Corpo email",
  "accessToken": "google_access_token"
}
```

## 🤖 AI Integration

### Chat
```javascript
POST /api/ai/chat
{
  "messages": [
    {"role": "user", "content": "Ciao"}
  ],
  "model": "anthropic/claude-3.5-sonnet",
  "context": "Contesto utente"
}
```

## 📊 Excel Processing

### Parse Excel per Email
```javascript
POST /api/email/parse-excel
Content-Type: multipart/form-data
file: <excel_file>
```

## 🛡️ Sicurezza

- CORS configurato per frontend specifico
- JWT per autenticazione
- Validazione input
- Error handling sicuro
- File upload limitato

## 🚀 Deployment

### Render.com (Raccomandato)

1. **Prepara il Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Deploy su Render.com**
   - Vai su [render.com](https://render.com)
   - Crea nuovo "Web Service"
   - Connetti il repository GitHub
   - Configurazione:
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Environment**: `Node`
     - **Node Version**: `18`

3. **Variabili d'Ambiente su Render**
   ```
   NODE_ENV=production
   OPENROUTER_API_KEY=your_openrouter_api_key
   OPENROUTER_REFERER=https://your-backend-url.onrender.com
   OPENROUTER_TITLE=NYRA Backend
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI=https://your-backend-url.onrender.com/api/auth/google/callback
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=24h
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   ```

4. **Deploy Automatico**
   - Render deployerà automaticamente ad ogni push
   - URL backend: `https://your-service-name.onrender.com`

5. **Configurazione Render.com Specifica**
   - **Auto-Deploy**: Abilita per deploy automatico
   - **Health Check**: `/health` endpoint
   - **Instance Type**: Starter (gratuito) o Professional
   - **Region**: Scegli la regione più vicina
   - **Environment Variables**: Configura tutte le variabili necessarie

6. **Monitoraggio Render.com**
   - Dashboard per monitorare performance
   - Logs in tempo reale
   - Metriche CPU e memoria
   - Alert per downtime

### Vercel (Alternativa)

1. **Installa Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Configurazione**
   - Aggiungi variabili d'ambiente su Vercel Dashboard
   - URL backend: `https://your-project.vercel.app`

### Docker (Locale/Server Proprio)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### PM2 (Server Proprio)
```bash
npm install -g pm2
pm2 start server.js --name nyra-backend
pm2 startup
pm2 save
```

## 📝 Logs

I log sono configurati per development/production:
- Development: Log dettagliati
- Production: Log essenziali solo

## 🔧 Sviluppo

### Script Disponibili
- `npm start` - Avvio produzione
- `npm run dev` - Avvio development con nodemon
- `npm test` - Test (da implementare)

### Hot Reload
Usa `npm run dev` per sviluppo con auto-reload su modifiche file.
