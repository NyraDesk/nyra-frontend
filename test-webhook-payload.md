# Test Webhook Payload con user_id

## Obiettivo
Verificare che il payload del webhook per n8n includa sempre l'email dell'utente loggato come `user_id`.

## Modifiche Implementate

### 1. Aggiornamento Interfaccia ElectronAPI
- **File**: `src/types/electron.d.ts`
- **Modifica**: Aggiunto `user_id?: string` ai payload di `createReminder` e `n8nCreateReminder`

### 2. Aggiornamento Funzione createReminder
- **File**: `src/services/n8nIntegration.ts`
- **Modifica**: Aggiunta estrazione email utente da localStorage e inclusione nel payload

### 3. Aggiornamento Funzione createCalendarEvent
- **File**: `src/services/n8nIntegration.ts`
- **Modifica**: Aggiunta estrazione email utente da localStorage e inclusione nel payload

## Test da Eseguire

### Test 1: Verifica Payload con Utente Loggato
1. Effettua login con un utente che ha email
2. Crea un evento calendario
3. Verifica nei log che il payload includa `user_id: "email@example.com"`

### Test 2: Verifica Payload senza Utente
1. Logout o rimuovi localStorage
2. Prova a creare un evento calendario
3. Verifica che il payload includa `user_id: null`

### Test 3: Verifica Invio a n8n
1. Avvia n8n
2. Crea un evento calendario
3. Verifica che n8n riceva il payload con `user_id`

## Log Attesi

```
[NYRA][N8N] Sending payload with user_id: {
  title: "Evento Test",
  summary: "Evento Test", 
  startISO: "2024-01-01T10:00:00Z",
  endISO: "2024-01-01T11:00:00Z",
  user_id: "user@example.com"
}
[NYRA][N8N] ✅ user_id presente nel payload: user@example.com
```

## Note
- Il `user_id` viene estratto da `localStorage.getItem('nyra_user')`
- Se l'utente non è loggato, `user_id` sarà `null`
- Il payload viene inviato sia via Electron IPC che via fetch HTTP
- n8n riceverà sempre il campo `user_id` nel payload
