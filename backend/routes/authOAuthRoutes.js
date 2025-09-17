const express = require('express');
const { google } = require('googleapis');
const sqlite3 = require('sqlite3');
const path = require('path');
const router = express.Router();

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://nyra-backend-c7zi.onrender.com/auth/google/callback';

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

// In-memory token storage (in production, use database)
const tokens = new Map();

// Database setup
const dbPath = path.join(process.cwd(), 'nyra-oauth.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS google_tokens (
      user_id TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TEXT,
      scope TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Helper function to save tokens to database
function saveTokensToDatabase(userId, tokens) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO google_tokens 
      (user_id, access_token, refresh_token, expires_at, scope, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run([
      userId,
      tokens.access_token,
      tokens.refresh_token || null,
      tokens.expiry_date || null,
      tokens.scope || null
    ], function(err) {
      if (err) {
        console.error('Error saving tokens to database:', err);
        reject(err);
      } else {
        console.log('Tokens saved to database for user:', userId);
        resolve();
      }
    });
    
    stmt.finalize();
  });
}

// Helper function to get tokens from database
function getTokensFromDatabase(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM google_tokens WHERE user_id = ?',
      [userId],
      (err, row) => {
        if (err) {
          console.error('Error getting tokens from database:', err);
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

// GET /auth/google/start - initiates OAuth flow
router.get('/google/start', (req, res) => {
  try {
    const { user_id } = req.query;
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.readonly'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: user_id,
      prompt: 'consent',
      include_granted_scopes: true
    });

    console.log('Generated auth URL for user:', user_id);
    res.json({ auth_url: authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// GET /auth/google/callback - handles OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state;
    
    if (!code) {
      return res.status(400).json({ error: 'No authorization code received' });
    }

    const { tokens: tokenData } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokenData);
    
    // Save tokens for the user (both in memory and database)
    tokens.set(userId, tokenData);
    await saveTokensToDatabase(userId, tokenData);
    
    console.log('OAuth completed for user:', userId);
    
    // Send HTML that communicates with parent window and closes popup
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Success</title>
      </head>
      <body>
        <script>
          // Send message to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'nyra:google:connected',
              tokens: {
                access_token: '${tokenData.access_token}',
                refresh_token: '${tokenData.refresh_token || ''}',
                expires_at: '${tokenData.expiry_date || ''}',
                scope: '${tokenData.scope || ''}'
              },
              user_id: '${userId}'
            }, '*');
            
            // Close popup
            window.close();
          } else {
            // Fallback if no parent window
            window.location.href = 'https://nyra-frontend.vercel.app/settings?auth=success&user=${userId}';
          }
        </script>
        <p>Autenticazione completata! Chiudendo finestra...</p>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Error</title>
      </head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'nyra:google:error',
              error: '${error.message || 'Unknown error'}'
            }, '*');
            window.close();
          } else {
            window.location.href = 'https://nyra-frontend.vercel.app/settings?auth=error';
          }
        </script>
        <p>Errore di autenticazione! Chiudendo finestra...</p>
      </body>
      </html>
    `);
  }
});

// GET /auth/google/status - checks auth status
router.get('/google/status', async (req, res) => {
  try {
    const { user_id } = req.query;
    const userId = user_id;
    
    // First check memory
    const hasTokensInMemory = tokens.has(userId);
    
    // Then check database
    const dbTokens = await getTokensFromDatabase(userId);
    const hasTokensInDb = !!dbTokens;
    
    // If we have tokens in database but not in memory, load them
    if (hasTokensInDb && !hasTokensInMemory) {
      tokens.set(userId, {
        access_token: dbTokens.access_token,
        refresh_token: dbTokens.refresh_token,
        expiry_date: dbTokens.expires_at,
        scope: dbTokens.scope
      });
    }
    
    const isAuthenticated = hasTokensInMemory || hasTokensInDb;
    
    res.json({ 
      authenticated: isAuthenticated,
      user: userId,
      gmail: {
        connected: isAuthenticated,
        access_token: isAuthenticated ? (tokens.get(userId)?.access_token || dbTokens?.access_token) : null
      },
      gcal: {
        connected: isAuthenticated,
        access_token: isAuthenticated ? (tokens.get(userId)?.access_token || dbTokens?.access_token) : null
      }
    });
  } catch (error) {
    console.error('Error checking token status:', error);
    res.status(500).json({ error: 'Failed to check token status' });
  }
});

// POST /auth/google/save-tokens - save tokens endpoint
router.post('/google/save-tokens', (req, res) => {
  const { userId, tokens: tokenData } = req.body;
  tokens.set(userId, tokenData);
  res.json({ success: true });
});

// GET /auth/google/access-token - get access token (for external services)
router.get('/google/access-token', async (req, res) => {
  try {
    const { user_id, service } = req.query;
    const userId = user_id;
    
    // First check memory
    let tokenData = tokens.get(userId);
    
    // If not in memory, check database
    if (!tokenData) {
      const dbTokens = await getTokensFromDatabase(userId);
      if (dbTokens) {
        tokenData = {
          access_token: dbTokens.access_token,
          refresh_token: dbTokens.refresh_token,
          expiry_date: dbTokens.expires_at,
          scope: dbTokens.scope
        };
        tokens.set(userId, tokenData);
      }
    }
    
    if (!tokenData) {
      return res.status(404).json({ error: 'No tokens found for user' });
    }
    
    return res.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expiry_date,
      scope: tokenData.scope
    });
  } catch (error) {
    console.error('Error getting access token:', error);
    return res.status(500).json({ error: 'Failed to get access token' });
  }
});

module.exports = router;
