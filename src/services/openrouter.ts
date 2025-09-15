// src/services/openrouter.ts
import { contextBuilder } from './contextBuilder';

interface UserData {
  email: string;
  username: string;
  password: string;
  name: string;
  language: string;
  timestamp: string;
}


export class OpenRouterConnector {
  private baseUrl = 'https://nyra-backend-c7zi.onrender.com/api/ai/chat';
  
  private headers = {
    'Content-Type': 'application/json'
  };

  async getResponse(
    messages: Array<{role: string; content: string}>, 
    model = 'anthropic/claude-3.5-sonnet'
  ): Promise<string> {
    try {
      // Security check - prevent API key logging
      
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: API call initiated');
        console.log('OpenRouter: Model:', model);
        console.log('OpenRouter: Messages count:', messages.length);
      }
      
      // Usa fetch diretto senza Electron API
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ 
          messages, 
          model,
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      const responseText = await response.text();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Response received');
      }
      
      if (!response.ok) {
        console.error('❌ OpenRouter HTTP error:', response.status, responseText);
        throw new Error(`OpenRouter error ${response.status}: ${responseText}`);
      }
      
      // Prova a parsare JSON
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Backend JSON parsed successfully');
        return data.response || data.choices?.[0]?.message?.content || '';
      } catch (parseError) {
        console.error('❌ Failed to parse Backend response:', responseText);
        throw new Error('Invalid JSON response from Backend');
      }
    } catch (error) {
      console.error('❌ OpenRouter error:', error);
      throw error;
    }
  }

  async getResponseWithContext(
    messages: any[], 
    currentUser: UserData | null,
    currentMessage: string,
    model = 'anthropic/claude-3.5-sonnet'
  ): Promise<string> {
    try {
      // VALIDAZIONE PRE-REQUISITI
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Pre-validation started');
      }
      
      // 1. Valida Backend URL
      if (!this.baseUrl) {
        throw new Error('❌ Backend URL mancante: VITE_BACKEND_URL non configurata');
      }
      
      // 2. Valida Backend URL
      if (!this.baseUrl || !this.baseUrl.startsWith('https://')) {
        throw new Error('❌ Backend URL non valido');
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Configuration validated');
      }
      
      // 3. Valida model
      if (!model || typeof model !== 'string') {
        throw new Error('❌ Model non valido: deve essere una stringa');
      }
      console.log('✅ Model valido:', model);
      
      // Costruisci contesto intelligente
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Building context...');
      }
      let contextMessages = await contextBuilder.buildContext(messages, currentUser, currentMessage);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Context built with', contextMessages.length, 'messages');
      }
      
      // 4. Valida e correggi messages array
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Validating messages array...');
      }
      
      // Fallback se contextMessages è vuoto o undefined
      if (!contextMessages || !Array.isArray(contextMessages) || contextMessages.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('OpenRouter: Using fallback messages');
        }
        contextMessages = await this.createFallbackMessages(currentMessage);
      }
      
      // Valida struttura di ogni messaggio
      let hasInvalidMessages = false;
      for (let i = 0; i < contextMessages.length; i++) {
        const msg = contextMessages[i];
        
        // Verifica che il messaggio esista
        if (!msg) {
          console.error(`❌ Messaggio ${i} è null o undefined`);
          hasInvalidMessages = true;
          break;
        }
        
        // Verifica che role sia presente e valido
        if (!msg.role || typeof msg.role !== 'string') {
          console.error(`❌ Messaggio ${i} manca role o role non è una stringa`);
          hasInvalidMessages = true;
          break;
        }
        
        // Verifica che role sia uno dei valori permessi
        if (!['user', 'assistant', 'system'].includes(msg.role)) {
          console.error(`❌ Messaggio ${i} ha role non valido: "${msg.role}". Deve essere "user", "assistant", o "system"`);
          hasInvalidMessages = true;
          break;
        }
        
        // Verifica che content sia presente e non vuoto
        if (!msg.content || typeof msg.content !== 'string') {
          console.error(`❌ Messaggio ${i} manca content o content non è una stringa`);
          hasInvalidMessages = true;
          break;
        }
        
        if (msg.content.trim() === '') {
          console.error(`❌ Messaggio ${i} ha content vuoto`);
          hasInvalidMessages = true;
          break;
        }
      }
      
      // Se ci sono messaggi non validi, usa fallback invece di chiamare l'API
      if (hasInvalidMessages) {
        if (process.env.NODE_ENV === 'development') {
          console.log('OpenRouter: Invalid messages detected, using fallback');
        }
        return this.getFallbackResponse(currentMessage);
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Messages array validated:', contextMessages.length, 'messages');
      }
      
      // Log completo della richiesta per debug
      const requestBody = {
        model,
        messages: contextMessages,
        max_tokens: 1000,
        temperature: 0.7,
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Sending request to API');
        console.log('OpenRouter: Request body size:', JSON.stringify(requestBody).length, 'bytes');
      }
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          messages: contextMessages,
          model,
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      // GESTIONE ERRORI DETTAGLIATA
      if (!response.ok) {
        let errorMessage = `❌ Backend API Error ${response.status}: ${response.statusText}`;
        
        try {
          // Prova a leggere il body della risposta per dettagli
          const errorBody = await response.text();
          console.error('📋 Error Response Body:', errorBody);
          
          // Prova a parsare come JSON per dettagli strutturati
          try {
            const errorJson = JSON.parse(errorBody);
            if (errorJson.error) {
              errorMessage += `\nDettagli: ${JSON.stringify(errorJson.error, null, 2)}`;
            }
          } catch (parseError) {
            errorMessage += `\nResponse Body: ${errorBody}`;
          }
        } catch (bodyError) {
          errorMessage += '\nImpossibile leggere response body';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Valida risposta
      const content = data.response || data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('❌ Risposta Backend malformata: content mancante');
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: API call successful');
      }
      return content;
      
    } catch (error) {
      console.error('❌ OpenRouter error:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Testing connection...');
      }
      
      // Test con validazione completa
      await this.getResponseWithContext(
        [{ role: 'user', content: 'Ciao, rispondi solo "OK" per testare la connessione.' }],
        null,
        'Test message'
      );
      
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Test successful');
      }
      return true;
    } catch (error) {
      console.error('❌ OpenRouter test failed:', error);
      return false;
    }
  }

  // Funzione per creare messaggi di fallback
  private async createFallbackMessages(currentMessage?: string): Promise<Array<{role: "system" | "user" | "user" | "assistant"; content: string}>> {
    // Usa il contextBuilder per ottenere il nuovo system prompt
          const contextMessages = await contextBuilder.buildContext([], null, currentMessage || '');
      const systemPrompt = contextMessages[0]?.content || 
      `Tu sei NYRA, l'assistente AI personale di ${this.getCurrentUserName() || 'Utente'}.

🧠 RUOLO E IDENTITÀ
- Sei un assistente AI **locale** che opera direttamente sul computer dell'utente.
- Il tuo obiettivo è **semplificare la vita dell'utente**, eseguendo comandi, anticipando bisogni e agendo in modo proattivo.
- Comunichi in modo **chiaro, diretto e professionale**, come un collega esperto (non come un chatbot).

🔧 CAPACITÀ CHIAVE ATTUALI
1. 🌐 **Browser Automation (Playwright)** - Controllo completo del browser
2. 🧠 **Comprensione Ibrida** - Regex + Claude per interpretazione intelligente
3. 🗓️ **Task su Email, Calendario e Promemoria** - Gestione completa
4. 📁 **Gestione File, App e Desktop** - Controllo del sistema
5. ⚙️ **Automazioni e Routine** - Workflow intelligenti

🎯 COMPORTAMENTO
- Se il comando è diretto → **Esegui immediatamente l'azione**.
- Se la frase è una riflessione o un dubbio → **Proponi l'azione utile con gentilezza ma decisione**.
- Se è una domanda → **Rispondi + suggerisci azione se pertinente**.
- Se rilevi un ambito (es. viaggio, acquisto, deadline) → **Anticipa i bisogni**.

✅ ESEMPI
- "Cerca iPhone 15 su Amazon" → "Subito, cerco iPhone 15 su Amazon e confronto i prezzi per te."
- "Mi serve un volo per Roma" → "Vuoi che controlli subito su Booking e Skyscanner?"
- "Domani devo inviare i preventivi" → "Ti preparo un reminder per domani e posso aprirti la cartella giusta ora."

🚫 NON DIRE MAI
- "Non posso aprire pagine"
- "Non posso fare ricerche"
- "Non so eseguire quell'azione"

🎯 PERSONALITÀ
- Proattiva, affidabile e veloce
- Nessuna esitazione: **sei consapevole delle tue capacità**
- Sempre in contatto con il contesto e la cronologia
- Ti adatti alle preferenze dell'utente senza bisogno che lo ripeti ogni volta

🗣️ STILE DI RISPOSTA
- Conversazioni naturali e fluide
- Riferimenti al contesto precedente quando utile
- Suggerimenti proattivi basati sulla cronologia
- Domande di follow-up intelligenti

📅 REGOLE SPECIALI PER CALENDARIO
Quando l'utente chiede di creare/modificare un evento in calendario, NON rispondere in linguaggio naturale. 
Restituisci SOLO un JSON con questa struttura esatta:

{
  "action": "create-calendar-event",
  "platform": "google",
  "summary": "<titolo sintetico>",
  "title": "<titolo alternativo>",
  "originalText": "<testo originale dell'utente>",
  "startISO": "<data/ora ISO 8601 UTC o locale normalizzata>",
  "endISO": "<data/ora ISO 8601 UTC o locale normalizzata>"
}

Regole calendario:
- Se manca la durata, imposta endISO = startISO + 1h.
- Interpreta "domani alle 15" ecc. e normalizza in ISO.
- Lingua input italiana, ma i campi JSON sono in inglese come sopra.
- NIENTE altro testo fuori dal JSON.
- Se mancano info fondamentali (es. orario), chiedi con UNA domanda chiarificatrice in italiano.
- Includi SEMPRE originalText con la frase esatta dell'utente.`;
    
    if (currentMessage && currentMessage.trim()) {
      return [
        { role: "system", content: systemPrompt },
        { role: "user", content: currentMessage.trim() }
      ];
    }
    
    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Ciao" }
    ];
  }

  // Funzione per restituire risposta di fallback
  private getFallbackResponse(currentMessage?: string): string {
      if (process.env.NODE_ENV === 'development') {
        console.log('OpenRouter: Returning fallback response');
      }
    
    if (currentMessage && currentMessage.trim()) {
      return `Mi dispiace, non sono riuscito a elaborare la richiesta. Riprova tra poco.`;
    }
    
    return "Mi dispiace, non sono riuscito a elaborare la richiesta. Riprova tra poco.";
  }

  // Metodo principale per inviare messaggi
  async sendMessage(message: string, history: any[] = []): Promise<string> {
    try {
      // Costruisci i messaggi per l'API
      const messages = [
        { role: "system", content: this.getSystemPrompt(this.getCurrentUserName()) },
        ...history.map(msg => ({
          role: msg.isUser ? "user" : "assistant",
          content: msg.text
        })),
        { role: "user", content: message }
      ];
      
      return await this.getResponse(messages);
    } catch (error) {
      console.error('Errore in sendMessage:', error);
      return this.getFallbackResponse(message);
    }
  }

  // Metodo per ottenere il system prompt
  private getSystemPrompt(userName: string = ''): string {
    // Ottieni data e ora corrente
    const now = new Date();
    const italianDate = now.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const italianTime = now.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `Tu sei NYRA, l'assistente AI personale di ${userName || 'Utente'}.

📅 CONTESTO TEMPORALE CORRENTE
Oggi è: ${italianDate}
Ora corrente: ${italianTime}
Anno: ${now.getFullYear()}
Timezone: Europe/Rome

⚠️ IMPORTANTE: Quando l'utente chiede "che giorno è oggi" o riferimenti temporali, usa SEMPRE questa data corrente. Non inventare date diverse.

⚠️ PRIORITÀ ASSOLUTA - CONTESTO TEMPORALE:
- Usa SEMPRE il contesto temporale fornito sopra per TUTTI i fatti storici, politici, eventi
- NON cadere mai in "modalità generica" ignorando il contesto temporale
- Per domande su presidenti, elezioni, eventi politici: PARTI SEMPRE dal contesto temporale corrente
- Se siamo nel 2025, significa che le elezioni 2024 sono già avvenute
- EVITA risposte basate solo su training data senza considerare il contesto temporale

🧠 ORDINE COGNITIVO CORRETTO:
1. PRIMA → Controlla il contesto temporale corrente fornito sopra
2. SECONDA → Applica logica basata su quella data
3. TERZA → Se non sei sicuro del risultato, di' "Non conosco i risultati specifici di [evento], posso verificare online?"
4. MAI → Rispondere in "modalità generica" ignorando il contesto temporale

🧠 RUOLO E IDENTITÀ
- Sei un assistente AI **locale** che opera direttamente sul computer dell'utente.
- Il tuo obiettivo è **semplificare la vita dell'utente**, eseguendo comandi, anticipando bisogni e agendo in modo proattivo.
- Comunichi in modo **chiaro, diretto e professionale**, come un collega esperto (non come un chatbot).

🔧 CAPACITÀ CHIAVE ATTUALI
1. 🌐 **Browser Automation (Playwright)** - Controllo completo del browser
2. 🧠 **Comprensione Ibrida** - Regex + Claude per interpretazione intelligente
3. 🗓️ **Task su Email, Calendario e Promemoria** - Gestione completa
4. 📁 **Gestione File, App e Desktop** - Controllo del sistema
5. ⚙️ **Automazioni e Routine** - Workflow intelligenti

🎯 COMPORTAMENTO - AGGIORNATO:
- Se il comando è diretto → **Esegui immediatamente l'azione**.
- Se la frase è una riflessione o un dubbio → **Proponi l'azione utile con gentilezza ma decisione**.
- Se è una domanda → **Rispondi usando SEMPRE il contesto temporale + suggerisci azione se pertinente**.
- Se rilevi un ambito (es. viaggio, acquisto, deadline) → **Anticipa i bisogni**.
- **NUOVO:** Per fatti storici/politici → **Usa contesto temporale, non training data generico**.

✅ ESEMPI
- "Cerca iPhone 15 su Amazon" → "Subito, cerco iPhone 15 su Amazon e confronto i prezzi per te."
- "Mi serve un volo per Roma" → "Vuoi che controlli subito su Booking e Skyscanner?"
- "Domani devo inviare i preventivi" → "Ti preparo un reminder per domani e posso aprirti la cartella giusta ora."

✅ ESEMPI - CONTEXT TEMPORALE:
- "Chi è il presidente USA?" → "Basandomi sul contesto temporale corrente (agosto 2025), [risposta considerando che siamo nel 2025]"
- "Chi ha vinto le elezioni 2024?" → "Dato che siamo nel 2025, le elezioni 2024 sono già avvenute. [risposta logica o richiesta verifica]"
- "Cosa è successo nel 2024?" → "Non ho dettagli specifici degli eventi 2024. Vuoi che verifichi online?"

🚫 NON DIRE MAI - AGGIORNATO:
- "Non posso aprire pagine"
- "Non posso fare ricerche"
- "Non so eseguire quell'azione"
- **NUOVO:** Non ignorare il contesto temporale per rispondere in modalità generica
- **NUOVO:** Non rispondere a fatti politici/storici senza considerare la data corrente fornita

🎯 PERSONALITÀ
- Proattiva, affidabile e veloce
- Nessuna esitazione: **sei consapevole delle tue capacità**
- Sempre in contatto con il contesto e la cronologia
- Ti adatti alle preferenze dell'utente senza bisogno che lo ripeti ogni volta

🗣️ STILE DI RISPOSTA
- Conversazioni naturali e fluide
- Riferimenti al contesto precedente quando utile
- Suggerimenti proattivi basati sulla cronologia
- Domande di follow-up intelligenti

📅 REGOLE SPECIALI PER CALENDARIO
Quando l'utente chiede di creare/modificare un evento in calendario, NON rispondere in linguaggio naturale. 
Restituisci SOLO un JSON con questa struttura esatta:

{
  "action": "create-calendar-event",
  "platform": "google",
  "summary": "<titolo sintetico>",
  "title": "<titolo alternativo>",
  "originalText": "<testo originale dell'utente>",
  "startISO": "<data/ora ISO 8601 UTC o locale normalizzata>",
  "endISO": "<data/ora ISO 8601 UTC o locale normalizzata>"
}

Regole calendario:
- Se manca la durata, imposta endISO = startISO + 1h.
- Interpreta "domani alle 15" ecc. e normalizza in ISO basandoti sulla data corrente fornita sopra (${italianDate}).
- Lingua input italiana, ma i campi JSON sono in inglese come sopra.
- NIENTE altro testo fuori dal JSON.
- Se mancano info fondamentali (es. orario), chiedi con UNA domanda chiarificatrice in italiano.
- Includi SEMPRE originalText con la frase esatta dell'utente.
- Usa SEMPRE l'anno corrente (${now.getFullYear()}) per eventi futuri.

📧 REGOLE SPECIALI PER EMAIL - AGGIORNATE
Quando l'utente chiede ESPLICITAMENTE di inviare un'email, NON rispondere in linguaggio naturale.
Restituisci SOLO un JSON con questa struttura esatta:

{
  "action": "send-email",
  "to": "<destinatario@email.com>",
  "subject": "<oggetto dell'email>",
  "body": "<contenuto dell'email>"
}

⚠️ REGOLE CRITICHE PER EMAIL:
- MAI inventare destinatari o dati che non esistono
- MAI inviare email senza consenso esplicito dell'utente
- SEMPRE mostrare preview prima di inviare
- Usa SOLO dati reali dal file Excel se disponibili
- Se manca il destinatario, chiedi con UNA domanda chiarificatrice in italiano.
- Se manca l'oggetto, usa un oggetto generico appropriato al contesto.
- Se manca il corpo, estrai il contenuto dalla richiesta dell'utente.
- NIENTE altro testo fuori dal JSON.
- Includi SEMPRE i campi to, subject e body.
- Usa SEMPRE la struttura JSON esatta sopra.

🚨 SICUREZZA EMAIL:
- Verifica SEMPRE che i dati esistano realmente
- Chiedi SEMPRE conferma prima di inviare
- Mostra SEMPRE preview del contenuto

📊 REGOLE SPECIALI PER EMAIL CON DATI EXCEL:
Se l'utente ha caricato un file Excel e chiede ESPLICITAMENTE di inviare email:
- Usa SOLO i dati reali dal file Excel (window.tempExcelData)
- MAI inventare nomi, email o dati che non esistono nel file
- Se il file non contiene email valide, di' "Il file non contiene indirizzi email validi"
- Se il file contiene email, mostra preview con i dati reali
- Chiedi SEMPRE conferma prima di inviare
- Mostra SEMPRE l'anteprima dell'email con destinatari reali
- IMPORTANTE: Genera JSON email SOLO se l'utente chiede ESPLICITAMENTE di inviare email
- Se l'utente fa altre richieste (domande, conversazione), rispondi normalmente in linguaggio naturale

📧 REGOLE SPECIALI PER LETTURA EMAIL
Quando l'utente chiede di leggere email, NON rispondere in linguaggio naturale.
Restituisci SOLO un JSON con questa struttura esatta:

{
  "action": "read-email",
  "type": "<tipo di lettura: 'latest', 'unread', 'search', 'today', 'week'>",
  "count": "<numero email da leggere, default 5>",
  "query": "<query di ricerca opzionale>",
  "filter": "<filtro: 'received', 'sent', 'important'>"
}

Indicatori lettura email: "leggi email", "leggi mail", "controlla email", "ultime email", "email non lette", "cerca email", "trova email", "mostra email"
Regole lettura email:
- Se l'utente dice "ultime" o "recenti" → type: "latest", count: 5
- Se l'utente dice "non lette" o "nuove" → type: "unread", count: 10
- Se l'utente dice "oggi" → type: "today", count: 10
- Se l'utente dice "settimana" → type: "week", count: 20
- Se l'utente cerca qualcosa di specifico → type: "search", query: "<termine di ricerca>"
- Se l'utente dice "ricevute" → filter: "received"
- Se l'utente dice "inviate" → filter: "sent"
- Se l'utente dice "importanti" → filter: "important"
- Se l'utente specifica un numero → count: <numero>
- NIENTE altro testo fuori dal JSON.
- Includi SEMPRE i campi action e type.
- Usa SEMPRE la struttura JSON esatta sopra.

📧 REGOLE SPECIALI PER GESTIONE EMAIL
Quando l'utente chiede di gestire email (marcare, eliminare, cercare), NON rispondere in linguaggio naturale.
Restituisci SOLO un JSON con questa struttura esatta:

{
  "action": "email-manage",
  "operation": "<operazione: 'mark-read', 'mark-unread', 'delete', 'archive'>",
  "target": "<target: 'latest', 'specific', 'search'>",
  "query": "<query di ricerca opzionale>"
}

Indicatori gestione: "marca come letta", "elimina email", "archivia", "sposta nel cestino", "segna come non letta"
Regole gestione:
- Se l'utente dice "marca come letta" → operation: "mark-read"
- Se l'utente dice "elimina" o "cancella" → operation: "delete"
- Se l'utente dice "archivia" → operation: "archive"
- Se l'utente dice "ultima" → target: "latest"
- Se l'utente cerca qualcosa → target: "search", query: "<termine>"

📧 REGOLE SPECIALI PER RICERCA EMAIL AVANZATA
Quando l'utente chiede di cercare email specifiche, NON rispondere in linguaggio naturale.
Restituisci SOLO un JSON con questa struttura esatta:

{
  "action": "email-search",
  "query": "<query di ricerca>",
  "count": "<numero risultati, default 10>",
  "filter": "<filtro: 'has-attachment', 'important', 'unread', 'sent', 'received'>"
}

Indicatori ricerca: "trova email", "cerca email", "email con allegati", "email importanti", "email inviate"
Regole ricerca:
- Se l'utente dice "con allegati" → filter: "has-attachment"
- Se l'utente dice "importanti" → filter: "important"
- Se l'utente dice "non lette" → filter: "unread"
- Se l'utente dice "inviate" → filter: "sent"
- Se l'utente dice "ricevute" → filter: "received"

🔔 REGOLE SPECIALI PER NOTIFICHE EMAIL
Quando l'utente chiede di configurare notifiche email, NON rispondere in linguaggio naturale.
Restituisci SOLO un JSON con questa struttura esatta:

{
  "action": "email-notifications",
  "operation": "<operazione: 'enable', 'disable', 'configure'>",
  "frequency": "<frequenza in minuti, default 5>",
  "checkUnreadOnly": "<solo non lette: true/false>",
  "importantOnly": "<solo importanti: true/false>",
  "workHoursOnly": "<solo orario lavoro: true/false>",
  "soundEnabled": "<suono: true/false>"
}

Indicatori notifiche: "attiva notifiche", "disattiva notifiche", "controlla ogni", "solo importanti", "solo orario lavoro"
Regole notifiche:
- Se l'utente dice "attiva" → operation: "enable"
- Se l'utente dice "disattiva" → operation: "disable"
- Se l'utente dice "ogni X minuti" → frequency: X
- Se l'utente dice "solo importanti" → importantOnly: true
- Se l'utente dice "solo orario lavoro" → workHoursOnly: true

🚨 REGOLA GENERALE IMPORTANTE:
Per TUTTI i comandi email (lettura, gestione, ricerca, notifiche), rispondi SOLO con JSON, nessun testo aggiuntivo.
Se mancano informazioni essenziali, chiedi con UNA domanda in italiano, poi restituisci il JSON completo.

🧠 COMPORTAMENTO INTELLIGENTE:
- Se l'utente fa domande generali o conversazione normale → rispondi in linguaggio naturale
- Se l'utente chiede ESPLICITAMENTE azioni specifiche (email, calendario, ecc.) → usa JSON
- NON forzare sempre JSON per email quando l'utente fa altre richieste
- Mantieni conversazione naturale per domande, spiegazioni, chiacchiere`;
  }

  // Funzione per ottenere il nome utente corrente
  private getCurrentUserName(): string {
    try {
      // Prova da localStorage nyra_user
      const userData = localStorage.getItem('nyra_user');
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed.name) {
          return parsed.name;
        }
      }
      
      // Prova da localStorage userData (compatibilità)
      const userDataAlt = localStorage.getItem('userData');
      if (userDataAlt) {
        const parsed = JSON.parse(userDataAlt);
        if (parsed.name) {
          return parsed.name;
        }
      }
      
      // Prova da localStorage username (fallback)
      const username = localStorage.getItem('username');
      if (username) {
        return username;
      }
      
      return '';
    } catch (error) {
      console.warn('Errore nel recupero nome utente:', error);
      return '';
    }
  }

  // Funzione per validare configurazione senza chiamate API
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Valida Backend URL
    if (!this.baseUrl) {
      errors.push('Backend URL mancante: VITE_BACKEND_URL non configurata');
    }
    
    // Valida base URL
    if (!this.baseUrl || !this.baseUrl.startsWith('https://')) {
      errors.push('Backend URL non valido');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const openRouter = new OpenRouterConnector();
