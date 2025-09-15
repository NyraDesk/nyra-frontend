import express, { Request, Response } from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';

// Carica le variabili d'ambiente
dotenv.config();

class OAuthServer {
  private app: express.Application;
  private server: any;
  private oauth2Client: any;
  private tokens: Map<string, any> = new Map();
  private db!: sqlite3.Database;
  
  constructor() {
    this.app = express();
    this.setupDatabase();
    this.setupOAuth2Client();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:3000', 'file://*'],
      credentials: true
    }));
    this.app.use(express.json());
  }

  private setupDatabase() {
    const dbPath = path.join(process.cwd(), 'nyra-oauth.db');
    this.db = new sqlite3.Database(dbPath);
    
    // Crea le tabelle se non esistono
    this.db.serialize(() => {
      this.db.run(`
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
      
      this.db.run(`
        CREATE TABLE IF NOT EXISTS token_audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT,
          action TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    });
  }

  private setupOAuth2Client() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'https://nyra-backend-c7zi.onrender.com/auth/google/callback'
    );
  }

  private saveTokensToDatabase(userId: string, tokens: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO google_tokens 
        (user_id, access_token, refresh_token, expires_at, scope, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run([
        userId,
        tokens.access_token,
        tokens.refresh_token,
        tokens.expiry_date,
        tokens.scope
      ], (err) => {
        if (err) {
          console.error('Error saving tokens to database:', err);
          reject(err);
        } else {
          console.log(`Tokens saved to database for user: ${userId}`);
          
          // Log audit
          this.db.run(
            'INSERT INTO token_audit_log (user_id, action) VALUES (?, ?)',
            [userId, 'tokens_saved']
          );
          
          resolve();
        }
      });
      
      stmt.finalize();
    });
  }

  private getTokensFromDatabase(userId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(
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

  private setupRoutes() {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'ok', 
        message: 'OAuth server running inside Electron',
        port: 3001
      });
    });

    // Google OAuth start
    this.app.get('/auth/google/start', (req: Request, res: Response) => {
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

        const authUrl = this.oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: scopes,
          state: user_id as string,
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

    // Google OAuth callback
    this.app.get('/auth/google/callback', async (req: Request, res: Response) => {
      try {
        const { code, state } = req.query;
        const userId = state as string;
        
        const { tokens } = await this.oauth2Client.getToken(code as string);
        this.oauth2Client.setCredentials(tokens);
        
        // Salva i token per l'utente (sia in memoria che nel database)
        this.tokens.set(userId, tokens);
        await this.saveTokensToDatabase(userId, tokens);
        
        console.log('OAuth completed for user:', userId);
        
        // Invia HTML che comunica con il parent window e chiude il popup
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>OAuth Success</title>
          </head>
          <body>
            <script>
              // Invia messaggio al parent window
              if (window.opener) {
                window.opener.postMessage({
                  type: 'nyra:google:connected',
                  tokens: {
                    access_token: '${tokens.access_token}',
                    refresh_token: '${tokens.refresh_token}',
                    expires_at: '${tokens.expiry_date}',
                    scope: '${tokens.scope}'
                  },
                  user_id: '${userId}'
                }, '*');
                
                // Chiudi il popup
                window.close();
              } else {
                // Fallback se non c'è parent window
                window.location.href = 'http://localhost:5173/settings?auth=success&user=${userId}';
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
                  error: '${error instanceof Error ? error.message : 'Unknown error'}'
                }, '*');
                window.close();
              } else {
                window.location.href = 'http://localhost:5173/settings?auth=error';
              }
            </script>
            <p>Errore di autenticazione! Chiudendo finestra...</p>
          </body>
          </html>
        `);
      }
    });

    // Get token status
    this.app.get('/auth/google/status', async (req: Request, res: Response) => {
      try {
        const { user_id } = req.query;
        const userId = user_id as string;
        
        // Prima controlla la memoria
        const hasTokensInMemory = this.tokens.has(userId);
        
        // Poi controlla il database
        const dbTokens = await this.getTokensFromDatabase(userId);
        const hasTokensInDb = !!dbTokens;
        
        // Se abbiamo token nel database ma non in memoria, caricali
        if (hasTokensInDb && !hasTokensInMemory) {
          this.tokens.set(userId, {
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
            access_token: isAuthenticated ? (this.tokens.get(userId)?.access_token || dbTokens?.access_token) : null
          },
          gcal: {
            connected: isAuthenticated,
            access_token: isAuthenticated ? (this.tokens.get(userId)?.access_token || dbTokens?.access_token) : null
          }
        });
      } catch (error) {
        console.error('Error checking token status:', error);
        res.status(500).json({ error: 'Failed to check token status' });
      }
    });

    // Save tokens endpoint
    this.app.post('/auth/google/save-tokens', (req: Request, res: Response) => {
      const { userId, tokens } = req.body;
      this.tokens.set(userId, tokens);
      res.json({ success: true });
    });

    // Get access token endpoint (for n8n)
    this.app.get('/oauth/google/access-token', async (req: Request, res: Response) => {
      try {
        const { user_id, service } = req.query;
        const userId = user_id as string;
        
        // Prima controlla la memoria
        let tokens = this.tokens.get(userId);
        
        // Se non in memoria, controlla il database
        if (!tokens) {
          const dbTokens = await this.getTokensFromDatabase(userId);
          if (dbTokens) {
            tokens = {
              access_token: dbTokens.access_token,
              refresh_token: dbTokens.refresh_token,
              expiry_date: dbTokens.expires_at,
              scope: dbTokens.scope
            };
            this.tokens.set(userId, tokens);
          }
        }
        
        if (!tokens) {
          return res.status(404).json({ error: 'No tokens found for user' });
        }
        
        return res.json({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date,
          scope: tokens.scope
        });
      } catch (error) {
        console.error('Error getting access token:', error);
        return res.status(500).json({ error: 'Failed to get access token' });
      }
    });

    // API proxy per OpenRouter (protegge la chiave API)
    this.app.post('/api/openrouter', async (req: Request, res: Response) => {
      try {
        const response = await fetch('https://nyra-backend-c7zi.onrender.com/api/ai/chat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://nyra-backend-c7zi.onrender.com',
            'X-Title': 'NYRA'
          },
          body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.json(data);
      } catch (error) {
        console.error('OpenRouter error:', error);
        res.status(500).json({ error: 'OpenRouter request failed' });
      }
    });

    // Gmail send email
    this.app.post('/api/gmail/send', async (req: Request, res: Response) => {
      try {
        const { userId, to, subject, body } = req.body;
        const tokens = this.tokens.get(userId);
        
        if (!tokens) {
          return res.status(401).json({ error: 'Not authenticated' });
        }

        this.oauth2Client.setCredentials(tokens);
        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

        const message = [
          `To: ${to}`,
          `Subject: ${subject}`,
          '',
          body
        ].join('\n');

        const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

        const result = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage
          }
        });

        return res.json({ success: true, messageId: result.data.id });
      } catch (error) {
        console.error('Gmail send error:', error);
        return res.status(500).json({ error: 'Failed to send email' });
      }
    });

    // Calendar create event
    this.app.post('/api/calendar/create', async (req: Request, res: Response) => {
      try {
        const { userId, summary, description, startTime, endTime } = req.body;
        const tokens = this.tokens.get(userId);
        
        if (!tokens) {
          return res.status(401).json({ error: 'Not authenticated' });
        }

        // Assicurati che summary contenga solo il titolo dell'evento
        let eventTitle = summary;
        if (typeof summary === 'string' && summary.length > 100) {
          // Se il summary è troppo lungo, prendi solo la prima parte
          eventTitle = summary.substring(0, 100).trim();
          // Rimuovi eventuali caratteri di fine riga o punti eccessivi
          eventTitle = eventTitle.replace(/[\r\n]+/g, ' ').replace(/\.{2,}/g, '.');
        }

        // Log per debug
        console.log('Creating calendar event:', { 
          summary: eventTitle, 
          description, 
          startTime, 
          endTime,
          originalSummaryLength: summary?.length || 0
        });

        this.oauth2Client.setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

        const event = {
          summary: eventTitle,
          description,
          start: { dateTime: startTime, timeZone: 'Europe/Rome' },
          end: { dateTime: endTime, timeZone: 'Europe/Rome' }
        };

        const result = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event
        });

        return res.json({ success: true, eventId: result.data.id });
      } catch (error) {
        console.error('Calendar error:', error);
        return res.status(500).json({ error: 'Failed to create event' });
      }
    });
  }

  start(port: number = 3001) {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, '0.0.0.0', () => {
        console.log(`OAuth server running on port ${port} inside Electron`);
        resolve(true);
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('OAuth server stopped');
    }
    if (this.db) {
      this.db.close();
      console.log('Database connection closed');
    }
  }
}

export default OAuthServer;
