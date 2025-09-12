const TokenDatabase = require('../database/db');
const path = require('path');

async function initializeDatabase() {
  console.log('🔧 Initializing NYRA OAuth Token Database...');
  
  try {
    const dbPath = process.env.DATABASE_PATH || './database/tokens.db';
    console.log(`Database path: ${path.resolve(dbPath)}`);
    
    const tokenDB = new TokenDatabase(dbPath);
    await tokenDB.init();
    
    console.log('✅ Database initialized successfully!');
    console.log('📊 Database schema:');
    console.log('  - google_tokens: Stores OAuth tokens');
    console.log('  - token_audit_log: Tracks token operations');
    console.log('');
    console.log('🔐 Security features:');
    console.log('  - Indexed for fast lookups');
    console.log('  - Audit logging enabled');
    console.log('  - Automatic cleanup of expired tokens');
    
    tokenDB.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;