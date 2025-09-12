export interface Product {
  name?: string;
  price?: string;
  rating?: string;
  availability?: string;
  prime?: boolean;
  url?: string;
  description?: string;
}

export interface SearchResult {
  title?: string;
  description?: string;
  url?: string;
  price?: string;
  location?: string;
  link?: string;
}

export class ResultFormatter {
  /**
   * Formatta risultati Amazon con stile NYRA minimalista
   */
  formatAmazonResults(products: Product[], query: string): string {
    if (!products || products.length === 0) {
      return `Nessun risultato trovato per "${query}"\n\nVuoi che provi con termini diversi?`;
    }

    let formatted = `Risultati Amazon per "${query}"\n\n`;
    
    products.slice(0, 5).forEach((product, index) => {
      formatted += `${index + 1}. ${product.name || 'Prodotto'}\n`;
      
      if (product.price) {
        formatted += `   Prezzo: ${product.price}\n`;
      }
      
      if (product.rating) {
        formatted += `   Valutazione: ${product.rating}\n`;
      }
      
      if (product.availability) {
        formatted += `   Disponibilità: ${product.availability}\n`;
      }
      
      if (product.prime) {
        formatted += `   Spedizione: Prime disponibile\n`;
      }
      
      formatted += `\n`;
    });
    
    // Suggerimenti senza icone
    formatted += `Ho trovato ${products.length} risultati per te. Vuoi che ti mostri più dettagli o cerchi alternative?`;
    
    return formatted;
  }

  /**
   * Formatta risultati immobiliari con stile NYRA
   */
  formatRealEstateResults(properties: SearchResult[], location: string): string {
    if (!properties || properties.length === 0) {
      return `Nessun appartamento trovato a ${location}\n\nVuoi che cerchi in zone diverse?`;
    }

    let formatted = `Appartamenti a ${location}\n\n`;
    
    properties.slice(0, 5).forEach((property, index) => {
      formatted += `${index + 1}. ${property.title || 'Appartamento'}\n`;
      
      if (property.price) {
        formatted += `   Prezzo: ${property.price}\n`;
      }
      
      if (property.location) {
        formatted += `   Zona: ${property.location}\n`;
      }
      
      if (property.description) {
        formatted += `   ${property.description}\n`;
      }
      
      formatted += `\n`;
    });
    
    return formatted;
  }

  /**
   * Formatta risultati di ricerca web con stile NYRA
   */
  formatWebSearchResults(results: SearchResult[], query: string): string {
    if (!results || results.length === 0) {
      return `Nessun risultato trovato per "${query}"\n\nVuoi che provi con termini diversi?`;
    }

    let formatted = `Risultati per "${query}"\n\n`;
    
    results.slice(0, 5).forEach((result, index) => {
      formatted += `${index + 1}. ${result.title || 'Risultato'}\n`;
      
      if (result.description) {
        formatted += `   ${result.description}\n`;
      }
      
      if (result.url) {
        formatted += `   Link: ${result.url}\n`;
      }
      
      formatted += `\n`;
    });
    
    return formatted;
  }

  /**
   * Formatta risultati LinkedIn con stile NYRA
   */
  formatLinkedInResults(jobs: SearchResult[], query: string): string {
    if (!jobs || jobs.length === 0) {
      return `Nessuna offerta di lavoro trovata per "${query}"\n\nVuoi che cerchi con termini diversi?`;
    }

    let formatted = `Offerte di lavoro per "${query}"\n\n`;
    
    jobs.slice(0, 5).forEach((job, index) => {
      formatted += `${index + 1}. ${job.title || 'Posizione'}\n`;
      
      if (job.location) {
        formatted += `   Luogo: ${job.location}\n`;
      }
      
      if (job.description) {
        formatted += `   ${job.description}\n`;
      }
      
      if (job.url) {
        formatted += `   Candidati: ${job.url}\n`;
      }
      
      formatted += `\n`;
    });
    
    return formatted;
  }

  /**
   * Formatta risultati Booking con stile NYRA
   */
  formatBookingResults(hotels: SearchResult[], location: string): string {
    if (!hotels || hotels.length === 0) {
      return `Nessun hotel trovato a ${location}\n\nVuoi che cerchi in altre zone?`;
    }

    let formatted = `Hotel a ${location}\n\n`;
    
    hotels.slice(0, 5).forEach((hotel, index) => {
      formatted += `${index + 1}. ${hotel.title || 'Hotel'}\n`;
      
      if (hotel.price) {
        formatted += `   Prezzo: ${hotel.price}\n`;
      }
      
      if (hotel.location) {
        formatted += `   Zona: ${hotel.location}\n`;
      }
      
      if (hotel.description) {
        formatted += `   ${hotel.description}\n`;
      }
      
      if (hotel.url) {
        formatted += `   Prenota: ${hotel.url}\n`;
      }
      
      formatted += `\n`;
    });
    
    return formatted;
  }

  /**
   * Formatta messaggio di errore con stile NYRA
   */
  formatErrorMessage(error: string, context: string): string {
    return `Non sono riuscito a completare la ricerca per ${context}.\n\nErrore: ${error}\n\nVuoi che riprovi o cerchi qualcos'altro?`;
  }

  /**
   * Formatta messaggio di successo con stile NYRA
   */
  formatSuccessMessage(action: string, count: number): string {
    if (count === 0) {
      return `Non ho trovato risultati. Vuoi che provi con altri termini?`;
    }
    if (count === 1) {
      return `Ho trovato un risultato interessante`;
    }
    return `Ho trovato ${count} risultati per te`;
  }
} 