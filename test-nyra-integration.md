# Test NYRA Integration

## Test 1: Sistema n8n Integration
- [ ] Verifica che il file `src/services/n8nIntegration.ts` esista
- [ ] Verifica che la funzione `createReminder` sia esportata correttamente
- [ ] Testa la chiamata POST a `http://localhost:5678/webhook/calendar-agent`

## Test 2: Sistema OpenRouter
- [ ] Verifica che il file `src/services/openrouter.ts` abbia il metodo `sendMessage`
- [ ] Verifica che il system prompt sia configurato correttamente
- [ ] Testa la chiamata API a OpenRouter

## Test 3: Integrazione in App.tsx
- [ ] Verifica che `detectReminderKeywords` riconosca: "ricorda", "reminder", "meeting"
- [ ] Verifica che i messaggi di conferma vengano mostrati correttamente
- [ ] Verifica che OpenRouter venga chiamato per le risposte

## Test 4: UI Components
- [ ] Verifica che `SystemNotice.tsx` sia presente e funzionante
- [ ] Verifica che i messaggi di successo e warning abbiano stili diversi

## Test 5: Fix UI Glitch
- [ ] Verifica che `adjustTextareaHeight` abbia debounce di 100ms
- [ ] Verifica che non ci siano chiamate a `scrollToBottom` durante la digitazione

## Comandi per testare:

1. **Test reminder**: Scrivi "ricorda di chiamare il cliente domani"
2. **Test chat normale**: Scrivi "ciao, come stai?"
3. **Test UI**: Digita lentamente nel textarea per verificare che non "salti"

## Risultati attesi:
- ✅ Reminder creato nel tuo calendario! (messaggio verde)
- ✅ Risposta naturale da OpenRouter
- ✅ Nessun "salto" durante la digitazione
