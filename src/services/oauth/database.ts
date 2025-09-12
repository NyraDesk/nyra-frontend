// OAuth2 Database Service for NYRA
interface GoogleToken {
  id?: number;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  token_type: string;
  scope: string;
  created_at?: string;
  updated_at?: string;
}

interface TokenAuditLog {
  id?: number;
  user_id: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  timestamp?: string;
  details?: string;
}

class OAuthDatabase {
  private dbPath: string;
  
  constructor(dbPath = 'nyra-oauth.db') {
    this.dbPath = dbPath;
  }

  async init(): Promise<void> {
    // Initialize database through IPC
    return window.electronAPI.initOAuthDatabase(this.dbPath);
  }

  async saveTokens(userId: string, tokenData: Partial<GoogleToken>): Promise<number> {
    return window.electronAPI.saveOAuthTokens(userId, tokenData);
  }

  async getTokens(userId: string): Promise<GoogleToken | null> {
    return window.electronAPI.getOAuthTokens(userId);
  }

  async updateAccessToken(userId: string, accessToken: string, expiresAt: string): Promise<boolean> {
    return window.electronAPI.updateOAuthAccessToken(userId, accessToken, expiresAt);
  }

  async revokeTokens(userId: string): Promise<boolean> {
    return window.electronAPI.revokeOAuthTokens(userId);
  }

  async logAudit(userId: string, action: string, details?: string): Promise<number> {
    return window.electronAPI.logOAuthAudit(userId, action, details);
  }

  async cleanExpiredTokens(): Promise<number> {
    return window.electronAPI.cleanExpiredOAuthTokens();
  }
}

export { OAuthDatabase, GoogleToken, TokenAuditLog };