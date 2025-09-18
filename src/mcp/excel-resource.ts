import * as XLSX from 'xlsx';
import { MCP_CONFIG } from './config';

export interface ExcelData {
  Nome: string;
  Email: string;
  Importo: string;
  Progetto: string;
  Scadenza: string;
}

export class ExcelResource {
  private data: ExcelData[] = [];

  async parseExcelFile(file: File): Promise<ExcelData[]> {
    console.log('🔴 PARSE-EXCEL: Inizio parsing file:', file.name);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          console.log('🔴 PARSE-EXCEL: File letto, dimensione:', e.target?.result?.byteLength);
          
          const data = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: 'array' });
          console.log('🔴 PARSE-EXCEL: Workbook sheets:', workbook.SheetNames);
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          console.log('🔴 PARSE-EXCEL: Sheet selezionato:', sheetName);
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          console.log('🔴 PARSE-EXCEL: JSON data raw:', jsonData.length, 'record');
          
          // Filtra righe con "PROGETTI CLIENTI" o "Data:"
          const cleanData = jsonData.filter((row: any) => {
            const firstValue = Object.values(row)[0];
            return firstValue && 
                   !String(firstValue).includes('PROGETTI CLIENTI') &&
                   !String(firstValue).includes('Data:');
          });

          // Rimappa con nomi colonne corretti
          const finalData = cleanData.map((row: any) => ({
            Nome: row['Nome'] || row['PROGETTI CLIENTI'] || '',
            Email: row['Email'] || row['__EMPTY'] || '',  
            Importo: row['Importo'] || row['__EMPTY_1'] || '',
            Progetto: row['Progetto'] || row['__EMPTY_2'] || '',
            Scadenza: row['Scadenza'] || row['__EMPTY_3'] || ''
          })).filter((row: any) => row.Nome !== 'Nome' && row.Nome !== '');

          console.log('🔴 PARSE-EXCEL: Dati finali:', finalData.length, 'record');
          console.log('🔴 PARSE-EXCEL: Primo record finale:', finalData[0]);

          this.data = finalData;
          resolve(finalData);
        } catch (error) {
          console.error('🔴 PARSE-EXCEL ERRORE:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => {
        console.error('🔴 PARSE-EXCEL: Errore lettura file');
        reject(new Error('Errore lettura file'));
      };
      
      console.log('🔴 PARSE-EXCEL: Avvio lettura file...');
      reader.readAsArrayBuffer(file);
    });
  }

  getData(): ExcelData[] {
    return this.data;
  }

  clearData(): void {
    this.data = [];
  }

  async analyze(file: File): Promise<{ success: boolean; totalRecords: number; data: ExcelData[]; columns: string[] }> {
    console.log('🔴 EXCEL-RESOURCE: Inizio analisi file:', file.name, file.size);
    
    try {
      const data = await this.parseExcelFile(file);
      console.log('🔴 EXCEL-RESOURCE: Dati parsati:', data.length, 'record');
      console.log('🔴 EXCEL-RESOURCE: Primo record:', data[0]);
      
      const result = {
        success: true,
        totalRecords: data.length,
        data: data, // TUTTI i dati, non preview!
        columns: data.length > 0 ? Object.keys(data[0]) : []
      };
      
      console.log('🔴 EXCEL-RESOURCE: Risultato finale:', result);
      return result;
      
    } catch (error) {
      console.error('🔴 EXCEL-RESOURCE ERRORE:', error);
      throw error;
    }
  }

  getResourceInfo() {
    return {
      uri: MCP_CONFIG.resources[0].uri,
      name: MCP_CONFIG.resources[0].name,
      mimeType: MCP_CONFIG.resources[0].mimeType,
      dataRows: this.data.length
    };
  }
}
