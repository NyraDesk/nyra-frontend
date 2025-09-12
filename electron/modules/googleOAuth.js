const { BrowserWindow, shell } = require('electron');

class GoogleOAuthService {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'nyra://oauth/callback';
    
    // Required scopes for Gmail and Calendar access
    this.scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose', 
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];
  }

  // Generate authorization URL
  generateAuthUrl(userId, state = null) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: state || userId,
      include_granted_scopes: 'true'
    });

    const authUrl = `https://accounts.google.com/oauth2/auth?${params.toString()}`;
    console.log(`[OAuth] Generated auth URL for user: ${userId}`);
    return authUrl;
  }

  // Open OAuth flow in system browser or new window
  async startOAuthFlow(userId, useSystemBrowser = true) {
    const authUrl = this.generateAuthUrl(userId);
    
    if (useSystemBrowser) {
      // Open in system browser
      await shell.openExternal(authUrl);
      console.log('[OAuth] Opened OAuth flow in system browser');
      return { success: true, url: authUrl, method: 'system_browser' };
    } else {
      // Open in Electron window
      return this.openOAuthWindow(authUrl, userId);
    }
  }

  // Open OAuth in Electron window
  async openOAuthWindow(authUrl, userId) {
    return new Promise((resolve, reject) => {
      const oauthWindow = new BrowserWindow({
        width: 600,
        height: 700,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        },
        title: 'NYRA - Google Authorization',
        modal: true,
        show: false
      });

      oauthWindow.loadURL(authUrl);
      
      oauthWindow.once('ready-to-show', () => {
        oauthWindow.show();
      });

      // Handle navigation to catch the callback
      oauthWindow.webContents.on('will-redirect', (event, navigationUrl) => {
        this.handleOAuthCallback(navigationUrl, resolve, reject, oauthWindow);
      });

      oauthWindow.webContents.on('did-navigate', (event, navigationUrl) => {
        this.handleOAuthCallback(navigationUrl, resolve, reject, oauthWindow);
      });

      oauthWindow.on('closed', () => {
        reject(new Error('OAuth window was closed by user'));
      });

      console.log(`[OAuth] Opened OAuth window for user: ${userId}`);
    });
  }

  // Handle OAuth callback URL
  handleOAuthCallback(url, resolve, reject, oauthWindow) {
    if (url.startsWith(this.redirectUri)) {
      const urlParams = new URL(url);
      const code = urlParams.searchParams.get('code');
      const error = urlParams.searchParams.get('error');
      const state = urlParams.searchParams.get('state');

      oauthWindow.close();

      if (error) {
        reject(new Error(`OAuth error: ${error}`));
        return;
      }

      if (code) {
        resolve({
          success: true,
          code,
          state,
          method: 'electron_window'
        });
        return;
      }

      reject(new Error('No authorization code received'));
    }
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code) {
    try {
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri
      });

      const fetch = (await import('node-fetch')).default;
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${data.error_description || data.error}`);
      }

      console.log('[OAuth] Successfully exchanged code for tokens');
      
      // Calculate expiration date
      const expiresAt = new Date();
      if (data.expires_in) {
        expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);
      } else {
        // Default to 1 hour if not provided
        expiresAt.setHours(expiresAt.getHours() + 1);
      }

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt.toISOString(),
        token_type: data.token_type || 'Bearer',
        scope: data.scope || this.scopes.join(' ')
      };
    } catch (error) {
      console.error('[OAuth] Error exchanging code for tokens:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken) {
    try {
      const tokenUrl = 'https://oauth2.googleapis.com/token';
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      const fetch = (await import('node-fetch')).default;
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
      }
      
      console.log('[OAuth] Successfully refreshed access token');

      // Calculate expiration date
      const expiresAt = new Date();
      if (data.expires_in) {
        expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);
      } else {
        // Default to 1 hour if not provided
        expiresAt.setHours(expiresAt.getHours() + 1);
      }

      return {
        access_token: data.access_token,
        expires_at: expiresAt.toISOString(),
        token_type: data.token_type || 'Bearer'
      };
    } catch (error) {
      console.error('[OAuth] Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  // Revoke tokens
  async revokeTokens(accessToken) {
    try {
      const revokeUrl = `https://oauth2.googleapis.com/revoke?token=${accessToken}`;
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      });

      if (response.ok) {
        console.log('[OAuth] Successfully revoked tokens');
        return true;
      } else {
        throw new Error(`Token revocation failed: ${response.status}`);
      }
    } catch (error) {
      console.error('[OAuth] Error revoking tokens:', error);
      throw new Error('Failed to revoke tokens');
    }
  }

  // Verify token validity by making a test API call
  async verifyToken(accessToken) {
    try {
      const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const userInfo = await response.json();
        console.log('[OAuth] Token verification successful');
        
        return {
          valid: true,
          user: userInfo
        };
      } else {
        console.log('[OAuth] Token verification failed');
        return {
          valid: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      console.error('[OAuth] Token verification failed:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // Get user info from Google
  async getUserInfo(accessToken) {
    try {
      const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const userInfo = await response.json();
        return userInfo;
      } else {
        throw new Error(`Failed to get user info: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('[OAuth] Error getting user info:', error);
      throw new Error('Failed to get user information');
    }
  }

  // Check if token needs refresh (expires within next 5 minutes)
  needsRefresh(expiresAt) {
    const now = new Date();
    const expiration = new Date(expiresAt);
    const fiveMinutesFromNow = new Date(now.getTime() + (5 * 60 * 1000));
    
    return expiration <= fiveMinutesFromNow;
  }
}

module.exports = GoogleOAuthService;