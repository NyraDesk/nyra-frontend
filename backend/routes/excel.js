const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const axios = require('axios');
const upload = multer({ memory: true });

// Funzione per chiamare OpenRouter
async function callOpenRouter(prompt) {
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: "anthropic/claude-3.5-sonnet",
      messages: [
        { 
          role: "system", 
          content: "Sei un analista dati esperto. Analizza i dati Excel e fornisci insights utili." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      max_tokens: 3000
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter error:', error.response?.data || error.message);
    throw error;
  }
}

// Storage temporaneo in memoria
const excelStorage = new Map();

// Upload e parsing Excel
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    // Parsa Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    // Genera ID univoco
    const fileId = Date.now().toString();
    
    // Salva in memoria
    excelStorage.set(fileId, {
      filename: req.file.originalname,
      data: data,
      uploadDate: new Date()
    });

    res.json({
      success: true,
      fileId: fileId,
      filename: req.file.originalname,
      records: data.length,
      columns: data.length > 0 ? Object.keys(data[0]) : []
    });

  } catch (error) {
    console.error('Errore parsing Excel:', error);
    res.status(500).json({ error: 'Errore nel processare il file Excel' });
  }
});

// Analizza con AI
router.post('/analyze', async (req, res) => {
  try {
    const { fileId, query } = req.body;
    
    // Recupera dati dalla memoria
    const fileData = excelStorage.get(fileId);
    if (!fileData) {
      return res.status(404).json({ error: 'File non trovato' });
    }

    // Prepara prompt per AI
    const prompt = `
    Analizza questi dati Excel:
    Nome file: ${fileData.filename}
    Totale righe: ${fileData.data.length}
    Colonne: ${fileData.data.length > 0 ? Object.keys(fileData.data[0]).join(', ') : 'Nessuna'}
    
    DATI COMPLETI:
    ${JSON.stringify(fileData.data, null, 2)}
    
    Richiesta utente: ${query || 'Fornisci un\'analisi dettagliata con statistiche e insights'}
    
    Fornisci:
    1. Statistiche chiave
    2. Pattern identificati
    3. Suggerimenti actionable
    `;

    // Chiama OpenRouter (usa il tuo codice esistente)
    const aiResponse = await callOpenRouter(prompt);
    console.log('Backend: Lunghezza risposta AI:', aiResponse.length);

    res.json({
      success: true,
      filename: fileData.filename,
      records: fileData.data.length,
      columns: fileData.data.length > 0 ? Object.keys(fileData.data[0]) : [],
      data: fileData.data,
      aiResponse: aiResponse
    });

  } catch (error) {
    console.error('Errore analisi:', error);
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
  
  res.json({ files });
});

// Get file data
router.get('/file/:id', (req, res) => {
  const fileData = excelStorage.get(req.params.id);
  if (!fileData) {
    return res.status(404).json({ error: 'File non trovato' });
  }
  
  res.json({
    success: true,
    fileId: req.params.id,
    filename: fileData.filename,
    data: fileData.data,
    uploadDate: fileData.uploadDate
  });
});

// Delete file
router.delete('/file/:id', (req, res) => {
  const deleted = excelStorage.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'File non trovato' });
  }
  
  res.json({
    success: true,
    message: 'File eliminato con successo'
  });
});

module.exports = router;
