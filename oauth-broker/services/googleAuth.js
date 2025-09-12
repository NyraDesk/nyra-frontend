const { google } = require('googleapis');

class GoogleAuthService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Required scopes for Gmail and Calendar access - minimal set
    this.scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly'
    ];
  }

  // Generate authorization URL
  getAuthUrl(userId, state = null) {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      include_granted_scopes: true,
      state: state || userId,
      prompt: 'consent' // Force consent to get refresh token
    });

    console.log(`Generated auth URL for user: ${userId}`);
    return authUrl;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      console.log('Successfully exchanged code for tokens');
      
      // Calculate expiration date
      const expiresAt = new Date();
      if (tokens.expiry_date) {
        expiresAt.setTime(tokens.expiry_date);
      } else {
        // Default to 1 hour if not provided
        expiresAt.setHours(expiresAt.getHours() + 1);
      }

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        token_type: tokens.token_type || 'Bearer',
        scope: tokens.scope || this.scopes.join(' ')
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      console.log('Successfully refreshed access token');

      // Calculate expiration date
      const expiresAt = new Date();
      if (credentials.expiry_date) {
        expiresAt.setTime(credentials.expiry_date);
      } else {
        // Default to 1 hour if not provided
        expiresAt.setHours(expiresAt.getHours() + 1);
      }

      return {
        access_token: credentials.access_token,
        expires_at: expiresAt.toISOString(),
        token_type: credentials.token_type || 'Bearer'
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  // Revoke tokens
  async revokeTokens(accessToken) {
    try {
      await this.oauth2Client.revokeToken(accessToken);
      console.log('Successfully revoked tokens');
      return true;
    } catch (error) {
      console.error('Error revoking tokens:', error);
      throw new Error('Failed to revoke tokens');
    }
  }

  // Verify token validity by making a test API call
  async verifyToken(accessToken) {
    try {
      this.oauth2Client.setCredentials({
        access_token: accessToken
      });

      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      
      console.log('Token verification successful');
      return {
        valid: true,
        user: userInfo.data
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // Check if token needs refresh (expires within next 5 minutes)
  needsRefresh(expiresAt) {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const fiveMinutesFromNow = new Date(now.getTime() + (5 * 60 * 1000));
    
    return expiration <= fiveMinutesFromNow;
  }

  // Get user info from Google
  async getUserInfo(accessToken) {
    try {
      this.oauth2Client.setCredentials({
        access_token: accessToken
      });

      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      
      return userInfo.data;
    } catch (error) {
      console.error('Error getting user info:', error);
      throw new Error('Failed to get user information');
    }
  }
}

module.exports = GoogleAuthService;