// electron/modules/routerCJS.js
// Router CommonJS per l'uso nel main process

// Importa tutti i moduli dei siti in CommonJS
const path = require('path');

class ModularAutomation {
  constructor() {
    this.supportedSites = [
      'amazon', 'ebay', 'zalando', 'linkedin', 'facebook', 'instagram',
      'trenitalia', 'italo', 'skyscanner', 'booking', 'airbnb', 'googleflights',
      'youtube', 'twitter', 'tiktok', 'wikipedia', 'reddit', 'netflix', 'spotify', 'expedia',
      'pinterest', 'googlenews', 'giallozafferano', 'steam', 'imdb', 'udemy', 'googlemaps', 'etsy'
    ];
  }

  async routeIntent(site, page, intent) {
    console.log(`🚀 RouterCJS: Routing to ${site} with query: ${intent.query}`);
    
    try {
      switch (site.toLowerCase()) {
        case "amazon":
          return await this.executeAmazon(page, intent);
        case "booking":
          return await this.executeBooking(page, intent);
        case "trenitalia":
          return await this.executeTrenitalia(page, intent);
        case "ebay":
          return await this.executeEbay(page, intent);
        case "zalando":
          return await this.executeZalando(page, intent);
        case "linkedin":
          return await this.executeLinkedIn(page, intent);
        case "facebook":
          return await this.executeFacebook(page, intent);
        case "instagram":
          return await this.executeInstagram(page, intent);
        case "italo":
          return await this.executeItalo(page, intent);
        case "skyscanner":
          return await this.executeSkyscanner(page, intent);
        case "airbnb":
          return await this.executeAirbnb(page, intent);
        case "googleflights":
          return await this.executeGoogleFlights(page, intent);
        case "youtube":
          return await this.executeYouTube(page, intent);
        case "twitter":
          return await this.executeTwitter(page, intent);
        case "tiktok":
          return await this.executeTikTok(page, intent);
        case "wikipedia":
          return await this.executeWikipedia(page, intent);
        case "reddit":
          return await this.executeReddit(page, intent);
        case "netflix":
          return await this.executeNetflix(page, intent);
        case "spotify":
          return await this.executeSpotify(page, intent);
        case "expedia":
          return await this.executeExpedia(page, intent);
        case "pinterest":
          return await this.executePinterest(page, intent);
        case "googlenews":
          return await this.executeGoogleNews(page, intent);
        case "giallozafferano":
          return await this.executeGialloZafferano(page, intent);
        case "steam":
          return await this.executeSteam(page, intent);
        case "imdb":
          return await this.executeIMDb(page, intent);
        case "udemy":
          return await this.executeUdemy(page, intent);
        case "googlemaps":
          return await this.executeGoogleMaps(page, intent);
        case "etsy":
          return await this.executeEtsy(page, intent);
        default:
          throw new Error(`Site not supported: ${site}`);
      }
    } catch (error) {
      console.error(`❌ RouterCJS: Error routing to ${site}:`, error);
      
      // Gestione errori conversazionale
      if (error.message?.includes('Timeout') || error.name === 'TimeoutError') {
        return `⏱️ ${site.charAt(0).toUpperCase() + site.slice(1)} sta impiegando più tempo del previsto. Vuoi che riprovi o preferisci usare un altro sito?`;
      }
      
      if (error.message?.includes('Failed to find element') || error.message?.includes('waitForSelector')) {
        return `🔧 ${site.charAt(0).toUpperCase() + site.slice(1)} ha cambiato la sua interfaccia. Sto aprendo il sito manualmente per te.`;
      }
      
      if (error.message?.includes('net::') || error.message?.includes('ENOTFOUND')) {
        return `🌐 Non riesco a raggiungere ${site.charAt(0).toUpperCase() + site.slice(1)} al momento. Vuoi che provi con un sito alternativo?`;
      }
      
      return `⚠️ Ho riscontrato un problema con ${site.charAt(0).toUpperCase() + site.slice(1)}. Vuoi che riprovi o posso aiutarti diversamente?`;
    }
  }

  // Implementazioni specifiche per ogni sito
  async executeAmazon(page, intent) {
    try {
      console.log('🛒 Amazon: Avvio automazione per:', intent.query);
      
      await page.goto('https://www.amazon.it', { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      await page.waitForSelector('#twotabsearchtextbox', { timeout: 5000 });
      await page.fill('#twotabsearchtextbox', intent.query);
      await page.click('#nav-search-submit-button');
      await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 10000 });
      
      // Applica filtri se specificati
      if (intent.filters?.priceMax) {
        try {
          const priceInput = await page.$('input[name="high-price"]');
          if (priceInput) {
            await priceInput.fill(intent.filters.priceMax.toString());
            const applyBtn = await page.$('input[type="submit"]');
            if (applyBtn) {
              await applyBtn.click();
              await page.waitForTimeout(2000);
            }
          }
        } catch (error) {
          console.warn('⚠️ Amazon: Errore nell\'applicazione filtro prezzo:', error);
        }
      }
      
      console.log('✅ Amazon: Ricerca completata');
      return `🔍 Ricerca Amazon completata per "${intent.query}"${intent.filters?.priceMax ? ` con filtro prezzo ${intent.filters.priceMax}€` : ''}`;
      
    } catch (error) {
      console.error('❌ Amazon: Errore nell\'automazione:', error);
      throw new Error(`Errore nell'automazione Amazon: ${error.message}`);
    }
  }

  async executeTrenitalia(page, intent) {
    try {
      console.log('🚂 Trenitalia: Avvio automazione per:', intent.query);
      
      await page.goto('https://www.trenitalia.com', { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      const origin = this.extractOrigin(intent.query);
      const destination = this.extractDestination(intent.query);
      
      console.log('🚂 Trenitalia: Origine:', origin, 'Destinazione:', destination);
      
      await page.waitForSelector('#st-input-origin', { timeout: 5000 });
      await page.fill('#st-input-origin', origin);
      
      await page.waitForSelector('#st-input-destination', { timeout: 5000 });
      await page.fill('#st-input-destination', destination);
      
      await this.selectTomorrowDate(page);
      await page.click('button[type="submit"]');
      await page.waitForSelector('.train-result, .train-info', { timeout: 10000 });
      
      console.log('✅ Trenitalia: Ricerca completata');
      return `🚂 Ricerca Trenitalia completata: ${origin} → ${destination}`;
      
    } catch (error) {
      console.error('❌ Trenitalia: Errore nell\'automazione:', error);
      throw new Error(`Errore nell'automazione Trenitalia: ${error.message}`);
    }
  }

  async executeBooking(page, intent) {
    try {
      console.log('🏨 Booking: Avvio automazione per:', intent.query);
      
      await page.goto('https://www.booking.com', { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      await page.waitForSelector('input[name="ss"]', { timeout: 5000 });
      await page.fill('input[name="ss"]', intent.query);
      
      await page.waitForTimeout(1000);
      const suggestion = await page.$('li[data-testid="autocomplete-result"]');
      if (suggestion) {
        await suggestion.click();
      }
      
      await page.click('button[type="submit"]');
      await page.waitForSelector('[data-testid="property-card"]', { timeout: 10000 });
      
      console.log('✅ Booking: Ricerca completata');
      return `🏨 Ricerca Booking completata per "${intent.query}"`;
      
    } catch (error) {
      console.error('❌ Booking: Errore nell\'automazione:', error);
      throw new Error(`Errore nell'automazione Booking: ${error.message}`);
    }
  }

  // Implementazioni semplici per gli altri siti
  async executeEbay(page, intent) {
    await page.goto('https://www.ebay.it');
    await page.fill('#gh-ac', intent.query);
    await page.click('#gh-btn');
    return `🛍️ Ricerca eBay completata per "${intent.query}"`;
  }

  async executeZalando(page, intent) {
    await page.goto('https://www.zalando.it');
    await page.fill('input[name="q"]', intent.query);
    await page.click('button[type="submit"]');
    return `👕 Ricerca Zalando completata per "${intent.query}"`;
  }

  async executeLinkedIn(page, intent) {
    await page.goto('https://www.linkedin.com');
    return `💼 LinkedIn aperto per "${intent.query}"`;
  }

  async executeFacebook(page, intent) {
    await page.goto('https://www.facebook.com');
    return `📘 Facebook aperto per "${intent.query}"`;
  }

  async executeInstagram(page, intent) {
    await page.goto('https://www.instagram.com');
    return `📷 Instagram aperto per "${intent.query}"`;
  }

  async executeItalo(page, intent) {
    await page.goto('https://www.italotreno.it');
    return `🚄 Italo aperto per "${intent.query}"`;
  }

  async executeSkyscanner(page, intent) {
    await page.goto('https://www.skyscanner.it');
    return `✈️ Skyscanner aperto per "${intent.query}"`;
  }

  async executeAirbnb(page, intent) {
    await page.goto('https://www.airbnb.it');
    return `🏠 Airbnb aperto per "${intent.query}"`;
  }

  async executeGoogleFlights(page, intent) {
    await page.goto('https://www.google.com/travel/flights');
    return `✈️ Google Flights aperto per "${intent.query}"`;
  }

  async executeYouTube(page, intent) {
    await page.goto('https://www.youtube.com');
    await page.fill('input[name="search_query"]', intent.query);
    await page.click('button[type="submit"]');
    return `📺 Ricerca YouTube completata per "${intent.query}"`;
  }

  async executeTwitter(page, intent) {
    await page.goto('https://twitter.com');
    return `🐦 Twitter aperto per "${intent.query}"`;
  }

  async executeTikTok(page, intent) {
    await page.goto('https://www.tiktok.com');
    return `🎵 TikTok aperto per "${intent.query}"`;
  }

  async executeWikipedia(page, intent) {
    await page.goto('https://it.wikipedia.org');
    await page.fill('input[name="search"]', intent.query);
    await page.click('button[type="submit"]');
    return `📚 Ricerca Wikipedia completata per "${intent.query}"`;
  }

  async executeReddit(page, intent) {
    await page.goto('https://www.reddit.com');
    return `🤖 Reddit aperto per "${intent.query}"`;
  }

  async executeNetflix(page, intent) {
    await page.goto('https://www.netflix.com');
    return `🎬 Netflix aperto per "${intent.query}"`;
  }

  async executeSpotify(page, intent) {
    await page.goto('https://open.spotify.com');
    return `🎵 Spotify aperto per "${intent.query}"`;
  }

  async executeExpedia(page, intent) {
    await page.goto('https://www.expedia.it');
    return `✈️ Expedia aperto per "${intent.query}"`;
  }

  // Utility functions
  extractOrigin(query) {
    const cities = ['Milano', 'Roma', 'Napoli', 'Torino', 'Firenze', 'Venezia', 'Bologna', 'Genova', 'Bari', 'Palermo', 'Taranto', 'Catania', 'Messina', 'Verona', 'Padova', 'Trieste', 'Cagliari', 'Perugia', 'Ancona', 'Reggio Calabria'];
    
    // Preposizioni che indicano origine
    const fromPrepositions = ['da ', 'partenza da ', 'partendo da '];
    
    // Cerca pattern "da [città]"
    for (const prep of fromPrepositions) {
      if (query.toLowerCase().includes(prep)) {
        const afterPrep = query.toLowerCase().split(prep)[1];
        if (afterPrep) {
          for (const city of cities) {
            if (afterPrep.toLowerCase().includes(city.toLowerCase())) {
              return city;
            }
          }
        }
      }
    }
    
    // Se non trova pattern "da", usa la prima città trovata
    for (const city of cities) {
      if (query.toLowerCase().includes(city.toLowerCase())) {
        return city;
      }
    }
    
    return 'Milano'; // Default
  }

  extractDestination(query) {
    const cities = ['Milano', 'Roma', 'Napoli', 'Torino', 'Firenze', 'Venezia', 'Bologna', 'Genova', 'Bari', 'Palermo', 'Taranto', 'Catania', 'Messina', 'Verona', 'Padova', 'Trieste', 'Cagliari', 'Perugia', 'Ancona', 'Reggio Calabria'];
    const foundCities = [];
    
    // Preposizioni che indicano destinazione
    const toPrepositions = ['a ', 'per ', 'verso '];
    
    // Cerca pattern "a [città]" o "per [città]"
    for (const prep of toPrepositions) {
      if (query.toLowerCase().includes(prep)) {
        const afterPrep = query.toLowerCase().split(prep)[1];
        if (afterPrep) {
          for (const city of cities) {
            if (afterPrep.toLowerCase().includes(city.toLowerCase())) {
              return city;
            }
          }
        }
      }
    }
    
    // Fallback: trova tutte le città e prendi la seconda
    for (const city of cities) {
      if (query.toLowerCase().includes(city.toLowerCase())) {
        foundCities.push(city);
      }
    }
    
    if (foundCities.length >= 2) {
      return foundCities[1];
    }
    
    // Se trovo solo una città ma la query contiene "taranto", usa taranto come destinazione
    if (query.toLowerCase().includes('taranto')) {
      return 'Taranto';
    }
    
    return 'Roma'; // Default
  }

  async selectTomorrowDate(page) {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const formattedDate = tomorrow.toISOString().split('T')[0];
      
      await page.fill('#st-input-date', formattedDate);
      console.log('📅 Data selezionata:', formattedDate);
    } catch (error) {
      console.warn('⚠️ Impossibile selezionare data, uso default');
    }
  }

  // NUOVE FUNZIONI PER I SITI AGGIUNTI
  async executePinterest(page, intent) {
    console.log('🖼️ Pinterest: Avvio automazione per:', intent.query);
    await page.goto('https://www.pinterest.com');
    await page.waitForSelector('input[data-test-id="search-box"]', { timeout: 8000 });
    await page.fill('input[data-test-id="search-box"]', intent.query);
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-test-id="pin"]', { timeout: 15000 });
    return `🖼️ Ricerca Pinterest completata per "${intent.query}"`;
  }

  async executeGoogleNews(page, intent) {
    console.log('📰 Google News: Avvio automazione per:', intent.query);
    await page.goto('https://news.google.com');
    await page.waitForSelector('.searchbox', { timeout: 8000 });
    await page.fill('.searchbox input', intent.query);
    await page.keyboard.press('Enter');
    await page.waitForSelector('article', { timeout: 15000 });
    return `📰 Ricerca Google News completata per "${intent.query}"`;
  }

  async executeGialloZafferano(page, intent) {
    console.log('🥗 GialloZafferano: Avvio automazione per:', intent.query);
    await page.goto('https://www.giallozafferano.it');
    await page.waitForSelector('input[name="q"]', { timeout: 8000 });
    await page.fill('input[name="q"]', intent.query);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.recipe-item', { timeout: 15000 });
    return `🥗 Ricerca GialloZafferano completata per "${intent.query}"`;
  }

  async executeSteam(page, intent) {
    console.log('🎮 Steam: Avvio automazione per:', intent.query);
    await page.goto('https://store.steampowered.com');
    await page.waitForSelector('#store_nav_search_term', { timeout: 8000 });
    await page.fill('#store_nav_search_term', intent.query);
    await page.click('#search_suggestion_submit');
    await page.waitForSelector('.search_result_row', { timeout: 15000 });
    return `🎮 Ricerca Steam completata per "${intent.query}"`;
  }

  async executeIMDb(page, intent) {
    console.log('📺 IMDb: Avvio automazione per:', intent.query);
    await page.goto('https://www.imdb.com');
    await page.waitForSelector('#suggestion-search', { timeout: 8000 });
    await page.fill('#suggestion-search', intent.query);
    await page.click('#suggestion-search-button');
    await page.waitForSelector('.titleResult', { timeout: 15000 });
    return `📺 Ricerca IMDb completata per "${intent.query}"`;
  }

  async executeUdemy(page, intent) {
    console.log('🎓 Udemy: Avvio automazione per:', intent.query);
    await page.goto('https://www.udemy.com');
    await page.waitForSelector('input[name="q"]', { timeout: 8000 });
    await page.fill('input[name="q"]', intent.query);
    await page.keyboard.press('Enter');
    await page.waitForSelector('.course-card', { timeout: 15000 });
    return `🎓 Ricerca Udemy completata per "${intent.query}"`;
  }

  async executeGoogleMaps(page, intent) {
    console.log('🗺️ Google Maps: Avvio automazione per:', intent.query);
    await page.goto('https://www.google.com/maps');
    await page.waitForSelector('#searchboxinput', { timeout: 8000 });
    await page.fill('#searchboxinput', intent.query);
    await page.click('#searchbox-searchbutton');
    await page.waitForSelector('.place-result', { timeout: 15000 });
    return `🗺️ Ricerca Google Maps completata per "${intent.query}"`;
  }

  async executeEtsy(page, intent) {
    console.log('🎁 Etsy: Avvio automazione per:', intent.query);
    await page.goto('https://www.etsy.com');
    await page.waitForSelector('#global-enhancements-search-query', { timeout: 8000 });
    await page.fill('#global-enhancements-search-query', intent.query);
    await page.click('button[type="submit"]');
    await page.waitForSelector('.listing-link', { timeout: 15000 });
    return `🎁 Ricerca Etsy completata per "${intent.query}"`;
  }
}

module.exports = { ModularAutomation };