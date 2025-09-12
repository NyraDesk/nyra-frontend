# Test Sistema Time.ts - NYRA

## Obiettivo
Verificare che il nuovo sistema di gestione oraria funzioni correttamente e mostri sempre la data corrente.

## Test da Eseguire

### 1. Avvio App e Log Boot Time
- **Apri l'app** e controlla la console
- **Atteso**: `[BOOT TIME]` con:
  - `tz`: timezone corretto (es. "Europe/Rome")
  - `nowISO`: ISO corrente (es. "2025-08-13T...")
  - `todayHuman`: data formattata italiana (es. "mercoledì 13 agosto 2025")

### 2. Messaggio di Benvenuto Dinamico
- **Verifica**: Il messaggio di benvenuto deve dire:
  - "Ciao! Come posso aiutarti questa [mattina/pomeriggio/sera]?"
  - Deve variare in base all'ora corrente
- **Test orari**:
  - Mattina (6-11): "mattina"
  - Pomeriggio (12-17): "pomeriggio" 
  - Sera (18-23): "sera"
  - Notte (0-5): "notte"

### 3. Domanda "Che giorno è oggi?"
- **Scrivi**: "che giorno è oggi?"
- **Atteso**: Risposta con data di oggi (anno corrente, es. 2025)
- **Formato**: "Oggi è [giorno] [data] [mese] [anno]. Posso aiutarti a pianificare qualcosa?"

### 4. Domanda "Che ore sono?"
- **Scrivi**: "che ore sono?"
- **Atteso**: Risposta con ora corrente nel timezone locale
- **Formato**: "Sono le [HH:MM] ([timezone])."

### 5. Creazione Evento Calendario
- **Comando**: "segna in calendario per domani caffè con Luca alle 11"
- **Atteso**: Conferma evento con date formattate correttamente
- **Formato**: "✅ Evento creato: "Caffè con Luca" ([data] [ora] → [data] [ora])"
- **Verifica**: Le date devono essere dell'anno corrente (2025)

## Risultati Attesi

### ✅ Successo
- Nessuna data hardcoded "2024"
- Timezone corretto (Europe/Rome o fuso OS)
- Formattazione italiana delle date
- Saluto dinamico basato sull'ora
- Date eventi sempre correnti

### ❌ Problemi da Segnalare
- Date con anno 2024
- Timezone sbagliato
- Formattazione non italiana
- Saluto statico
- Errori di compilazione

## Note Tecniche
- Sistema usa `Intl.DateTimeFormat` con timezone locale
- Fallback a Europe/Rome se timezone OS non disponibile
- Tutte le date vengono da `new Date()` (sempre corrente)
- Formattazione unificata tramite `src/services/time.ts`
