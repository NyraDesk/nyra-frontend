export class NaturalMessages {
  // Messaggi di inizio ricerca
  getSearchingMessage(site: string, product?: string): string {
    const siteMessages = {
      'amazon.it': product ? `Sto cercando ${product} su Amazon...` : 'Sto navigando su Amazon...',
      'amazon.com': product ? `Sto cercando ${product} su Amazon...` : 'Sto navigando su Amazon...',
      'booking.com': 'Controllo disponibilità hotel su Booking...',
      'netflix.com': 'Cerco film e serie TV su Netflix...',
      'idealista.it': 'Cerco immobili su Idealista...',
      'linkedin.com': 'Cerco opportunità di lavoro su LinkedIn...',
      'deliveroo.co.uk': 'Cerco ristoranti su Deliveroo...',
      'google.com': product ? `Faccio una ricerca per "${product}"...` : 'Faccio una ricerca per te...'
    };
    
    return siteMessages[site] || `Sto navigando su ${site}...`;
  }

  // Messaggi durante navigazione  
  getNavigatingMessage(action: string): string {
    const actions = {
      'opening': 'Apro la pagina per te',
      'typing': 'Inserisco i termini di ricerca',
      'searching': 'Avvio la ricerca',
      'loading': 'Carico i risultati',
      'extracting': 'Analizzo quello che ho trovato',
      'waiting': 'Aspetto che la pagina si carichi completamente'
    };
    
    return actions[action] || 'Sto lavorando per te...';
  }

  // Messaggi di completamento
  getCompletedMessage(resultsCount: number, site: string): string {
    if (resultsCount === 0) {
      return 'Non ho trovato risultati per questa ricerca. Vuoi che provi con altri termini?';
    }
    
    if (resultsCount === 1) {
      return 'Perfetto! Ho trovato un risultato che potrebbe interessarti';
    }
    
    return `Ottimo! Ho trovato ${resultsCount} risultati interessanti per te`;
  }

  // Messaggi di errore naturali
  getErrorMessage(error: string): string {
    const errorMessages = {
      'network': 'Ops, sembra che ci sia un problema di connessione. Riprovo?',
      'blocked': 'Il sito sembra aver bloccato la ricerca automatica. Posso provare con Google',
      'notfound': 'Non riesco a trovare quello che cerchi su questo sito. Proviamo altrove?',
      'timeout': 'La ricerca sta impiegando troppo tempo. Posso riprovare?',
      'selector': 'Il sito ha cambiato layout. Posso provare con un approccio diverso?',
      'navigation': 'La pagina non si carica correttamente. Riprovo tra un momento?'
    };
    
    return errorMessages[error] || 'Qualcosa è andato storto, ma posso riprovare subito';
  }

  // Messaggi di successo specifici per sito
  getSuccessMessage(site: string, action: string): string {
    const successMessages = {
      'amazon': {
        'search': 'Perfetto! Ho trovato i prodotti su Amazon. Puoi vedere i risultati nel browser',
        'navigate': 'Amazon è aperto e pronto per la ricerca'
      },
      'booking': {
        'search': 'Ho trovato le opzioni di prenotazione su Booking',
        'navigate': 'Booking è aperto per cercare hotel'
      },
      'linkedin': {
        'search': 'Ho trovato le opportunità di lavoro su LinkedIn',
        'navigate': 'LinkedIn è aperto per cercare lavoro'
      },
      'deliveroo': {
        'search': 'Ho trovato i ristoranti disponibili su Deliveroo',
        'navigate': 'Deliveroo è aperto per ordinare cibo'
      }
    };
    
    const siteKey = site.includes('amazon') ? 'amazon' : 
                   site.includes('booking') ? 'booking' :
                   site.includes('linkedin') ? 'linkedin' :
                   site.includes('deliveroo') ? 'deliveroo' : 'default';
    
    return successMessages[siteKey]?.[action] || 'Operazione completata con successo!';
  }

  // Messaggi di browser management
  getBrowserMessage(action: string): string {
    const browserMessages = {
      'opening': 'Apro il browser per te',
      'navigating': 'Navigo verso il sito',
      'searching': 'Eseguo la ricerca',
      'keeping_open': 'Mantengo il browser aperto per 2 minuti così puoi vedere i risultati',
      'manual_review': 'Il browser rimane aperto per la tua revisione',
      'auto_close': 'Il browser si chiuderà automaticamente tra 2 minuti'
    };
    
    return browserMessages[action] || 'Gestisco il browser per te...';
  }

  // Messaggi di parsing query
  getQueryParsingMessage(query: string, site: string): string {
    return `Ho capito che vuoi cercare "${query}" su ${site}. Procedo subito!`;
  }

  // Messaggi di fallback
  getFallbackMessage(originalSite: string, fallbackSite: string): string {
    return `Non riesco ad accedere a ${originalSite}. Provo con ${fallbackSite} invece?`;
  }
} 