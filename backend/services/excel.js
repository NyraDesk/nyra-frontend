const XLSX = require('xlsx');
const fs = require('fs');
const openrouterService = require('./openrouter');

class ExcelService {
  // Helper to extract numeric values from cells
  extractNumericValue(cell) {
    if (typeof cell === 'number') return cell;
    if (typeof cell === 'string') {
      let cleaned = cell.replace(/[€$£¥\s]/g, '');
      
      if (cleaned.includes(',') && cleaned.includes('.')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else if (cleaned.includes(',') && !cleaned.includes('.')) {
        cleaned = cleaned.replace(',', '.');
      }
      
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    }
    return null;
  }

  // Parse Excel file to JSON
  async parseExcelToJson(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      return jsonData;
    } catch (error) {
      throw new Error(`Error parsing Excel file: ${error.message}`);
    }
  }

  // Analyze Excel for email data
  async analyzeExcelForEmails(filePath) {
    try {
      const data = await this.parseExcelToJson(filePath);
      
      if (!data || data.length === 0) {
        throw new Error('Il file è vuoto o non contiene dati validi');
      }
      
      // Analyze columns
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
      
      // Find email column
      const emailColumn = headers.find(h => 
        h.toLowerCase().includes('email') || 
        h.toLowerCase().includes('mail')
      );
      
      if (!emailColumn) {
        throw new Error('Non ho trovato una colonna email nel file');
      }
      
      // Categorize each row
      const categorizedEmails = data
        .filter(row => row[emailColumn])
        .map(row => {
          let emailType = 'standard';
          let priority = 'normale';
          
          const hasAmount = row.importo || row.amount || row.prezzo || row.totale;
          const hasDeadline = row.scadenza || row.deadline || row.data_scadenza;
          const hasStatus = row.stato || row.status;
          const hasProject = row.progetto || row.project || row.lavoro;
          
          // Determine email type
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
          
          const email = row[emailColumn] || row.email || row.Email || row.EMAIL || '';
          const nome = row.nome || row.Nome || row.name || row.Name || 
                       row.cliente || row.Cliente || '';
          
          return {
            ...row,
            email: String(email).trim(),
            nome: String(nome).trim(),
            emailType,
            priority,
            suggestedSubject: this.generateSubject(emailType, row),
            suggestedBody: this.generateBody(emailType, row)
          };
        });
      
      if (categorizedEmails.length === 0) {
        throw new Error('Nessuna email valida trovata nel file');
      }
      
      return {
        analysis,
        categorizedEmails,
        summary: this.generateSummary(categorizedEmails)
      };
      
    } catch (error) {
      console.error('Error analyzing Excel for emails:', error);
      throw error;
    }
  }

  generateSubject(emailType, row) {
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
  }

  generateBody(emailType, row) {
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
  }

  generateSummary(categorizedEmails) {
    const counts = categorizedEmails.reduce((acc, email) => {
      acc[email.emailType] = (acc[email.emailType] || 0) + 1;
      return acc;
    }, {});
    
    const parts = [];
    if (counts.fattura) parts.push(`${counts.fattura} fatture`);
    if (counts.sollecito) parts.push(`${counts.sollecito} solleciti`);
    if (counts.update) parts.push(`${counts.update} aggiornamenti`);
    if (counts.feedback) parts.push(`${counts.feedback} richieste feedback`);
    if (counts.standard) parts.push(`${counts.standard} email standard`);
    
    return `Ho trovato ${categorizedEmails.length} contatti: ${parts.join(', ')}`;
  }

  // Validate email
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Filter valid emails
  filterValidEmails(emails) {
    return emails.filter(item => this.validateEmail(item.email));
  }

  // Create Excel from data
  async createExcelFromData(data) {
    try {
      const wb = XLSX.utils.book_new();
      
      const wsData = [
        [data.title.toUpperCase()],
        ['Data: ' + new Date().toLocaleDateString('it-IT')],
        [''],
        data.columns,
        ...data.rows
      ];
      
      // Calculate totals for invoices and reports
      if ((data.type === 'fattura' || data.type === 'report') && data.rows.length > 0) {
        wsData.push(['']);
        
        const totals = {};
        
        data.rows.forEach((row, rowIndex) => {
          row.forEach((cell, index) => {
            const numericValue = this.extractNumericValue(cell);
            if (numericValue !== null && numericValue > 0) {
              totals[index] = (totals[index] || 0) + numericValue;
            }
          });
        });
        
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
      
      const fileName = `${data.title.replace(/\s/g, '_')}_${Date.now()}.xlsx`;
      const filePath = `${process.env.UPLOAD_PATH || './uploads'}/${fileName}`;
      
      XLSX.writeFile(wb, filePath);
      
      return {
        success: true,
        message: `Excel "${data.title}" creato con successo!`,
        fileName,
        filePath
      };
      
    } catch (error) {
      console.error('Error creating Excel:', error);
      return {
        success: false,
        message: `Errore nella creazione dell'Excel: ${error.message}`
      };
    }
  }
}

module.exports = new ExcelService();
