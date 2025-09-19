const XLSX = require('xlsx');

// Crea dati di test
const testData = [
  { Nome: 'Mario Rossi', Email: 'mario.rossi@email.com', Importo: 1500, Progetto: 'Sito Web', Scadenza: '2024-12-31' },
  { Nome: 'Giulia Bianchi', Email: 'giulia.bianchi@email.com', Importo: 2300, Progetto: 'App Mobile', Scadenza: '2024-11-15' },
  { Nome: 'Luca Verdi', Email: 'luca.verdi@email.com', Importo: 800, Progetto: 'Logo Design', Scadenza: '2024-10-20' },
  { Nome: 'Anna Neri', Email: 'anna.neri@email.com', Importo: 3200, Progetto: 'E-commerce', Scadenza: '2024-12-05' },
  { Nome: 'Paolo Blu', Email: 'paolo.blu@email.com', Importo: 1200, Progetto: 'SEO', Scadenza: '2024-11-30' }
];

// Crea workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(testData);

// Aggiungi il worksheet al workbook
XLSX.utils.book_append_sheet(wb, ws, 'Progetti');

// Salva il file
XLSX.writeFile(wb, 'Progetti_Clienti_17570814950501.xlsx');

console.log('✅ File Excel di test creato: Progetti_Clienti_17570814950501.xlsx');
