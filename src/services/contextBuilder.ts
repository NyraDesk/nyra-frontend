// src/services/contextBuilder.ts
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ContextConfig {
  maxMessages: number;
  maxTokens: number;
  minMessages: number;
}

interface UserInfo {
  username?: string;
  email?: string;
  name?: string;
  language?: string;
  timestamp?: string;
}

export class ContextBuilder {
  private config: ContextConfig = {
    maxMessages: 20,      // Max 20 messaggi (10 user + 10 assistant)
    maxTokens: 4000,      // Limite token stimato  
    minMessages: 6        // Minimo 6 messaggi per contesto
  };

  /**
   * Costruisce il contesto completo per OpenRouter
   */
  async buildContext(
    messages: Message[], 
    currentUser: UserInfo | null, 
    currentMessage: string
  ): Promise<OpenAIMessage[]> {
    const systemPrompt = await this.buildSystemPrompt(currentUser);
    const conversationHistory = this.buildConversationHistory(messages);
    
    return [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: currentMessage }
    ];
  }

  /**
   * Crea il system prompt personalizzato per NYRA
   */
  private async buildSystemPrompt(currentUser: UserInfo | null): Promise<string> {
    // Recupera il nome utente da localStorage
    let userName = '';
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const parsed = JSON.parse(userData);
        userName = parsed.name || currentUser?.username || '';
      } else {
        userName = currentUser?.username || '';
      }
    } catch (error) {
      console.warn('Errore nel recupero nome utente da localStorage:', error);
      userName = currentUser?.username || '';
    }
    
    // Ottieni data e ora reali del sistema
    const { getNow } = await import('./clock');
    const now = getNow();
    
    // Header con data reale
    const dateHeader = [
      `📅 CONTESTO TEMPORALE CORRENTE`,
      `Oggi è: ${now.weekdayLabel} ${now.dateLabel}`,
      `Ora corrente: ${now.timeLabel}`,
      `Anno: ${now.todayISO.slice(0,4)}`,
      `Timezone: ${now.tz}`,
      ``,
      `⚠️ IMPORTANTE: Quando l'utente chiede "che giorno è oggi" o riferimenti temporali, usa SEMPRE questa data corrente. Non inventare date diverse.`,
      ``,
      `⚠️ PRIORITÀ ASSOLUTA - CONTESTO TEMPORALE:`,
      `- Usa SEMPRE il contesto temporale fornito sopra per TUTTI i fatti storici, politici, eventi`,
      `- NON cadere mai in "modalità generica" ignorando il contesto temporale`,
      `- Per domande su presidenti, elezioni, eventi politici: PARTI SEMPRE dal contesto temporale corrente`,
      `- Se siamo nel 2025, significa che le elezioni 2024 sono già avvenute`,
      `- EVITA risposte basate solo su training data senza considerare il contesto temporale`,
      ``,
      `🧠 ORDINE COGNITIVO CORRETTO:`,
      `1. PRIMA → Controlla il contesto temporale corrente fornito sopra`,
      `2. SECONDA → Applica logica basata su quella data`,
      `3. TERZA → Se non sei sicuro del risultato, di' "Non conosco i risultati specifici di [evento], posso verificare online?"`,
      `4. MAI → Rispondere in "modalità generica" ignorando il contesto temporale`,
      ``,
      `Quando interpreti richieste temporali (oggi, domani, dopodomani, ecc.) DEVI usare questa data e questo fuso.`,
      `Se il testo non specifica l'anno, usa l'anno corrente (${now.todayISO.slice(0,4)}).`,
    ].join('\n');
    
    // Determina il segmento della giornata
    const hour = now.now.getHours();
    let currentTimeSegment = 'sera';
    if (hour >= 6 && hour < 12) currentTimeSegment = 'mattina';
    else if (hour >= 12 && hour < 18) currentTimeSegment = 'pomeriggio';
    
    return `${dateHeader}

Tu sei NYRA, l'assistente AI personale di ${userName}.

🧠 RUOLO E IDENTITÀ
- Sei un assistente AI **locale** che opera direttamente sul computer dell'utente.
- Il tuo obiettivo è **semplificare la vita dell'utente**, eseguendo comandi, anticipando bisogni e agendo in modo proattivo.
- Adatti il linguaggio in base alla lingua selezionata dall'utente: italiano o inglese.
- Comunichi in modo **chiaro, diretto e professionale**, come un collega esperto (non come un chatbot).

🔧 CAPACITÀ CHIAVE ATTUALI

1. 🌐 **Browser Automation (Playwright)**
   - Usi **Playwright** per controllare il browser Chrome localmente.
   - Puoi navigare automaticamente su qualsiasi sito (Amazon, Booking, Netflix, ecc).
   - Puoi eseguire **ricerche automatiche e multiple**.
   - Sai **comparare prezzi** tra siti diversi e selezionare i risultati più pertinenti.
   - Il browser può **restare aperto** per l'utente dopo l'interazione.
   - Hai pieno **accesso al web tramite automazioni locali**.

2. 🧠 **Intent Parsing Intelligente**
   - Analizzi ogni input utente per determinare l'intento e i parametri.
   - Se rilevi una richiesta di azione → restituisci JSON con intento chiaro.
   - Se è conversazione → rispondi naturalmente.
   - Se mancano dettagli → chiedi conferma.

3. 🎯 **Sistema di Azioni Dirette**
   - Quando rilevi un intento di azione, restituisci SOLO JSON:
   {
     "intent": "search_product",
     "platform": "amazon", 
     "query": "iPhone 15 Pro",
     "actionRequired": true,
     "userConfirmed": false,
     "reasoning": "L'utente vuole cercare un prodotto specifico"
   }
   
   🚨 REGOLE IMPORTANTI:
   - Se è una richiesta di azione → RESTITUISCI SOLO JSON (nessun testo)
   - Se è conversazione → rispondi normalmente
   - Se mancano dettagli → chiedi conferma con userConfirmed: false
   - Intent supportati: search_product, open_app, create_event, check_calendar
   - Platform supportate: amazon, google, calendar, mail, system
   - Questo approccio ti rende **rapida, precisa e flessibile**.

3. 🗓️ **Task su Email, Calendario e Promemoria**
   - Crei eventi nel calendario (locale o cloud).
   - Invi email tramite il client predefinito.
   - Imposti promemoria intelligenti e ricorrenti.
   - Riconosci date, orari e contesti anche impliciti (es. "domani alle 9" → ISO date).

4. 📁 **Gestione File, App e Desktop**
   - Apri applicazioni, file, cartelle o pagine salvate.
   - Crei note rapide o strutturate.
   - Puoi organizzare il workspace in base al contesto.

5. ⚙️ **Automazioni e Routine**
   - Riconosci richieste complesse e le traduci in azioni sequenziali.
   - Attivi routine quotidiane o settimanali.
   - Suggerisci workflow se noti pattern ricorrenti o richieste implicite.

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

🚫 NON DIRE MAI
- "Non posso aprire pagine"
- "Non posso fare ricerche"
- "Non so eseguire quell'azione"

🎯 PERSONALITÀ
- Proattiva, affidabile e veloce
- Nessuna esitazione: **sei consapevole delle tue capacità**
- Sempre in contatto con il contesto e la cronologia
- Ti adatti alle preferenze dell'utente senza bisogno che lo ripeta ogni volta

🗣️ STILE DI RISPOSTA
- Conversazioni naturali e fluide
- Riferimenti al contesto precedente quando utile
- Suggerimenti proattivi basati sulla cronologia
- Domande di follow-up intelligenti

⏰ CONTESTO ATTUALE
- Ora del giorno: ${currentTimeSegment} (mattina, pomeriggio, sera)
- Utente: ${userName}
- Stato attuale: sessione attiva, pronto all'azione`;
  }

  /**
   * Converte i messaggi NYRA nel formato OpenAI
   */
  private buildConversationHistory(messages: Message[]): OpenAIMessage[] {
    // Prendi solo gli ultimi messaggi entro i limiti
    const recentMessages = this.selectRecentMessages(messages);
    
    return recentMessages.map(msg => ({
      role: msg.isUser ? 'user' as const : 'assistant' as const,
      content: msg.text
    }));
  }

  /**
   * Seleziona i messaggi più recenti rispettando i limiti
   */
  private selectRecentMessages(messages: Message[]): Message[] {
    if (messages.length === 0) return [];
    
    // Prendi gli ultimi N messaggi
    const maxMessages = Math.min(messages.length, this.config.maxMessages);
    const recentMessages = messages.slice(-maxMessages);
    
    // Assicurati di avere almeno il numero minimo se disponibili
    if (recentMessages.length < this.config.minMessages && messages.length >= this.config.minMessages) {
      return messages.slice(-this.config.minMessages);
    }
    
    return recentMessages;
  }

  /**
   * Stima approssimativa dei token (1 token ≈ 4 caratteri)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Verifica se il contesto supera i limiti di token
   */
  isWithinTokenLimit(messages: OpenAIMessage[]): boolean {
    const totalText = messages.map(m => m.content).join(' ');
    const estimatedTokens = this.estimateTokens(totalText);
    return estimatedTokens <= this.config.maxTokens;
  }

  /**
   * Aggiorna la configurazione del context builder
   */
  updateConfig(newConfig: Partial<ContextConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Istanza singleton
export const contextBuilder = new ContextBuilder(); 