import * as XLSX from 'xlsx';
import { EXTERNAL_APIS } from '../config/external-apis';

export class ExcelService {
  // Helper per estrarre valori numerici da celle
  private extractNumericValue(cell: any): number | null {
    if (typeof cell === 'number') return cell;
    if (typeof cell === 'string') {
      // Rimuovi simboli di valuta e spazi, gestisci separatori decimali
      let cleaned = cell.replace(/[€$£¥\s]/g, '');
      
      // Gestisci formato italiano (1.500,50) vs formato US (1,500.50)
      if (cleaned.includes(',') && cleaned.includes('.')) {
        // Formato italiano: rimuovi punti (migliaia) e sostituisci virgola con punto
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else if (cleaned.includes(',') && !cleaned.includes('.')) {
        // Solo virgola: probabilmente decimale italiano
        cleaned = cleaned.replace(',', '.');
      }
      // Se solo punti, assumiamo formato US (lasciamo così)
      
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    }
    return null;
  }
  // Funzione per creare Excel da dati strutturati
  async createExcelFromData(data: {
    title: string;
    columns: string[];
    rows: any[][];
    type?: string;
  }): Promise<{ success: boolean, message: string }> {
    try {
      const wb = XLSX.utils.book_new();
      
      const wsData = [
        [data.title.toUpperCase()],
        ['Data: ' + new Date().toLocaleDateString('it-IT')],
        [''],
        data.columns,
        ...data.rows
      ];
      
      // Calcolo totale per fatture e report
      if ((data.type === 'fattura' || data.type === 'report') && data.rows.length > 0) {
        wsData.push(['']);
        
        // Trova colonne numeriche e calcola totali
        const totals: { [key: number]: number } = {};
        
        data.rows.forEach((row, rowIndex) => {
          row.forEach((cell, index) => {
            // Estrai numero da celle che contengono valori numerici
            const numericValue = this.extractNumericValue(cell);
            if (numericValue !== null && numericValue > 0) {
              console.log(`Riga ${rowIndex}, Colonna ${index}: "${cell}" -> ${numericValue}`);
              totals[index] = (totals[index] || 0) + numericValue;
            }
          });
        });
        
        console.log('Totali calcolati:', totals);
        
        // Aggiungi riga totali se ci sono colonne numeriche
        if (Object.keys(totals).length > 0) {
          const totalRow = new Array(data.columns.length).fill('');
          totalRow[0] = 'TOTALE:';
          
          Object.entries(totals).forEach(([colIndex, total]) => {
            totalRow[parseInt(colIndex)] = `€ ${total.toFixed(2)}`;
          });
          
          wsData.push(totalRow);
        }
      }
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = data.columns.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, ws, 'Foglio1');
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `${data.title.replace(/\s/g, '_')}_${Date.now()}.xlsx`;
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return {
        success: true,
        message: `✅ Excel "${data.title}" creato con successo!\n📊 ${data.columns.length} colonne, ${data.rows.length} righe\n💾 File scaricato: ${fileName}`
      };
      
    } catch (error) {
      console.error('Errore creazione Excel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      return {
        success: false,
        message: `❌ Errore nella creazione dell'Excel: ${errorMessage}`
      };
    }
  }

  // Funzione specializzata per progetti con percentuali e revenue
  async createProjectStatusFromRequest(request: string): Promise<{ success: boolean, message: string }> {
    try {
      // Regex GLOBALE per catturare TUTTI i progetti
      const projectPattern = /progetto\s+(\w+)\s+budget\s+(\d+)\s+completamento\s+(\d+)%/g;
      const projects = [];
      let match;
      
      // Reset regex per catturare tutti i progetti
      projectPattern.lastIndex = 0;

      while ((match = projectPattern.exec(request)) !== null) {
        const [, name, budget, completion] = match;
        const budgetNum = parseInt(budget);
        const completionNum = parseInt(completion);
        const revenueRiconosciuta = Math.round(budgetNum * completionNum / 100);
        const daFatturare = budgetNum - revenueRiconosciuta;

        projects.push([
          `Progetto ${name}`,
          budgetNum,
          `${completionNum}%`,
          '', // Scadenza vuota per ora
          revenueRiconosciuta,
          daFatturare
        ]);
      }

      if (projects.length > 0) {
        // Calcola totali CORRETTI - usando gli indici giusti
        const totalBudget = projects.reduce((sum, p) => sum + Number(p[1]), 0);
        const totalRevenue = projects.reduce((sum, p) => sum + Number(p[4]), 0);
        const totalDaFatturare = projects.reduce((sum, p) => sum + Number(p[5]), 0);
        
        console.log('DEBUG TOTALI:', { totalBudget, totalRevenue, totalDaFatturare });

        const excelStructure = {
          title: 'Stato Progetti',
          columns: ['Progetto', 'Budget', 'Completamento', 'Scadenza', 'Revenue Riconosciuta', 'Da Fatturare'],
          rows: projects,
          type: 'report'
        };

        return await this.createExcelFromData(excelStructure);
      }

      return { success: false, message: 'Nessun progetto trovato nel formato richiesto' };
    } catch (error) {
      console.error('Errore creazione stato progetti:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      return {
        success: false,
        message: `❌ Errore nella creazione dello stato progetti: ${errorMessage}`
      };
    }
  }

  // Funzione principale per creare Excel da richiesta testuale
  async createExcelFromRequest(request: string): Promise<{ success: boolean, message: string }> {
    try {
      // Controlla se è una richiesta di stato progetti
      if (request.toLowerCase().includes('stato progetti') || 
          (request.toLowerCase().includes('progetto') && request.toLowerCase().includes('completamento'))) {
        return await this.createProjectStatusFromRequest(request);
      }
      
      // Controlla se è una richiesta di budget e gestiscila direttamente
      if (request.toLowerCase().includes('budget') || request.toLowerCase().includes('costo')) {
        return await this.createBudgetFromRequest(request);
      }
      
      const aiPrompt = `
        L'utente vuole creare un Excel con questa richiesta: "${request}"
        
        Analizza la richiesta e rispondi SOLO con JSON che descrive la struttura Excel:
        {
          "titolo": "nome del documento",
          "colonne": ["colonna1", "colonna2", ...],
          "righe": [
            ["dato1", "dato2", ...],
            ["dato1", "dato2", ...]
          ],
          "tipo": "fattura|report|lista|generico"
        }
        
        IMPORTANTE: Per i calcoli matematici e percentuali:
        - Se vedi "5x800", calcola 5*800=4000
        - Se vedi "2x300", calcola 2*300=600
        - Se vedi "75%", mantieni come "75%" NON come 0.75
        - Se vedi "completamento 40%", usa "40%" nella colonna completamento
        - Per revenue riconosciuta: budget × percentuale completamento
        - Per da fatturare: budget - revenue riconosciuta
        - Includi sempre i risultati dei calcoli nelle righe
        
        Esempi:
        - Se chiede una fattura: genera struttura fattura con cliente, importo, IVA, totale
        - Se chiede una lista: crea colonne appropriate per i dati
        - Se chiede un report: organizza in formato report
        
        Adatta sempre la struttura al contesto della richiesta.
      `;
      
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Title': 'NYRA'
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [
            { role: 'system', content: 'Sei un assistente che struttura dati per Excel. Rispondi SOLO in JSON valido, nient\'altro.' },
            { role: 'user', content: aiPrompt }
          ],
          temperature: 0.3
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenRouter error: ${response.status}`);
      }
      
      const data = await response.json();
      const excelStructure = JSON.parse(data.choices[0].message.content);
      
      // Usa la funzione createExcelFromData per evitare duplicazione
      return await this.createExcelFromData({
        title: excelStructure.titolo,
        columns: excelStructure.colonne,
        rows: excelStructure.righe,
        type: excelStructure.tipo
      });
      
    } catch (error) {
      console.error('Errore creazione Excel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      return {
        success: false,
        message: `❌ Errore nella creazione dell'Excel: ${errorMessage}`
      };
    }
  }

  // Funzione specializzata per creare budget con calcoli precisi
  async createBudgetFromRequest(request: string): Promise<{ success: boolean, message: string }> {
    try {
      // Estrai voci di budget dalla richiesta usando regex
      const budgetItems: Array<{name: string, quantity: number, price: number, days?: number}> = [];
      
      // Pattern per catturare: "nome quantitàxprezzo" o "nome quantità x prezzo"
      const itemPattern = /([a-zà-ù\s]+?)\s*(\d+)\s*x\s*(\d+(?:[.,]\d+)?)/gi;
      let match;
      
      while ((match = itemPattern.exec(request)) !== null) {
        const name = match[1].trim();
        const quantity = parseInt(match[2]);
        const price = parseFloat(match[3].replace(',', '.'));
        
        budgetItems.push({ name, quantity, price });
      }
      
      // Se non troviamo pattern, prova a usare l'AI ma con istruzioni specifiche
      if (budgetItems.length === 0) {
        const aiPrompt = `
          Estrai le voci di budget da questa richiesta: "${request}"
          
          Rispondi SOLO con JSON:
          {
            "titolo": "nome del budget",
            "voci": [
              {"nome": "descrizione", "quantita": numero, "prezzo": numero},
              ...
            ]
          }
          
          CALCOLA sempre le moltiplicazioni:
          - "5x800" = quantita: 5, prezzo: 800
          - "location 1500" = quantita: 1, prezzo: 1500
        `;
        
        const response = await fetch(`${API_URL}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Title': 'NYRA'
          },
          body: JSON.stringify({
            model: 'anthropic/claude-3.5-sonnet',
            messages: [
              { role: 'system', content: 'Estrai dati di budget e fai calcoli matematici precisi. Rispondi SOLO in JSON.' },
              { role: 'user', content: aiPrompt }
            ],
            temperature: 0.1
          })
        });
        
        if (!response.ok) {
          throw new Error(`OpenRouter error: ${response.status}`);
        }
        
        const data = await response.json();
        const budgetData = JSON.parse(data.choices[0].message.content);
        
        budgetData.voci.forEach((voce: any) => {
          budgetItems.push({
            name: voce.nome,
            quantity: voce.quantita,
            price: voce.prezzo
          });
        });
      }
      
      // Crea la struttura Excel con calcoli precisi
      const columns = ['Categoria', 'Descrizione', 'Quantità', 'Giorni', 'Costo Unitario', 'Subtotale'];
      const rows: any[][] = [];
      let grandTotal = 0;
      
      budgetItems.forEach(item => {
        const days = item.days || 1;
        const subtotal = item.quantity * days * item.price;
        grandTotal += subtotal;
        
        rows.push([
          item.name.charAt(0).toUpperCase() + item.name.slice(1),
          `Per ${item.name.toLowerCase()}`,
          item.quantity,
          days,
          item.price,
          `€${subtotal.toFixed(2)}`
        ]);
      });
      
      // Aggiungi righe di calcolo
      rows.push(['', '', '', '', 'Subtotale:', `€${grandTotal.toFixed(2)}`]);
      const iva = grandTotal * 0.22;
      rows.push(['', '', '', '', 'IVA 22%:', `€${iva.toFixed(2)}`]);
      rows.push(['', '', '', '', 'TOTALE:', `€${(grandTotal + iva).toFixed(2)}`]);
      
      const title = request.toLowerCase().includes('fashion') ? 'Budget Shooting Fashion Week' : 'Budget Progetto';
      
      return await this.createExcelFromData({
        title,
        columns,
        rows,
        type: 'budget'
      });
      
    } catch (error) {
      console.error('Errore creazione budget:', error);
      return {
        success: false,
        message: `❌ Errore nella creazione del budget: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
      };
    }
  }

  // Funzione per creare fattura Excel
  async createInvoiceExcel(customerData: {
    name: string;
    address?: string;
    vatNumber?: string;
  }, items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>): Promise<{ success: boolean, message: string }> {
    const columns = ['Descrizione', 'Quantità', 'Prezzo Unit.', 'Totale'];
    const rows = items.map(item => [
      item.description,
      item.quantity,
      `€ ${item.unitPrice.toFixed(2)}`,
      `€ ${item.total.toFixed(2)}`
    ]);

    const total = items.reduce((sum, item) => sum + item.total, 0);
    const vat = total * 0.22; // IVA 22%
    const grandTotal = total + vat;

    rows.push(['', '', 'Subtotale:', `€ ${total.toFixed(2)}`]);
    rows.push(['', '', 'IVA 22%:', `€ ${vat.toFixed(2)}`]);
    rows.push(['', '', 'TOTALE:', `€ ${grandTotal.toFixed(2)}`]);

    return await this.createExcelFromData({
      title: `Fattura ${customerData.name}`,
      columns,
      rows,
      type: 'fattura'
    });
  }

  // Funzione per creare report Excel
  async createReportExcel(title: string, data: Array<Record<string, any>>): Promise<{ success: boolean, message: string }> {
    if (data.length === 0) {
      return {
        success: false,
        message: '❌ Nessun dato disponibile per il report'
      };
    }

    const columns = Object.keys(data[0]);
    const rows = data.map(row => columns.map(col => row[col] || ''));

    return await this.createExcelFromData({
      title: `Report ${title}`,
      columns,
      rows,
      type: 'report'
    });
  }

  // Funzione per creare lista Excel
  async createListExcel(title: string, items: string[]): Promise<{ success: boolean, message: string }> {
    const columns = ['Elemento', 'Stato'];
    const rows = items.map(item => [item, 'Da fare']);

    return await this.createExcelFromData({
      title: `Lista ${title}`,
      columns,
      rows,
      type: 'lista'
    });
  }
}

export default ExcelService;

// ===== EMAIL AUTOMATION FUNCTIONS =====

// Tipi per analisi email
interface EmailAnalysisResult {
  analysis: {
    hasEmails: boolean;
    hasNames: boolean;
    hasAmounts: boolean;
    hasDeadlines: boolean;
    totalRows: number;
  };
  categorizedEmails: CategorizedEmail[];
  summary: string;
}

interface CategorizedEmail {
  email: string;
  nome?: string;
  importo?: string | number;
  scadenza?: string;
  progetto?: string;
  stato?: string;
  emailType: 'fattura' | 'sollecito' | 'update' | 'feedback' | 'standard';
  priority: 'alta' | 'normale' | 'bassa';
  suggestedSubject: string;
  suggestedBody: string;
  [key: string]: any; // Per campi custom
}

// Funzione helper per generare oggetto email
const generateSubject = (emailType: string, row: any): string => {
  switch(emailType) {
    case 'fattura':
      return `Fattura ${row.numero_fattura || ''} - ${row.progetto || 'Progetto'}`;
    case 'sollecito':
      return `URGENTE: Sollecito pagamento fattura ${row.numero_fattura || ''} scaduta`;
    case 'update':
      return `Aggiornamento progetto: ${row.progetto || 'In corso'}`;
    case 'feedback':
      return `Richiesta feedback per progetto ${row.progetto || 'completato'}`;
    default:
      return `Comunicazione importante`;
  }
};

// Funzione helper per generare corpo email
const generateBody = (emailType: string, row: any): string => {
  const nome = row.nome || row.name || 'Gentile Cliente';
  
  switch(emailType) {
    case 'fattura':
      return `Gentile ${nome},\n\nLe invio la fattura di €${row.importo || '0'} per il progetto "${row.progetto || 'N/D'}".\n\nScadenza pagamento: ${row.scadenza || '30 giorni'}\n\nCordiali saluti`;
    
    case 'sollecito':
      return `Gentile ${nome},\n\nLe ricordo che la fattura di €${row.importo || '0'} risulta scaduta.\n\nLa prego di provvedere al pagamento entro 5 giorni lavorativi.\n\nCordiali saluti`;
    
    case 'update':
      return `Gentile ${nome},\n\nLe scrivo per aggiornarla sullo stato del progetto "${row.progetto || 'N/D'}".\n\nStato attuale: ${row.stato || 'In corso'}\n\nResto a disposizione per qualsiasi chiarimento.\n\nCordiali saluti`;
    
    case 'feedback':
      return `Gentile ${nome},\n\nIl progetto "${row.progetto || 'N/D'}" è stato completato con successo.\n\nLe sarei grato se potesse fornirmi un feedback sulla collaborazione.\n\nCordiali saluti`;
    
    default:
      return `Gentile ${nome},\n\nLa contatto in merito a ${row.oggetto || 'una comunicazione importante'}.\n\nCordiali saluti`;
  }
};

// Funzione helper per generare summary
const generateSummary = (categorizedEmails: CategorizedEmail[]): string => {
  const counts = categorizedEmails.reduce((acc, email) => {
    acc[email.emailType] = (acc[email.emailType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const parts = [];
  if (counts.fattura) parts.push(`${counts.fattura} fatture`);
  if (counts.sollecito) parts.push(`${counts.sollecito} solleciti`);
  if (counts.update) parts.push(`${counts.update} aggiornamenti`);
  if (counts.feedback) parts.push(`${counts.feedback} richieste feedback`);
  if (counts.standard) parts.push(`${counts.standard} email standard`);
  
  return `Ho trovato ${categorizedEmails.length} contatti: ${parts.join(', ')}`;
};

// Funzione per convertire Excel in JSON (helper)
const parseExcelToJson = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Errore nella lettura del file'));
    reader.readAsBinaryString(file);
  });
};

// Funzione principale di analisi Excel per email
export const analyzeExcelForEmails = async (file: File): Promise<EmailAnalysisResult> => {
  try {
    // Usa la funzione parseExcel esistente
    const data = await parseExcelToJson(file);
    
    if (!data || data.length === 0) {
      throw new Error('Il file è vuoto o non contiene dati validi');
    }
    
    // Analizza le colonne
    const headers = Object.keys(data[0] || {});
    const analysis = {
      hasEmails: headers.some(h => 
        h.toLowerCase().includes('email') || 
        h.toLowerCase().includes('mail') ||
        h.toLowerCase().includes('e-mail')
      ),
      hasNames: headers.some(h => 
        h.toLowerCase().includes('nome') || 
        h.toLowerCase().includes('name') ||
        h.toLowerCase().includes('cliente')
      ),
      hasAmounts: headers.some(h => 
        h.toLowerCase().includes('importo') || 
        h.toLowerCase().includes('amount') ||
        h.toLowerCase().includes('prezzo') ||
        h.toLowerCase().includes('totale')
      ),
      hasDeadlines: headers.some(h => 
        h.toLowerCase().includes('scadenza') || 
        h.toLowerCase().includes('deadline') ||
        h.toLowerCase().includes('data')
      ),
      totalRows: data.length
    };
    
    // Trova la colonna email (required)
    const emailColumn = headers.find(h => 
      h.toLowerCase().includes('email') || 
      h.toLowerCase().includes('mail')
    );
    
    if (!emailColumn) {
      throw new Error('Non ho trovato una colonna email nel file');
    }
    
    // Categorizza ogni riga
    const categorizedEmails = data
      .filter(row => row[emailColumn]) // Solo righe con email
      .map(row => {
        let emailType: CategorizedEmail['emailType'] = 'standard';
        let priority: CategorizedEmail['priority'] = 'normale';
        
        // Logica di categorizzazione intelligente
        const hasAmount = row.importo || row.amount || row.prezzo || row.totale;
        const hasDeadline = row.scadenza || row.deadline || row.data_scadenza;
        const hasStatus = row.stato || row.status;
        const hasProject = row.progetto || row.project || row.lavoro;
        
        // Determina il tipo di email basandosi sui dati
        if (hasAmount && hasDeadline) {
          const deadline = String(hasDeadline).toLowerCase();
          if (deadline.includes('scadut') || deadline.includes('expired')) {
            emailType = 'sollecito';
            priority = 'alta';
          } else {
            emailType = 'fattura';
          }
        } else if (hasStatus) {
          const status = String(hasStatus).toLowerCase();
          if (status.includes('corso') || status.includes('progress')) {
            emailType = 'update';
          } else if (status.includes('complet') || status.includes('finit')) {
            emailType = 'feedback';
          }
        } else if (hasProject && !hasAmount) {
          emailType = 'update';
        }
        
        // Estrai email (gestisci diversi nomi colonna)
        const email = row[emailColumn] || row.email || row.Email || row.EMAIL || '';
        
        // Estrai nome (gestisci diversi nomi colonna)
        const nome = row.nome || row.Nome || row.name || row.Name || 
                     row.cliente || row.Cliente || '';
        
        return {
          ...row,
          email: String(email).trim(),
          nome: String(nome).trim(),
          emailType,
          priority,
          suggestedSubject: generateSubject(emailType, row),
          suggestedBody: generateBody(emailType, row)
        };
      });
    
    if (categorizedEmails.length === 0) {
      throw new Error('Nessuna email valida trovata nel file');
    }
    
    return {
      analysis,
      categorizedEmails,
      summary: generateSummary(categorizedEmails)
    };
    
  } catch (error) {
    console.error('Errore nell\'analisi Excel per email:', error);
    throw error;
  }
};

// Funzione per validare email
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Funzione per filtrare email valide
export const filterValidEmails = (emails: CategorizedEmail[]): CategorizedEmail[] => {
  return emails.filter(item => validateEmail(item.email));
};
