const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class OAuthDatabase {
  constructor(dbPath = 'nyra-oauth.db') {
    this.dbPath = path.resolve(dbPath);
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      // Ensure database directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('[OAuth] Error opening database:', err);
          reject(err);
        } else {
          console.log('[OAuth] Connected to SQLite database at:', this.dbPath);
          this.createTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  async createTables() {
    const schema = `
      CREATE TABLE IF NOT EXISTS google_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        token_type VARCHAR(50) DEFAULT 'Bearer',
        scope TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_google_tokens_user_id ON google_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_google_tokens_expires_at ON google_tokens(expires_at);

      CREATE TABLE IF NOT EXISTS token_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        details TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_token_audit_log_user_id ON token_audit_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_token_audit_log_timestamp ON token_audit_log(timestamp);
    `;
    
    return new Promise((resolve, reject) => {
      this.db.exec(schema, (err) => {
        if (err) {
          console.error('[OAuth] Error creating tables:', err);
          reject(err);
        } else {
          console.log('[OAuth] Database tables created successfully');
          resolve();
        }
      });
    });
  }

  async saveTokens(userId, tokenData) {
    const { access_token, refresh_token, expires_at, token_type = 'Bearer', scope } = tokenData;
    
    const sql = `
      INSERT OR REPLACE INTO google_tokens 
      (user_id, access_token, refresh_token, expires_at, token_type, scope, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [userId, access_token, refresh_token, expires_at, token_type, scope], function(err) {
        if (err) {
          console.error('[OAuth] Error saving tokens:', err);
          reject(err);
        } else {
          console.log(`[OAuth] Tokens saved for user: ${userId}`);
          resolve(this.lastID);
        }
      });
    });
  }

  async getTokens(userId) {
    const sql = 'SELECT * FROM google_tokens WHERE user_id = ?';
    
    return new Promise((resolve, reject) => {
      this.db.get(sql, [userId], (err, row) => {
        if (err) {
          console.error('[OAuth] Error getting tokens:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async updateAccessToken(userId, accessToken, expiresAt) {
    const sql = `
      UPDATE google_tokens 
      SET access_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [accessToken, expiresAt, userId], function(err) {
        if (err) {
          console.error('[OAuth] Error updating access token:', err);
          reject(err);
        } else {
          console.log(`[OAuth] Access token updated for user: ${userId}`);
          resolve(this.changes > 0);
        }
      });
    });
  }

  async revokeTokens(userId) {
    const sql = 'DELETE FROM google_tokens WHERE user_id = ?';
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [userId], function(err) {
        if (err) {
          console.error('[OAuth] Error revoking tokens:', err);
          reject(err);
        } else {
          console.log(`[OAuth] Tokens revoked for user: ${userId}`);
          resolve(this.changes > 0);
        }
      });
    });
  }

  async logAudit(userId, action, details = null) {
    const sql = `
      INSERT INTO token_audit_log 
      (user_id, action, details)
      VALUES (?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [userId, action, details], function(err) {
        if (err) {
          console.error('[OAuth] Error logging audit:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async cleanExpiredTokens() {
    const sql = 'DELETE FROM google_tokens WHERE expires_at < CURRENT_TIMESTAMP';
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [], function(err) {
        if (err) {
          console.error('[OAuth] Error cleaning expired tokens:', err);
          reject(err);
        } else {
          console.log(`[OAuth] Cleaned ${this.changes} expired tokens`);
          resolve(this.changes);
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('[OAuth] Error closing database:', err);
        } else {
          console.log('[OAuth] Database connection closed');
        }
      });
    }
  }
}

module.exports = OAuthDatabase;