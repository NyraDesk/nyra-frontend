export class NaturalConversation {
  
  // Rimuovi duplicazioni e rendi naturale
  cleanQuery(input: string): string {
    return input
      .replace(/cerca|trovare|cercare/gi, '')
      .replace(/su amazon.*$/gi, '') // Rimuovi duplicazioni "su amazon"
      .replace(/su booking.*$/gi, '') // Rimuovi duplicazioni "su booking"
      .replace(/su linkedin.*$/gi, '') // Rimuovi duplicazioni "su linkedin"
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\biphone\b/gi, 'iPhone') // Capitalizza correttamente
      .replace(/\bmacbook\b/gi, 'MacBook')
      .replace(/\bipad\b/gi, 'iPad')
      .replace(/\bairpods\b/gi, 'AirPods');
  }
  
  // Messaggi di ricerca variabili e naturali
  getSearchMessage(query: string, site?: string): string {
    const cleanQuery = this.cleanQuery(query);
    
    const variations = [
      `Cerco ${cleanQuery} su ${site || 'Amazon'}`,
      `Ti trovo ${cleanQuery} subito`,
      `Vediamo cosa c'è per ${cleanQuery}`,
      `Controllo i prezzi per ${cleanQuery}`,
      `Cerco ${cleanQuery} per te`,
      `Ti mostro ${cleanQuery}`,
      `Vediamo le opzioni per ${cleanQuery}`,
      `Controllo la disponibilità di ${cleanQuery}`
    ];
    
    // Restituisci variazione casuale per naturalezza
    return variations[Math.floor(Math.random() * variations.length)];
  }
  
  // Messaggi di progresso discreti
  getProgressMessage(): string {
    const messages = [
      "Un momento...",
      "Sto guardando...", 
      "Quasi pronto...",
      "Controllo i risultati...",
      "Sto cercando...",
      "Un attimo...",
      "Controllo...",
      "Sto verificando..."
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Messaggi di completamento naturali
  getCompletedMessage(count: number = 0): string {
    if (count === 0) {
      const noResultsMessages = [
        "Non ho trovato risultati. Provo con altri termini?",
        "Non trovo nulla. Provo con una ricerca diversa?",
        "Non ci sono risultati. Provo con termini simili?",
        "Non trovo quello che cerchi. Provo alternative?"
      ];
      return noResultsMessages[Math.floor(Math.random() * noResultsMessages.length)];
    }
    
    if (count === 1) {
      const singleResultMessages = [
        "Ho trovato un risultato interessante",
        "Ecco quello che ho trovato",
        "Ho un risultato per te",
        "Ecco un'opzione"
      ];
      return singleResultMessages[Math.floor(Math.random() * singleResultMessages.length)];
    }
    
    const multipleResultsMessages = [
      `Ho trovato ${count} risultati interessanti`,
      `Ecco ${count} opzioni per te`,
      `Ho ${count} risultati che potrebbero interessarti`,
      `Ecco ${count} alternative`,
      `Ho trovato ${count} opzioni`
    ];
    
    return multipleResultsMessages[Math.floor(Math.random() * multipleResultsMessages.length)];
  }
  
  // Messaggi di errore naturali
  getErrorMessage(context: string): string {
    const errorMessages = {
      'network': [
        "Problemi di connessione. Riprovo?",
        "La connessione sembra lenta. Riprovo?",
        "Sto avendo problemi di rete. Riprovo?"
      ],
      'timeout': [
        "Sta impiegando troppo tempo. Riprovo?",
        "È più lento del solito. Riprovo?",
        "Sta tardando. Riprovo?"
      ],
      'blocked': [
        "Il sito sembra aver bloccato la ricerca. Provo con Google?",
        "Il sito non risponde. Provo altrove?",
        "Sembra bloccato. Provo con un altro approccio?"
      ],
      'notfound': [
        "Non riesco a trovare quello che cerchi. Provo con altri termini?",
        "Non trovo risultati. Provo con una ricerca diversa?",
        "Non ci sono risultati. Provo alternative?"
      ],
      'default': [
        "Qualcosa non va. Riprovo?",
        "Sto avendo problemi. Posso riprovare?",
        "Non riesco a completare l'operazione. Riprovo?"
      ]
    };
    
    const messages = errorMessages[context] || errorMessages['default'];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Messaggi di successo specifici per sito
  getSuccessMessage(site: string, action: string): string {
    const successMessages = {
      'amazon': {
        'search': [
          "Perfetto! Ho trovato i prodotti su Amazon",
          "Ecco i risultati su Amazon",
          "Ho trovato le opzioni su Amazon"
        ],
        'navigate': [
          "Amazon è aperto e pronto",
          "Amazon è disponibile per la ricerca",
          "Amazon è pronto per te"
        ]
      },
      'booking': {
        'search': [
          "Ho trovato le opzioni di prenotazione",
          "Ecco gli hotel disponibili",
          "Ho trovato le sistemazioni"
        ],
        'navigate': [
          "Booking è aperto per cercare hotel",
          "Booking è pronto per le prenotazioni",
          "Booking è disponibile"
        ]
      },
      'linkedin': {
        'search': [
          "Ho trovato le opportunità di lavoro",
          "Ecco le offerte disponibili",
          "Ho trovato le posizioni aperte"
        ],
        'navigate': [
          "LinkedIn è aperto per cercare lavoro",
          "LinkedIn è pronto per le candidature",
          "LinkedIn è disponibile"
        ]
      }
    };
    
    const siteKey = site.includes('amazon') ? 'amazon' : 
                   site.includes('booking') ? 'booking' :
                   site.includes('linkedin') ? 'linkedin' : 'default';
    
    const messages = successMessages[siteKey]?.[action] || ["Operazione completata!"];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Messaggi di browser management naturali
  getBrowserMessage(action: string): string {
    const browserMessages = {
      'opening': [
        "Apro il browser per te",
        "Sto aprendo il browser",
        "Preparo il browser"
      ],
      'navigating': [
        "Navigo verso il sito",
        "Sto andando al sito",
        "Sto caricando la pagina"
      ],
      'searching': [
        "Eseguo la ricerca",
        "Sto cercando",
        "Avvio la ricerca"
      ],
      'keeping_open': [
        "Mantengo il browser aperto così puoi vedere i risultati",
        "Il browser rimane aperto per la tua revisione",
        "Lascio il browser aperto per te"
      ],
      'auto_close': [
        "Il browser si chiuderà automaticamente tra poco",
        "Il browser si chiuderà da solo",
        "Chiudo il browser tra un momento"
      ]
    };
    
    const messages = browserMessages[action] || ["Gestisco il browser per te..."];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Messaggi di retry naturali
  getRetryMessage(attempt: number): string {
    const retryMessages = [
      "Riprovo...",
      "Provo di nuovo...",
      "Riprovo tra un momento...",
      "Provo un approccio diverso...",
      "Riprovo subito..."
    ];
    
    return retryMessages[Math.floor(Math.random() * retryMessages.length)];
  }
  
  // Messaggi di fallback eleganti
  getFallbackMessage(originalQuery: string, fallbackSite: string): string {
    const fallbackMessages = [
      `Non riesco a trovare ${originalQuery} qui. Provo su ${fallbackSite}?`,
      `Sto avendo difficoltà. Provo su ${fallbackSite}?`,
      `Non trovo risultati. Provo su ${fallbackSite}?`,
      `Provo un approccio diverso su ${fallbackSite}`
    ];
    
    return fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
  }
} 