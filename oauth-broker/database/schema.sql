-- Google OAuth Token Broker Database Schema
-- SQLite schema for storing user OAuth tokens by service

CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(255) NOT NULL,
    service VARCHAR(50) NOT NULL, -- 'gmail' or 'gcal'
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expiry_date DATETIME NOT NULL,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    scope TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, service)
);

-- Index for faster lookups by user_id and service
CREATE INDEX IF NOT EXISTS idx_tokens_user_service ON tokens(user_id, service);

-- Index for token expiration cleanup
CREATE INDEX IF NOT EXISTS idx_tokens_expiry_date ON tokens(expiry_date);

-- Legacy table for backward compatibility (will be migrated)
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

-- Audit log for token operations
CREATE TABLE IF NOT EXISTS token_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(255) NOT NULL,
    service VARCHAR(50),
    action VARCHAR(50) NOT NULL, -- 'created', 'refreshed', 'revoked', 'expired'
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT -- JSON for additional data
);

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_token_audit_log_user_id ON token_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_token_audit_log_timestamp ON token_audit_log(timestamp);

-- Migration script to add service column to existing token_audit_log table
-- This will be executed if the column doesn't exist
PRAGMA foreign_keys=off;

-- Check if service column exists in token_audit_log
-- If not, add it
BEGIN TRANSACTION;
    -- Create new table with service column
    CREATE TABLE IF NOT EXISTS token_audit_log_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id VARCHAR(255) NOT NULL,
        service VARCHAR(50),
        action VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        details TEXT
    );
    
    -- Copy data from old table if it exists
    INSERT INTO token_audit_log_new (id, user_id, action, ip_address, user_agent, timestamp, details)
    SELECT id, user_id, action, ip_address, user_agent, timestamp, details 
    FROM token_audit_log;
    
    -- Drop old table and rename new one
    DROP TABLE IF EXISTS token_audit_log;
    ALTER TABLE token_audit_log_new RENAME TO token_audit_log;
    
    -- Recreate indexes
    CREATE INDEX IF NOT EXISTS idx_token_audit_log_user_id ON token_audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_token_audit_log_timestamp ON token_audit_log(timestamp);
COMMIT;

PRAGMA foreign_keys=on;