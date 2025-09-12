// Google OAuth2 Service for NYRA
interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_at: string;
  token_type: string;
  scope: string;
}

interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface VerificationResult {
  valid: boolean;
  user?: UserInfo;
  error?: string;
}

class GoogleAuthService {
  private scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  // Generate authorization URL
  async getAuthUrl(userId: string, state?: string): Promise<string> {
    return window.electronAPI.generateOAuthUrl(userId, state);
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string): Promise<TokenData> {
    return window.electronAPI.exchangeOAuthCode(code);
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken: string): Promise<TokenData> {
    return window.electronAPI.refreshOAuthToken(refreshToken);
  }

  // Revoke tokens
  async revokeTokens(accessToken: string): Promise<boolean> {
    return window.electronAPI.revokeOAuthTokens(accessToken);
  }

  // Verify token validity
  async verifyToken(accessToken: string): Promise<VerificationResult> {
    return window.electronAPI.verifyOAuthToken(accessToken);
  }

  // Check if token needs refresh (expires within next 5 minutes)
  needsRefresh(expiresAt: string): boolean {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const fiveMinutesFromNow = new Date(now.getTime() + (5 * 60 * 1000));
    
    return expiration <= fiveMinutesFromNow;
  }

  // Get user info from Google
  async getUserInfo(accessToken: string): Promise<UserInfo> {
    return window.electronAPI.getOAuthUserInfo(accessToken);
  }

  // Get available scopes
  getScopes(): string[] {
    return this.scopes;
  }
}

export { GoogleAuthService, TokenData, UserInfo, VerificationResult };