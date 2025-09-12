const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class TokenDatabase {
  constructor(dbPath = './database/tokens.db') {
    this.dbPath = dbPath;
    this.db = null;
    this.init();
  }

  async init() {
    // Ensure database directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  async createTables() {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    
    return new Promise((resolve, reject) => {
      this.db.exec(schema, (err) => {
        if (err) {
          console.error('Error creating tables:', err);
          reject(err);
        } else {
          console.log('Database tables created successfully');
          resolve();
        }
      });
    });
  }

  // Save tokens for a specific service (gmail or gcal)
  async saveTokens(userId, service, tokenData) {
    const { access_token, refresh_token, expiry_date, token_type = 'Bearer', scope } = tokenData;
    
    const sql = `
      INSERT OR REPLACE INTO tokens 
      (user_id, service, access_token, refresh_token, expiry_date, token_type, scope, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [userId, service, access_token, refresh_token, expiry_date, token_type, scope], function(err) {
        if (err) {
          console.error('Error saving tokens:', err);
          reject(err);
        } else {
          console.log(`[DB] Tokens saved for user: ${userId}, service: ${service}`);
          console.log(`[DB] - access_token: ${access_token ? access_token.substring(0, 20) + '...' : 'null'}`);
          console.log(`[DB] - refresh_token: ${refresh_token ? refresh_token.substring(0, 20) + '...' : 'null'}`);
          console.log(`[DB] - expiry_date: ${expiry_date}`);
          console.log(`[DB] - scope: ${scope}`);
          resolve(this.lastID);
        }
      });
    });
  }

  // Get tokens for a specific service
  async getTokens(userId, service) {
    const sql = 'SELECT * FROM tokens WHERE user_id = ? AND service = ?';
    
    return new Promise((resolve, reject) => {
      this.db.get(sql, [userId, service], (err, row) => {
        if (err) {
          console.error('Error getting tokens:', err);
          reject(err);
        } else {
          if (row) {
            console.log(`[DB] Retrieved tokens for user: ${userId}, service: ${service}`);
            console.log(`[DB] - expiry_date: ${row.expiry_date}`);
            console.log(`[DB] - scope: ${row.scope}`);
          } else {
            console.log(`[DB] No tokens found for user: ${userId}, service: ${service}`);
          }
          resolve(row);
        }
      });
    });
  }

  // Get all tokens for a user (for status check)
  async getAllUserTokens(userId) {
    const sql = 'SELECT * FROM tokens WHERE user_id = ?';
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, [userId], (err, rows) => {
        if (err) {
          console.error('Error getting all user tokens:', err);
          reject(err);
        } else {
          console.log(`[DB] Retrieved ${rows.length} token records for user: ${userId}`);
          resolve(rows);
        }
      });
    });
  }

  // Legacy method for backward compatibility
  async saveGoogleTokens(userId, tokenData) {
    const { access_token, refresh_token, expires_at, token_type = 'Bearer', scope } = tokenData;
    
    const sql = `
      INSERT OR REPLACE INTO google_tokens 
      (user_id, access_token, refresh_token, expires_at, token_type, scope, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [userId, access_token, refresh_token, expires_at, token_type, scope], function(err) {
        if (err) {
          console.error('Error saving legacy Google tokens:', err);
          reject(err);
        } else {
          console.log(`[DB] Legacy tokens saved for user: ${userId}`);
          resolve(this.lastID);
        }
      });
    });
  }

  // Legacy method for backward compatibility
  async getGoogleTokens(userId) {
    const sql = 'SELECT * FROM google_tokens WHERE user_id = ?';
    
    return new Promise((resolve, reject) => {
      this.db.get(sql, [userId], (err, row) => {
        if (err) {
          console.error('Error getting legacy Google tokens:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async updateAccessToken(userId, service, accessToken, expiryDate) {
    const sql = `
      UPDATE tokens 
      SET access_token = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND service = ?
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [accessToken, expiryDate, userId, service], function(err) {
        if (err) {
          console.error('Error updating access token:', err);
          reject(err);
        } else {
          console.log(`Access token updated for user: ${userId}, service: ${service}`);
          resolve(this.changes > 0);
        }
      });
    });
  }

  async revokeTokens(userId, service) {
    const sql = 'DELETE FROM tokens WHERE user_id = ? AND service = ?';
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [userId, service], (err) => {
        if (err) {
          console.error('Error revoking tokens:', err);
          reject(err);
        } else {
          console.log(`Tokens revoked for user: ${userId}, service: ${service}`);
          resolve(true);
        }
      });
    });
  }

  async logAudit(userId, action, ipAddress, userAgent, details = null, service = null) {
    const sql = `
      INSERT INTO token_audit_log 
      (user_id, service, action, ip_address, user_agent, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [userId, service, action, ipAddress, userAgent, details], function(err) {
        if (err) {
          console.error('Error logging audit:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async cleanExpiredTokens() {
    const sql = 'DELETE FROM tokens WHERE expiry_date < CURRENT_TIMESTAMP';
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [], function(err) {
        if (err) {
          console.error('Error cleaning expired tokens:', err);
          reject(err);
        } else {
          console.log(`Cleaned ${this.changes} expired tokens`);
          resolve(this.changes);
        }
      });
    });
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Error closing database:', err);
          } else {
            console.log('Database connection closed');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = TokenDatabase;