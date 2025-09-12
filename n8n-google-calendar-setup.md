# Configurazione n8n per Google Calendar - NYRA

## Obiettivo
Configurare n8n per creare eventi Google Calendar con reminder automatici e restituire link all'evento.

## Workflow n8n

### 1. Nodo "Webhook" (Trigger)
- **HTTP Method**: POST
- **Path**: `/webhook/calendar-agent`
- **Response Mode**: Respond to Webhook

### 2. Nodo "Create an event" (Google Calendar)
- **Operation**: Create an event
- **Calendar**: `primary` (o ID esplicito del calendario)
- **Start Date Time**: `{{ $json.startISO }}`
- **End Date Time**: `{{ $json.endISO }}`
- **Summary**: `{{ $json.summary }}`
- **Use Default Reminders**: `OFF`
- **Reminders**: 
```json
{
  "useDefault": false,
  "overrides": [
    {
      "method": "popup",
      "minutes": 30
    }
  ]
}
```

### 3. Nodo "Webhook Response"
- **Response Code**: `200`
- **Headers**: 
  - `Content-Type`: `application/json`
- **Body**:
```json
{
  "ok": true,
  "eventLink": "{{ $node['Create an event'].json['htmlLink'] }}"
}
```

## Campi Richiesti dal Webhook

Il webhook si aspetta un payload JSON con:
```json
{
  "summary": "Titolo evento",
  "startISO": "2025-01-15T10:00:00+02:00",
  "endISO": "2025-01-15T11:00:00+02:00",
  "userId": "user123",
  "userName": "Nome Utente",
  "originalMessage": "Messaggio originale dell'utente"
}
```

## Test del Webhook

### Test con cURL
```bash
curl -X POST https://your-n8n-url.com/webhook/calendar-agent \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Riunione di prova",
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

## Configurazione NYRA

### Variabili d'Ambiente
Copia `env.example` in `.env` e configura:
```bash
N8N_URL=https://your-n8n-production-url.com
VITE_N8N_URL=https://your-n8n-production-url.com
```

### Verifica Integrazione
1. Avvia NYRA: `npm run electron-dev`
2. Invia messaggio: "Ricorda di chiamare Marco domani alle 15"
3. Verifica nei log che il payload sia corretto
4. Controlla che l'evento sia creato in Google Calendar
5. Verifica che il link all'evento sia restituito

## Troubleshooting

### Problemi Comuni
1. **Campi mancanti**: Verifica che startISO, endISO, summary siano presenti
2. **Formato data**: Le date devono essere in formato ISO 8601
3. **Autenticazione Google**: Verifica che n8n abbia accesso al calendario
4. **Reminder non funzionanti**: Controlla che Use Default Reminders sia OFF

### Log NYRA
I log mostrano:
- Payload ricevuto
- URL webhook utilizzato
- Risposta n8n
- Eventuali errori

## Note Tecniche

- I reminder sono impostati a 30 minuti prima dell'evento
- La durata default è 1 ora se non specificata
- Il sistema gestisce automaticamente le date (oggi/domani)
- Fallback automatico se n8n non è disponibile
