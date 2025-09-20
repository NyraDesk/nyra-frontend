import * as XLSX from 'xlsx';
import { MCP_CONFIG } from './config';

export interface ExcelData {
  [key: string]: string | number | null | undefined;
}

export class ExcelResource {
  private data: ExcelData[] = [];

  async parseExcelFile(file: File): Promise<ExcelData[]> {
    console.log('🔴 PARSE-EXCEL: Inizio parsing file:', file.name);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          console.log('🔴 PARSE-EXCEL: File letto, dimensione:', (e.target?.result as ArrayBuffer)?.byteLength);
          
          const data = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: 'array' });
          console.log('🔴 PARSE-EXCEL: Workbook sheets:', workbook.SheetNames);
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          console.log('🔴 PARSE-EXCEL: Sheet selezionato:', sheetName);
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          console.log('🔴 PARSE-EXCEL: JSON data raw:', jsonData.length, 'record');
          
          // Filtra righe con header o valori non validi
          const cleanData = jsonData.filter((row: any) => {
            const firstValue = Object.values(row)[0];
            return firstValue && 
                   !String(firstValue).includes('PROGETTI CLIENTI') &&
                   !String(firstValue).includes('Data:') &&
                   !String(firstValue).includes('Nome'); // Esclude righe header
          });

          // PARSING FLESSIBILE: Usa i campi che ci sono, metti default per quelli mancanti
          const finalData = cleanData.map((row: any) => {
            const processedRow: ExcelData = {};
            
            // Processa TUTTI i campi presenti nel file
            Object.keys(row).forEach(key => {
              const value = row[key];
              if (value !== null && value !== undefined && value !== '') {
                processedRow[key] = value;
              }
            });
            
            // Aggiungi campi con nomi standard se mancanti (per compatibilità)
            if (!processedRow['Nome'] && !processedRow['nome']) {
              processedRow['Nome'] = processedRow['PROGETTI CLIENTI'] || '';
            }
            if (!processedRow['Email'] && !processedRow['email']) {
              processedRow['Email'] = processedRow['__EMPTY'] || '';
            }
            
            // Valori default per campi opzionali
            if (!processedRow['Importo'] && !processedRow['importo']) {
              processedRow['Importo'] = 0;
            }
            if (!processedRow['Scadenza'] && !processedRow['scadenza']) {
              processedRow['Scadenza'] = 'Non specificata';
            }
            
            return processedRow;
          }).filter((row: ExcelData) => {
            // Mantieni solo righe con almeno Nome o Email
            return row['Nome'] || row['nome'] || row['Email'] || row['email'];
          });

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
