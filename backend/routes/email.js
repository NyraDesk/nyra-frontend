const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const openrouterService = require('../services/openrouter');
const gmailService = require('../services/gmail');
const excelService = require('../services/excel');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: process.env.UPLOAD_PATH || './uploads',
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed'), false);
    }
  }
});

// POST /api/email/generate - Generate email with AI
router.post('/generate', async (req, res) => {
  try {
    const { prompt, context, emailType } = req.body;

    if (!prompt) {
      return res.status(400).json({ 
        error: 'Prompt is required' 
      });
    }

    const aiPrompt = `
      Genera un'email professionale basata su questa richiesta: "${prompt}"
      
      ${context ? `Contesto aggiuntivo: ${context}` : ''}
      ${emailType ? `Tipo email: ${emailType}` : ''}
      
      Rispondi SOLO con un JSON valido:
      {
        "subject": "Oggetto dell'email",
        "body": "Corpo dell'email formattato",
        "recipient": "destinatario@email.com",
        "type": "tipo_email",
        "priority": "alta|normale|bassa"
      }
      
      Regole:
      - Usa un tono professionale ma cordiale
      - Includi sempre un saluto appropriato
      - Struttura il contenuto in paragrafi chiari
      - Termina con una chiusura professionale
      - Se manca il destinatario, usa "destinatario@email.com"
    `;

    const response = await openrouterService.getResponse([
      { role: 'system', content: 'Sei un assistente per la generazione di email professionali. Rispondi SOLO in JSON valido.' },
      { role: 'user', content: aiPrompt }
    ]);

    const emailData = JSON.parse(response);

    res.json({
      success: true,
      email: emailData
    });

  } catch (error) {
    console.error('Email generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate email',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// POST /api/email/send - Send email via Gmail
router.post('/send', async (req, res) => {
  try {
    const { to, subject, body, accessToken } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ 
        error: 'To, subject, and body are required' 
      });
    }

    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Gmail access token is required' 
      });
    }

    const emailData = {
      to,
      subject,
      body
    };

    const result = await gmailService.sendEmail(emailData, accessToken);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.id
    });

  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// POST /api/email/parse-excel - Parse Excel file for email data
router.post('/parse-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Excel file is required' 
      });
    }

    const filePath = req.file.path;
    const analysis = await excelService.analyzeExcelForEmails(filePath);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      analysis: analysis.analysis,
      emails: analysis.categorizedEmails,
      summary: analysis.summary,
      totalEmails: analysis.categorizedEmails.length
    });

  } catch (error) {
    console.error('Excel parsing error:', error);
    
    // Clean up file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    }

    res.status(500).json({ 
      error: 'Failed to parse Excel file',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// POST /api/email/bulk-generate - Generate multiple emails from Excel data
router.post('/bulk-generate', async (req, res) => {
  try {
    const { emails, template } = req.body;

    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ 
        error: 'Emails array is required' 
      });
    }

    const generatedEmails = [];

    for (const emailData of emails) {
      try {
        const prompt = template 
          ? template.replace(/\{\{(\w+)\}\}/g, (match, key) => emailData[key] || match)
          : `Genera email per ${emailData.nome || emailData.name || 'cliente'}`;

        const aiPrompt = `
          Genera un'email personalizzata basata su questi dati:
          ${JSON.stringify(emailData, null, 2)}
          
          Prompt: ${prompt}
          
          Rispondi SOLO con JSON:
          {
            "subject": "Oggetto personalizzato",
            "body": "Corpo email personalizzato",
            "recipient": "${emailData.email}",
            "type": "${emailData.emailType || 'standard'}",
            "priority": "${emailData.priority || 'normale'}"
          }
        `;

        const response = await openrouterService.getResponse([
          { role: 'system', content: 'Genera email personalizzate. Rispondi SOLO in JSON valido.' },
          { role: 'user', content: aiPrompt }
        ]);

        const generatedEmail = JSON.parse(response);
        generatedEmails.push({
          ...emailData,
          generated: generatedEmail
        });

      } catch (emailError) {
        console.error(`Error generating email for ${emailData.email}:`, emailError);
        generatedEmails.push({
          ...emailData,
          error: 'Failed to generate email'
        });
      }
    }

    res.json({
      success: true,
      generatedEmails,
      totalGenerated: generatedEmails.filter(e => !e.error).length,
      totalErrors: generatedEmails.filter(e => e.error).length
    });

  } catch (error) {
    console.error('Bulk email generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate bulk emails',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

module.exports = router;
