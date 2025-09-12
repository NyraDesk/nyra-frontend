// OAuth2 Token Manager for NYRA
import { OAuthDatabase } from './database';
import { GoogleAuthService } from './googleAuth';

interface TokenResponse {
  success: boolean;
  access_token?: string;
  token_type?: string;
  expires_at?: string;
  scope?: string;
  refreshed?: boolean;
  error?: string;
  requires_auth?: boolean;
}

class TokenManager {
  private db: OAuthDatabase;
  private googleAuth: GoogleAuthService;

  constructor() {
    this.db = new OAuthDatabase();
    this.googleAuth = new GoogleAuthService();
  }

  async init(): Promise<void> {
    await this.db.init();
  }

  // Get valid access token for a user (with auto-refresh)
  async getValidToken(userId: string): Promise<TokenResponse> {
    try {
      // Get tokens from database
      const tokens = await this.db.getTokens(userId);
      
      if (!tokens) {
        return {
          success: false,
          error: 'No tokens found for user',
          requires_auth: true
        };
      }

      // Check if token needs refresh
      if (this.googleAuth.needsRefresh(tokens.expires_at)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Token needs refresh for user:', userId);
        }
        
        try {
          // Refresh the access token
          const refreshedTokens = await this.googleAuth.refreshAccessToken(tokens.refresh_token);
          
          // Update tokens in database
          await this.db.updateAccessToken(
            userId,
            refreshedTokens.access_token,
            refreshedTokens.expires_at
          );
          
          // Log token refresh
          await this.db.logAudit(userId, 'token_refreshed', JSON.stringify({
            old_expires_at: tokens.expires_at,
            new_expires_at: refreshedTokens.expires_at
          }));
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Token refreshed successfully for user:', userId);
          }
          
          // Return refreshed token
          return {
            success: true,
            access_token: refreshedTokens.access_token,
            token_type: refreshedTokens.token_type,
            expires_at: refreshedTokens.expires_at,
            scope: tokens.scope,
            refreshed: true
          };
          
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
          
          // Log refresh failure
          await this.db.logAudit(userId, 'refresh_failed', JSON.stringify({
            error: refreshError.message
          }));
          
          // If refresh fails, the user needs to re-authenticate
          return {
            success: false,
            error: 'Token refresh failed',
            requires_auth: true
          };
        }
      }
      
      // Token is still valid, return current token
      const now = new Date();
      const expiresAt = new Date(tokens.expires_at);
      
      if (now < expiresAt) {
        // Log token access
        await this.db.logAudit(userId, 'token_accessed');
        
        return {
          success: true,
          access_token: tokens.access_token,
          token_type: tokens.token_type,
          expires_at: tokens.expires_at,
          scope: tokens.scope,
          refreshed: false
        };
      }
      
      // Token is expired and couldn't be refreshed
      return {
        success: false,
        error: 'Token expired and could not be refreshed',
        requires_auth: true
      };

    } catch (error) {
      console.error('Error in getValidToken:', error);
      
      // Log error
      await this.db.logAudit(userId, 'token_error', JSON.stringify({
        error: error.message
      }));
      
      return {
        success: false,
        error: 'Internal error retrieving token'
      };
    }
  }

  // Start OAuth flow
  async startOAuthFlow(userId: string): Promise<string> {
    try {
      const authUrl = await this.googleAuth.getAuthUrl(userId);
      
      // Log auth start
      await this.db.logAudit(userId, 'auth_started');
      
      return authUrl;
    } catch (error) {
      console.error('Error starting OAuth flow:', error);
      throw error;
    }
  }

  // Handle OAuth callback
  async handleOAuthCallback(code: string, state: string): Promise<TokenResponse> {
    try {
      const userId = state; // Using state as user_id
      
      // Exchange authorization code for tokens
      const tokenData = await this.googleAuth.exchangeCodeForTokens(code);
      
      // Save tokens to database
      await this.db.saveTokens(userId, tokenData);
      
      // Log successful authentication
      await this.db.logAudit(userId, 'tokens_created', JSON.stringify({
        scope: tokenData.scope
      }));

      console.log(`OAuth callback successful for user: ${userId}`);

      return {
        success: true,
        access_token: tokenData.access_token,
        expires_at: tokenData.expires_at,
        token_type: tokenData.token_type,
        scope: tokenData.scope
      };

    } catch (error) {
      console.error('Error in OAuth callback:', error);
      
      if (state) {
        await this.db.logAudit(state, 'auth_failed', JSON.stringify({
          error: error.message
        }));
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Revoke user tokens
  async revokeUserTokens(userId: string): Promise<boolean> {
    try {
      // Get current tokens
      const tokens = await this.db.getTokens(userId);
      
      if (!tokens) {
        return false;
      }

      // Revoke tokens with Google
      try {
        await this.googleAuth.revokeTokens(tokens.access_token);
      } catch (revokeError) {
        console.warn('Warning: Failed to revoke tokens with Google:', revokeError.message);
        // Continue with local deletion even if remote revocation fails
      }

      // Delete tokens from database
      await this.db.revokeTokens(userId);
      
      // Log revocation
      await this.db.logAudit(userId, 'tokens_revoked');

      return true;

    } catch (error) {
      console.error('Error revoking tokens:', error);
      return false;
    }
  }

  // Check authentication status
  async getAuthStatus(userId: string): Promise<{
    authenticated: boolean;
    expires_at?: string;
    expired?: boolean;
    scope?: string;
    created_at?: string;
    updated_at?: string;
  }> {
    try {
      const tokens = await this.db.getTokens(userId);
      
      if (!tokens) {
        return { authenticated: false };
      }

      // Check if tokens are expired
      const now = new Date();
      const expiresAt = new Date(tokens.expires_at);
      const isExpired = now >= expiresAt;
      
      return {
        authenticated: !isExpired,
        expires_at: tokens.expires_at,
        expired: isExpired,
        scope: tokens.scope,
        created_at: tokens.created_at,
        updated_at: tokens.updated_at
      };

    } catch (error) {
      console.error('Error checking auth status:', error);
      return { authenticated: false };
    }
  }

  // Verify token with Google API
  async verifyToken(userId: string): Promise<{
    valid: boolean;
    user_info?: any;
    error?: string;
  }> {
    try {
      const tokens = await this.db.getTokens(userId);
      
      if (!tokens) {
        return { valid: false, error: 'No tokens found' };
      }

      const verification = await this.googleAuth.verifyToken(tokens.access_token);
      
      // Log verification
      await this.db.logAudit(userId, 'token_verified', JSON.stringify({
        valid: verification.valid,
        error: verification.error || null
      }));
      
      return {
        valid: verification.valid,
        user_info: verification.user,
        error: verification.error
      };

    } catch (error) {
      console.error('Error verifying token:', error);
      return { valid: false, error: error.message };
    }
  }

  // Clean up expired tokens
  async cleanupExpiredTokens(): Promise<number> {
    try {
      return await this.db.cleanExpiredTokens();
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }
}

// Singleton instance
const tokenManager = new TokenManager();

export { TokenManager, TokenResponse, tokenManager };