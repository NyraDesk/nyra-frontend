# OPENROUTER EMAIL PROMPT FIX COMPLETATO ✅

## PROBLEMA IDENTIFICATO
- **PRIMA**: OpenRouter aveva istruzioni solo per il calendario (`create-calendar-event`)
- **DOPO**: OpenRouter non aveva istruzioni per le email, quindi rispondeva in linguaggio naturale invece di generare JSON

## SITUAZIONE ATTUALE
- **Calendario**: ✅ OpenRouter genera JSON `{"action":"create-calendar-event"...}`
- **Email**: ❌ OpenRouter risponde "perfetto invia la mail" (SENZA JSON!)

## SOLUZIONE IMPLEMENTATA

### File Modificato: `src/services/openrouter.ts`

**LOCATION**: Linea ~430, nella funzione `getSystemPrompt()`

**AGGIUNTO**: Sezione "📧 REGOLE SPECIALI PER EMAIL" dopo le regole calendario

### ISTRUZIONI AGGIUNTE

```typescript
📧 REGOLE SPECIALI PER EMAIL
Quando l'utente chiede di inviare un'email, NON rispondere in linguaggio naturale.
Restituisci SOLO un JSON con questa struttura esatta:

{
  "action": "send-email",
  "to": "<destinatario@email.com>",
  "subject": "<oggetto dell'email>",
  "body": "<contenuto dell'email>"
}

Indicatori email: "invia email", "scrivi a", "manda mail", "email a", "invia mail", "scrivi email"
Regole email:
- Se manca il destinatario, chiedi con UNA domanda chiarificatrice in italiano.
- Se manca l'oggetto, usa un oggetto generico appropriato al contesto.
- Se manca il corpo, estrai il contenuto dalla richiesta dell'utente.
- NIENTE altro testo fuori dal JSON.
- Includi SEMPRE i campi to, subject e body.
- Usa SEMPRE la struttura JSON esatta sopra.

🚨 REGOLA GENERALE IMPORTANTE:
Per BOTH calendario E email, rispondi SOLO con JSON, nessun testo aggiuntivo.
Se mancano informazioni essenziali, chiedi con UNA domanda in italiano, poi restituisci il JSON completo.
```

## STRUTTURA COMPLETA DEL PROMPT

### 1. Regole Calendario (ESISTENTI)
```json
{
  "action": "create-calendar-event",
  "platform": "google",
  "summary": "<titolo sintetico>",
  "title": "<titolo alternativo>",
  "originalText": "<testo originale dell'utente>",
  "startISO": "<data/ora ISO 8601 UTC o locale normalizzata>",
  "endISO": "<data/ora ISO 8601 UTC o locale normalizzata>"
}
```

### 2. Regole Email (NUOVE)
```json
{
  "action": "send-email",
  "to": "<destinatario@email.com>",
  "subject": "<oggetto dell'email>",
  "body": "<contenuto dell'email>"
}
```

## INDICATORI EMAIL RICONOSCIUTI

- "invia email"
- "scrivi a"
- "manda mail"
- "email a"
- "invia mail"
- "scrivi email"

## COMPORTAMENTO ATTESO

### PRIMA (ERRATO)
```
Utente: "Invia email a marco@gmail.com"
AI: "Perfetto, invio la mail a marco@gmail.com"
```

### DOPO (CORRETTO)
```
Utente: "Invia email a marco@gmail.com"
AI: {"action":"send-email","to":"marco@gmail.com","subject":"Messaggio da NYRA","body":""}
```

## TEST IMMEDIATO

### Comando Test
```
"Invia email a test@test.com"
```

### Risultato Atteso
1. OpenRouter genera JSON con `action: "send-email"`
2. App.tsx intercetta il JSON
3. Mostra messaggio naturale di conferma
4. Invia payload a n8n

## VERIFICA COMPLETATA

- ✅ Compilazione senza errori
- ✅ Prompt OpenRouter aggiornato
- ✅ Istruzioni email aggiunte
- ✅ Formato JSON allineato
- ✅ Regole chiare e specifiche

## STATO: COMPLETATO ✅

OpenRouter ora ha istruzioni complete per generare JSON sia per calendario che per email, allineando il comportamento dell'AI con il codice dell'applicazione.
