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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
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

          this.data = finalData;
          resolve(finalData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Errore lettura file'));
      reader.readAsArrayBuffer(file);
    });
  }

  getData(): ExcelData[] {
    return this.data;
  }

  clearData(): void {
    this.data = [];
  }

  async analyze(file: File): Promise<{ totalRecords: number; preview: ExcelData[] }> {
    const data = await this.parseExcelFile(file);
    
    return {
      totalRecords: data.length,
      preview: data.slice(0, 3) // Prime 3 righe per preview
    };
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
