const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const axios = require('axios');

// Funzione per chiamare OpenRouter
async function callOpenRouter(prompt) {
  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
      messages: [
        { role: "system", content: "Sei un analista dati esperto. Analizza i dati Excel forniti e dai insights utili in italiano." },
        { role: "user", content: prompt }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter error:', error.response?.data || error.message);
    return "Errore nell'analisi AI: " + error.message;
  }
}

// Storage in memoria temporaneo
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Store per i file (temporaneo in memoria)
const fileStore = new Map();

// Upload file Excel
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }
    
    // PARSE EXCEL SUBITO
    const workbook = xlsx.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    const fileId = Date.now().toString();
    
    // SALVA ANCHE I DATI PARSATI
    fileStore.set(fileId, {
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      uploadTime: new Date(),
      data: data,  // AGGIUNGI QUESTO
      columns: data.length > 0 ? Object.keys(data[0]) : []  // AGGIUNGI QUESTO
    });
    
    res.json({ 
      success: true, 
      fileId: fileId,
      filename: req.file.originalname,
      records: data.length,  // AGGIUNGI QUESTO
      columns: data.length > 0 ? Object.keys(data[0]) : []  // AGGIUNGI QUESTO
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analizza file Excel
router.post('/analyze', async (req, res) => {
  try {
    const { fileId, query } = req.body;
    
    if (!fileId || !fileStore.has(fileId)) {
      return res.status(400).json({ error: 'File non trovato' });
    }
    
    const file = fileStore.get(fileId);
    
    // Prepara prompt per AI
    const prompt = `
    Analizza questi dati Excel:
    Nome file: ${file.originalName}
    Totale righe: ${file.data.length}
    Colonne: ${file.columns.join(', ')}
    
    DATI COMPLETI:
    ${JSON.stringify(file.data, null, 2)}
    
    Query dell'utente: ${query || 'Fornisci un\'analisi dettagliata con statistiche e insights'}
    
    Fornisci:
    1. Statistiche chiave
    2. Pattern identificati
    3. Suggerimenti actionable
    `;
    
    // Chiama OpenRouter
    const aiResponse = await callOpenRouter(prompt);
    
    res.json({
      success: true,
      filename: file.originalName,
      records: file.data.length,
      columns: file.columns,
      data: file.data,
      aiResponse: aiResponse
    });
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lista file
router.get('/files', (req, res) => {
  const files = Array.from(fileStore.entries()).map(([id, file]) => ({
    id: id,
    name: file.originalName,
    uploadTime: file.uploadTime
  }));
  
  res.json({ files });
});

module.exports = router;
