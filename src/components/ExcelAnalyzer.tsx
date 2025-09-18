import React, { useState, useRef } from 'react';
import { ExcelResource, ExcelData } from '../mcp/excel-resource';

interface ExcelAnalyzerProps {
  onDataParsed: (data: ExcelData[]) => void;
  onAnalysisComplete: (analysis: string) => void;
}

export const ExcelAnalyzer: React.FC<ExcelAnalyzerProps> = ({
  onDataParsed,
  onAnalysisComplete
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ExcelData[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelResource = useRef(new ExcelResource());

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadedFile(file);

    try {
      const data = await excelResource.current.parseExcelFile(file);
      setParsedData(data);
      onDataParsed(data);
      
      console.log('📊 Dati Excel parsati:', data);
    } catch (error) {
      console.error('❌ Errore parsing Excel:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAnalyze = async () => {
    if (parsedData.length === 0) return;

    setIsProcessing(true);
    
    try {
      // Simula analisi AI (da integrare con OpenRouter)
      const mockAnalysis = `Analisi Excel completata:
      
📈 **Statistiche Generali:**
- Righe di dati: ${parsedData.length}
- Progetti unici: ${new Set(parsedData.map(d => d.Progetto)).size}
- Importi totali: ${parsedData.reduce((sum, d) => {
        const amount = parseFloat(d.Importo?.replace(/[€,\s]/g, '') || '0');
        return sum + amount;
      }, 0).toLocaleString('it-IT')}€

📋 **Dettagli Progetti:**
${parsedData.map((row, index) => `
${index + 1}. **${row.Nome}** (${row.Progetto})
   - Email: ${row.Email}
   - Importo: ${row.Importo}
   - Scadenza: ${row.Scadenza}
`).join('')}

✅ **Analisi completata con successo!**`;

      setAnalysis(mockAnalysis);
      onAnalysisComplete(mockAnalysis);
      
    } catch (error) {
      console.error('❌ Errore analisi:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setUploadedFile(null);
    setParsedData([]);
    setAnalysis('');
    excelResource.current.clearData();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="excel-analyzer bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">
        📊 Excel Analyzer (MCP)
      </h3>
      
      {/* File Upload */}
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
          disabled={isProcessing}
        />
      </div>

      {/* File Info */}
      {uploadedFile && (
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700">
            📁 File: <strong>{uploadedFile.name}</strong>
          </p>
          <p className="text-sm text-green-600">
            📊 Righe parsate: <strong>{parsedData.length}</strong>
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleAnalyze}
          disabled={parsedData.length === 0 || isProcessing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
            disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isProcessing ? '⏳ Analizzando...' : '🔍 Analizza'}
        </button>
        
        <button
          onClick={handleClear}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          🗑️ Pulisci
        </button>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">📋 Risultati Analisi:</h4>
          <pre className="text-sm text-blue-700 whitespace-pre-wrap">
            {analysis}
          </pre>
        </div>
      )}

      {/* MCP Resource Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 mb-1">🔧 MCP Resource Info:</h4>
        <pre className="text-xs text-gray-600">
          {JSON.stringify(excelResource.current.getResourceInfo(), null, 2)}
        </pre>
      </div>
    </div>
  );
};
