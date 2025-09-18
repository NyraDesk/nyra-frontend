const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const upload = multer({ memory: true });

// Storage temporaneo in memoria
const excelStorage = new Map();

// Upload e parsing Excel
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    console.log('📊 Excel upload:', req.file.originalname, req.file.size, 'bytes');

    // Parsa Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log('📊 Excel parsed:', data.length, 'records');

    // Genera ID univoco
    const fileId = Date.now().toString();
    
    // Salva in memoria
    excelStorage.set(fileId, {
      filename: req.file.originalname,
      data: data,
      uploadDate: new Date()
    });

    console.log('📊 Excel saved with ID:', fileId);

    res.json({
      success: true,
      fileId: fileId,
      filename: req.file.originalname,
      records: data.length,
      columns: data.length > 0 ? Object.keys(data[0]) : []
    });

  } catch (error) {
    console.error('❌ Errore parsing Excel:', error);
    res.status(500).json({ error: 'Errore nel processare il file Excel' });
  }
});

// Analizza con AI
router.post('/analyze', async (req, res) => {
  try {
    const { fileId, query } = req.body;
    
    console.log('🤖 Analisi richiesta per fileId:', fileId, 'query:', query);
    
    // Recupera dati dalla memoria
    const fileData = excelStorage.get(fileId);
    if (!fileData) {
      return res.status(404).json({ error: 'File non trovato' });
    }

    console.log('🤖 Dati trovati:', fileData.data.length, 'records');

    // Prepara prompt per AI
    const prompt = `
Analizza questi dati Excel:
${JSON.stringify(fileData.data)}

Richiesta utente: ${query}

Rispondi in modo professionale e dettagliato.
Se chiede "analizza", fai un'analisi completa con:
- Totale record
- Statistiche rilevanti 
- Pattern identificati
- Suggerimenti utili

Se chiede qualcosa di specifico, rispondi SOLO a quello.
Usa un linguaggio professionale ma amichevole.`;

    console.log('🤖 Invio prompt a OpenRouter...');

    // Chiama OpenRouter (usa il tuo codice esistente)
    const { getResponse } = require('../services/openrouter');
    const aiResponse = await getResponse(prompt);

    console.log('🤖 Risposta AI ricevuta:', aiResponse ? 'OK' : 'ERROR');

    res.json({
      success: true,
      analysis: aiResponse,
      recordsAnalyzed: fileData.data.length
    });

  } catch (error) {
    console.error('❌ Errore analisi:', error);
    res.status(500).json({ error: 'Errore nell\'analisi' });
  }
});

// Lista file caricati
router.get('/files', (req, res) => {
  const files = Array.from(excelStorage.entries()).map(([id, data]) => ({
    id,
    filename: data.filename,
    records: data.data.length,
    uploadDate: data.uploadDate
  }));
  
  console.log('📋 Lista file richiesta:', files.length, 'file');
  
  res.json({ files });
});

// Get file data by ID
router.get('/file/:fileId', (req, res) => {
  const { fileId } = req.params;
  const fileData = excelStorage.get(fileId);
  
  if (!fileData) {
    return res.status(404).json({ error: 'File non trovato' });
  }
  
  res.json({
    success: true,
    filename: fileData.filename,
    data: fileData.data,
    uploadDate: fileData.uploadDate
  });
});

// Delete file
router.delete('/file/:fileId', (req, res) => {
  const { fileId } = req.params;
  
  if (excelStorage.has(fileId)) {
    excelStorage.delete(fileId);
    console.log('🗑️ File eliminato:', fileId);
    res.json({ success: true, message: 'File eliminato' });
  } else {
    res.status(404).json({ error: 'File non trovato' });
  }
});

module.exports = router;
