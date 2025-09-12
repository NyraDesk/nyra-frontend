# ✅ Campo action_type Aggiunto ai Webhook n8n

## 🎯 Obiettivo Raggiunto

Ho aggiunto il campo `action_type` **obbligatorio** a tutti i payload inviati ai webhook n8n per distinguere tra email e calendario.

## 📝 Modifiche Apportate

### 1. Email Payload (`src/App.tsx`)

#### ✅ Problema Risolto
- **Prima**: Mancava il campo `action_type` per distinguere il tipo di azione
- **Dopo**: Aggiunto `action_type: "email"` obbligatorio

#### 🔧 Modifiche Implementate
```typescript
// PRIMA (mancava action_type)
const emailData = {
  "to": Array.isArray(emailAction.to) ? emailAction.to[0] : emailAction.to,
  "subject": emailAction.subject || 'Messaggio da NYRA',
  "body": emailBody,
  "user_id": currentUser?.email || 'anonymous'
};

// DOPO (con action_type obbligatorio)
const emailData = {
  "action_type": "email",  // QUESTO CAMPO È OBBLIGATORIO
  "to": Array.isArray(emailAction.to) ? emailAction.to[0] : emailAction.to,
  "subject": emailAction.subject || 'Messaggio da NYRA',
  "body": emailBody,
  "user_id": currentUser?.email || 'anonymous'
};
```

### 2. Calendar Payload (`src/services/n8nIntegration.ts`)

#### ✅ Problema Risolto
- **Prima**: Mancava il campo `action_type` per distinguere il tipo di azione
- **Dopo**: Aggiunto `action_type: "calendar"` obbligatorio

#### 🔧 Modifiche Implementate
```typescript
// PRIMA (mancava action_type)
const payload = {
  title: finalTitle,        // Sempre presente
  summary: finalTitle,      // Ridondanza voluta per n8n
  description: "Evento creato da NYRA", // Descrizione opzionale
  startISO: action.startISO,
  endISO: action.endISO,
  user_id: userEmail        // Aggiunto: email dell'utente loggato
};

// DOPO (con action_type obbligatorio)
const payload = {
  action_type: "calendar",  // QUESTO CAMPO È OBBLIGATORIO
  title: finalTitle,        // Sempre presente
  summary: finalTitle,      // Ridondanza voluta per n8n
  description: "Evento creato da NYRA", // Descrizione opzionale
  startISO: action.startISO,
  endISO: action.endISO,
  user_id: userEmail        // Aggiunto: email dell'utente loggato
};
```

### 3. n8nOAuthConnector Functions (`src/services/n8nOAuthConnector.ts`)

#### ✅ Problema Risolto
- **Prima**: Le funzioni OAuth non avevano `action_type`
- **Dopo**: Aggiunto `action_type` a tutte le funzioni

#### 🔧 Modifiche Implementate

##### sendEmail Function
```typescript
// PRIMA
const payload: N8NPayload = {
  user_id: userId,
  action: 'send_email',
  data: emailData
};

// DOPO
const payload: N8NPayload = {
  action_type: "email",  // QUESTO CAMPO È OBBLIGATORIO
  user_id: userId,
  action: 'send_email',
  data: emailData
};
```

##### createCalendarEvent Function
```typescript
// PRIMA
const payload: N8NPayload = {
  user_id: userId,
  action: 'create_event',
  data: eventData
};

// DOPO
const payload: N8NPayload = {
  action_type: "calendar",  // QUESTO CAMPO È OBBLIGATORIO
  user_id: userId,
  action: 'create_event',
  data: eventData
};
```

## 🔍 Strutture JSON Finali

### ✅ Email Payload
```json
{
  "action_type": "email",
  "to": "marco@gmail.com",
  "subject": "Riunione progetto",
  "body": "Ciao, confermo la riunione per domani alle 15:00.",
  "user_id": "user@nyra.com"
}
```

### ✅ Calendar Payload
```json
{
  "action_type": "calendar",
  "title": "Mare",
  "summary": "Mare",
  "description": "Evento creato da NYRA",
  "startISO": "2024-01-15T14:00:00.000Z",
  "endISO": "2024-01-15T15:00:00.000Z",
  "user_id": "user@nyra.com"
}
```

## 🎯 Vantaggi Ottenuti

### ✅ Distinzione Azioni
- **n8n**: Può distinguere tra email e calendario
- **Routing**: Webhook corretti per ogni tipo di azione
- **Processing**: Logica specifica per email vs calendario

### ✅ Compatibilità
- **Email**: `action_type: "email"` → webhook email
- **Calendar**: `action_type: "calendar"` → webhook calendario
- **n8n**: Routing automatico basato su action_type

### ✅ Debugging
- **Logging**: Campo action_type visibile nei log
- **Troubleshooting**: Facile identificare tipo di azione
- **Monitoring**: Tracciamento azioni per tipo

## 🚀 Test Raccomandati

### 1. Test Email
```bash
# Verifica i log nella console
Sending to n8n webhook: {
  "action_type": "email",
  "to": "test@example.com",
  "subject": "Test",
  "body": "Test body",
  "user_id": "user@nyra.com"
}
```

### 2. Test Calendar
```bash
# Verifica i log nella console
[NYRA][N8N] Sending payload with user_id: {
  "action_type": "calendar",
  "title": "Mare",
  "summary": "Mare",
  "description": "Evento creato da NYRA",
  "startISO": "2024-01-15T14:00:00.000Z",
  "endISO": "2024-01-15T15:00:00.000Z",
  "user_id": "user@nyra.com"
}
```

### 3. Test n8n Routing
```bash
# n8n dovrebbe ricevere e processare correttamente:
# - action_type: "email" → webhook email
# - action_type: "calendar" → webhook calendario
```

## 🎉 Conclusione

**Il campo action_type è stato aggiunto con successo a tutti i webhook n8n!**

- ✅ **Email**: `action_type: "email"` obbligatorio
- ✅ **Calendar**: `action_type: "calendar"` obbligatorio
- ✅ **n8nOAuthConnector**: Tutte le funzioni aggiornate
- ✅ **Routing**: n8n può distinguere tra azioni
- ✅ **Compilazione**: Build senza errori

**n8n ora può distinguere correttamente tra email e calendario!** 🚀
