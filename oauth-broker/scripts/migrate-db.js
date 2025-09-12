#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path
const dbPath = process.env.DATABASE_PATH || './database/tokens.db';

console.log('🔄 Starting database migration...');
console.log(`📁 Database path: ${dbPath}`);

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`📁 Created database directory: ${dbDir}`);
}

// Open database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database');
  
  // Start migration
  migrateDatabase();
});

async function migrateDatabase() {
  try {
    console.log('\n🔍 Checking current database schema...');
    
    // Check if service column exists in token_audit_log
    const hasServiceColumn = await checkServiceColumn();
    
    if (hasServiceColumn) {
      console.log('✅ Service column already exists in token_audit_log');
    } else {
      console.log('⚠️  Service column missing in token_audit_log, adding it...');
      await addServiceColumn();
    }
    
    // Check if tokens table exists and has correct structure
    await ensureTokensTable();
    
    console.log('\n✅ Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
      } else {
        console.log('🔒 Database connection closed');
      }
      process.exit(0);
    });
  }
}

function checkServiceColumn() {
  return new Promise((resolve, reject) => {
    db.get("PRAGMA table_info(token_audit_log)", (err, rows) => {
      if (err) {
        // Table doesn't exist, so no service column
        resolve(false);
        return;
      }
      
      db.all("PRAGMA table_info(token_audit_log)", (err, columns) => {
        if (err) {
          reject(err);
          return;
        }
        
        const hasService = columns.some(col => col.name === 'service');
        resolve(hasService);
      });
    });
  });
}

function addServiceColumn() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Adding service column to token_audit_log...');
    
    // Create new table with service column
    const createNewTable = `
      CREATE TABLE token_audit_log_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(255) NOT NULL,
        service VARCHAR(50),
        action VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        details TEXT
      )
    `;
    
    db.run(createNewTable, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('✅ Created new token_audit_log table with service column');
      
      // Copy data from old table if it exists
      db.run("INSERT INTO token_audit_log_new (id, user_id, action, ip_address, user_agent, timestamp, details) SELECT id, user_id, action, ip_address, user_agent, timestamp, details FROM token_audit_log", (err) => {
        if (err) {
          // Old table doesn't exist, that's fine
          console.log('ℹ️  No existing audit log data to migrate');
        } else {
          console.log('✅ Migrated existing audit log data');
        }
        
        // Drop old table and rename new one
        db.run("DROP TABLE IF EXISTS token_audit_log", (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          db.run("ALTER TABLE token_audit_log_new RENAME TO token_audit_log", (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            console.log('✅ Renamed new table to token_audit_log');
            
            // Recreate indexes
            db.run("CREATE INDEX IF NOT EXISTS idx_token_audit_log_user_id ON token_audit_log(user_id)", (err) => {
              if (err) {
                reject(err);
                return;
              }
              
              db.run("CREATE INDEX IF NOT EXISTS idx_token_audit_log_timestamp ON token_audit_log(timestamp)", (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                
                console.log('✅ Recreated indexes');
                resolve();
              });
            });
          });
        });
      });
    });
  });
}

function ensureTokensTable() {
  return new Promise((resolve, reject) => {
    console.log('🔍 Ensuring tokens table exists with correct structure...');
    
    // Check if tokens table exists
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='tokens'", (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!row) {
        console.log('⚠️  Tokens table does not exist, creating it...');
        createTokensTable();
      } else {
        console.log('✅ Tokens table exists');
        resolve();
      }
    });
  });
}

function createTokensTable() {
  return new Promise((resolve, reject) => {
    const createTable = `
      CREATE TABLE tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(255) NOT NULL,
        service VARCHAR(50) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expiry_date DATETIME NOT NULL,
        token_type VARCHAR(50) DEFAULT 'Bearer',
        scope TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, service)
      )
    `;
    
    db.run(createTable, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log('✅ Created tokens table');
      
      // Create indexes
      db.run("CREATE INDEX IF NOT EXISTS idx_tokens_user_service ON tokens(user_id, service)", (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        db.run("CREATE INDEX IF NOT EXISTS idx_tokens_expiry_date ON tokens(expiry_date)", (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          console.log('✅ Created tokens table indexes');
          resolve();
        });
      });
    });
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️  Migration interrupted by user');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Migration terminated');
  db.close();
  process.exit(0);
});
