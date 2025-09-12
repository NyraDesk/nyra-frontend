# Test Manuale - Fix "New Chat" + Dynamic Greeting

## Prerequisiti
- App NYRA in esecuzione (`npm run electron-dev`)
- Browser aperto su http://localhost:5173

## Test Case 1: Creazione Nuova Chat
**Obiettivo**: Verificare che il pulsante "Nuova chat" crei correttamente una nuova conversazione

### Passi:
1. Apri l'app NYRA
2. Verifica che sia presente una chat attiva iniziale
3. Clicca sul pulsante "Nuova chat" nella sidebar
4. **Risultato atteso**:
   - Viene creata una nuova chat con ID univoco
   - La nuova chat diventa attiva
   - La chat precedente viene deattivata
   - L'input viene focalizzato automaticamente
   - La chat scorre automaticamente in fondo

### Verifica:
- [ ] Nuova chat creata con ID univoco
- [ ] Chat precedente deattivata
- [ ] Input focalizzato
- [ ] Scroll automatico in fondo
- [ ] Log analytics visibile in console: `📊 [ANALYTICS] new_chat_created`

## Test Case 2: Saluto Dinamico - Mattina
**Obiettivo**: Verificare il saluto "Buongiorno" per ore mattutine

### Passi:
1. Cambia l'ora del sistema a un orario mattutino (es. 10:00)
2. Clicca "Nuova chat" o ricarica l'app
3. **Risultato atteso**: Saluto "Buongiorno, in cosa posso aiutarti oggi?"

### Verifica:
- [ ] Saluto corretto per ora mattutina
- [ ] Testo esatto: "Buongiorno, in cosa posso aiutarti oggi?"

## Test Case 3: Saluto Dinamico - Pomeriggio
**Obiettivo**: Verificare il saluto "Buon pomeriggio" per ore pomeridiane

### Passi:
1. Cambia l'ora del sistema a un orario pomeridiano (es. 15:00)
2. Clicca "Nuova chat" o ricarica l'app
3. **Risultato atteso**: Saluto "Buon pomeriggio, in cosa posso aiutarti oggi?"

### Verifica:
- [ ] Saluto corretto per ora pomeridiana
- [ ] Testo esatto: "Buon pomeriggio, in cosa posso aiutarti oggi?"

## Test Case 4: Saluto Dinamico - Sera/Notte
**Obiettivo**: Verificare il saluto "Buonasera" per ore serali e notturne

### Passi:
1. Cambia l'ora del sistema a un orario serale (es. 21:00)
2. Clicca "Nuova chat" o ricarica l'app
3. **Risultato atteso**: Saluto "Buonasera, in cosa posso aiutarti oggi?"

### Verifica:
- [ ] Saluto corretto per ora serale/notte
- [ ] Testo esatto: "Buonasera, in cosa posso aiutarti oggi?"

## Test Case 5: Gestione Messaggi
**Obiettivo**: Verificare che il saluto scompaia dopo il primo messaggio

### Passi:
1. Crea una nuova chat (verifica saluto presente)
2. Digita e invia un messaggio (es. "ciao")
3. **Risultato atteso**: Il saluto scompare, appare il messaggio utente

### Verifica:
- [ ] Saluto visibile in chat vuota
- [ ] Saluto scompare dopo primo messaggio
- [ ] Messaggio utente visibile

## Test Case 6: Persistenza Chat
**Obiettivo**: Verificare che le chat persistano tra i riavvii

### Passi:
1. Crea 2-3 chat diverse
2. Riavvia l'app
3. **Risultato atteso**: Le chat precedenti sono ancora presenti

### Verifica:
- [ ] Chat precedenti visibili dopo riavvio
- [ ] Possibilità di creare nuove chat
- [ ] Funzionalità "Nuova chat" funziona correttamente

## Test Case 7: Focus e UX
**Obiettivo**: Verificare l'esperienza utente ottimizzata

### Passi:
1. Clicca "Nuova chat"
2. Verifica focus e scroll
3. **Risultato atteso**: Input focalizzato, scroll in fondo, quick actions visibili

### Verifica:
- [ ] Input automaticamente focalizzato
- [ ] Scroll automatico in fondo
- [ ] Quick actions rimangono visibili
- [ ] Nessun errore in console

## Criteri di Accettazione

### ✅ Funzionalità "Nuova Chat"
- [ ] Crea chat con ID univoco
- [ ] Deattiva chat precedenti
- [ ] Focalizza input automaticamente
- [ ] Scroll automatico in fondo
- [ ] Log analytics funzionante

### ✅ Saluto Dinamico
- [ ] "Buongiorno" (05:00-11:59)
- [ ] "Buon pomeriggio" (12:00-17:59)
- [ ] "Buonasera" (18:00-04:59)
- [ ] Testi esatti come specificato
- [ ] Timezone locale utilizzato

### ✅ Gestione Stato
- [ ] Saluto visibile solo in chat vuote
- [ ] Saluto scompare dopo primo messaggio
- [ ] Saluto riappare in nuove chat
- [ ] Nessuna persistenza saluto come messaggio

### ✅ UX e Performance
- [ ] Nessun errore console
- [ ] Focus automatico funzionante
- [ ] Scroll fluido
- [ ] Persistenza chat funzionante

## Note per il Tester
- Usa orari diversi per testare i saluti dinamici
- Verifica che non ci siano errori in console
- Controlla che il focus dell'input funzioni correttamente
- Verifica la persistenza delle chat tra i riavvii
