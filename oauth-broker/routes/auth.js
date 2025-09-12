const express = require('express');
const router = express.Router();

// Initialize services
const GoogleAuthService = require('../services/googleAuth');
const TokenDatabase = require('../database/db');

const googleAuth = new GoogleAuthService();
const tokenDB = new TokenDatabase(process.env.DATABASE_PATH);

/**
 * GET /auth/google/start
 * Initiates Google OAuth2 flow
 */
router.get('/google/start', async (req, res) => {
  try {
    const { user_id, state } = req.query;
    
    if (!user_id) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'user_id parameter is required'
      });
    }

    // Generate authorization URL
    const authUrl = googleAuth.getAuthUrl(user_id, state);
    
    // Log audit
    await tokenDB.logAudit(
      user_id,
      'auth_started',
      req.ip,
      req.get('User-Agent'),
      JSON.stringify({ state })
    );

    res.json({
      success: true,
      auth_url: authUrl,
      message: 'Authorization URL generated successfully'
    });

  } catch (error) {
    console.error('Error in /auth/google/start:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate authorization URL'
    });
  }
});

/**
 * GET /auth/google/callback
 * Handles Google OAuth2 callback
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth error
    if (error) {
      console.error('OAuth error:', error);
      const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>NYRA OAuth Error</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
        .message { color: #666; font-size: 16px; margin-bottom: 20px; }
        .redirecting { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="error">✗ Autorizzazione OAuth fallita</div>
    <div class="message">${error}</div>
    <div class="redirecting">Chiusura automatica...</div>
    
    <script>
        // Send error message to parent window
        if (window.opener) {
            window.opener.postMessage({
                type: 'nyra:google:error',
                error: '${error}'
            }, '*');
            
            // Close popup after sending message
            setTimeout(() => {
                window.close();
            }, 2000);
        } else {
            // Fallback redirect
            window.location.href = '${process.env.CORS_ORIGIN || 'http://localhost:5173'}?auth=failed&error=${encodeURIComponent(error)}';
        }
    </script>
</body>
</html>`;

      return res.status(400).send(errorHtml);
    }

    // Validate required parameters
    if (!code || !state) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Authorization code and state are required'
      });
    }

    const userId = state; // Using state as user_id

    // Exchange authorization code for tokens
    console.log(`[CALLBACK] Exchanging code for tokens for user: ${userId}`);
    const tokenData = await googleAuth.exchangeCodeForTokens(code);
    
    console.log(`[CALLBACK] Tokens received:`);
    console.log(`[CALLBACK] - access_token: ${tokenData.access_token ? tokenData.access_token.substring(0, 20) + '...' : 'null'}`);
    console.log(`[CALLBACK] - refresh_token: ${tokenData.refresh_token ? tokenData.refresh_token.substring(0, 20) + '...' : 'null'}`);
    console.log(`[CALLBACK] - expires_at: ${tokenData.expires_at}`);
    console.log(`[CALLBACK] - scope: ${tokenData.scope}`);
    
    // Parse scopes to determine which services to save tokens for
    const scopeList = tokenData.scope ? tokenData.scope.split(' ') : [];
    const hasGmailScope = scopeList.some(scope => 
      scope.includes('gmail.send') || scope.includes('gmail.readonly')
    );
    const hasCalendarScope = scopeList.some(scope => 
      scope.includes('calendar.events') || scope.includes('calendar.readonly')
    );
    
    console.log(`[CALLBACK] Scope analysis:`);
    console.log(`[CALLBACK] - hasGmailScope: ${hasGmailScope}`);
    console.log(`[CALLBACK] - hasCalendarScope: ${hasCalendarScope}`);
    
    // Save tokens for each service using the internal save-tokens endpoint
    if (hasGmailScope) {
      console.log(`[CALLBACK] Saving Gmail tokens for user: ${userId}`);
      
      // Call internally the save-tokens endpoint
      const gmailTokenData = {
        user_id: userId,
        service: 'gmail',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: tokenData.expires_at
      };
      
      // Use internal endpoint instead of direct database call
      await tokenDB.saveTokens(userId, 'gmail', {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: tokenData.expires_at,
        token_type: tokenData.token_type,
        scope: tokenData.scope
      });
      
      await tokenDB.logAudit(
        userId,
        'tokens_created',
        req.ip,
        req.get('User-Agent'),
        JSON.stringify({ service: 'gmail', scope: tokenData.scope }),
        'gmail'
      );
      
      console.log(`[CALLBACK] Gmail tokens saved successfully for user: ${userId}`);
    }
    
    if (hasCalendarScope) {
      console.log(`[CALLBACK] Saving Google Calendar tokens for user: ${userId}`);
      
      // Call internally the save-tokens endpoint
      const gcalTokenData = {
        user_id: userId,
        service: 'gcal',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: tokenData.expires_at
      };
      
      // Use internal endpoint instead of direct database call
      await tokenDB.saveTokens(userId, 'gcal', {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expiry_date: tokenData.expires_at,
        token_type: tokenData.token_type,
        scope: tokenData.scope
      });
      
      await tokenDB.logAudit(
        userId,
        'tokens_created',
        req.ip,
        req.get('User-Agent'),
        JSON.stringify({ service: 'gcal', scope: tokenData.scope }),
        'gcal'
      );
      
      console.log(`[CALLBACK] Google Calendar tokens saved successfully for user: ${userId}`);
    }

    console.log(`[CALLBACK] OAuth callback successful for user: ${userId}`);

    // Return HTML page that communicates with frontend and redirects
    const htmlResponse = `
<!DOCTYPE html>
<html>
<head>
    <title>NYRA OAuth Success</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
        .redirecting { color: #666; font-size: 16px; }
    </style>
</head>
<body>
    <div class="success">✓ Autenticazione completata!</div>
    <div class="redirecting">Reindirizzamento in corso...</div>
    
    <script>
        // Send message to parent window (NYRA app)
        if (window.opener) {
            window.opener.postMessage({
                type: 'nyra:google:connected',
                user_id: '${userId}',
                tokens: {
                    access_token: '${tokenData.access_token}',
                    refresh_token: '${tokenData.refresh_token}',
                    expires_at: '${tokenData.expires_at}',
                    scope: '${tokenData.scope}'
                }
            }, '*');
            
            // Close popup after sending message
            setTimeout(() => {
                window.close();
            }, 1000);
        } else {
            // Fallback redirect if no opener
            window.location.href = '${process.env.CORS_ORIGIN || 'http://localhost:5173'}?auth=success&user_id=${userId}';
        }
    </script>
</body>
</html>`;

    res.send(htmlResponse);

  } catch (error) {
    console.error('Error in /auth/google/callback:', error);
    
    const userId = req.query.state;
    if (userId) {
      await tokenDB.logAudit(
        userId,
        'auth_failed',
        req.ip,
        req.get('User-Agent'),
        JSON.stringify({ error: error.message })
      );
    }

    // Return HTML page for error case
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>NYRA OAuth Error</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
        .message { color: #666; font-size: 16px; margin-bottom: 20px; }
        .redirecting { color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="error">✗ Errore di autenticazione</div>
    <div class="message">${error.message}</div>
    <div class="redirecting">Chiusura automatica...</div>
    
    <script>
        // Send error message to parent window
        if (window.opener) {
            window.opener.postMessage({
                type: 'nyra:google:error',
                user_id: '${userId}',
                error: '${error.message}'
            }, '*');
            
            // Close popup after sending message
            setTimeout(() => {
                window.close();
            }, 2000);
        } else {
            // Fallback redirect
            window.location.href = '${process.env.CORS_ORIGIN || 'http://localhost:5173'}?auth=failed&error=${encodeURIComponent(error.message)}';
        }
    </script>
</body>
</html>`;

    res.status(500).send(errorHtml);
  }
});

/**
 * DELETE /auth/google/revoke
 * Revokes user's Google tokens
 */
router.delete('/google/revoke', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'user_id is required'
      });
    }

    // Get all tokens for the user
    const userTokens = await tokenDB.getAllUserTokens(user_id);
    
    if (!userTokens || userTokens.length === 0) {
      return res.status(404).json({
        error: 'Tokens not found',
        message: 'No tokens found for the specified user'
      });
    }

    console.log(`[REVOKE] Found ${userTokens.length} token records for user: ${user_id}`);

    // Revoke tokens with Google for each service
    for (const token of userTokens) {
      try {
        await googleAuth.revokeTokens(token.access_token);
        console.log(`[REVOKE] Successfully revoked Google tokens for service: ${token.service}`);
      } catch (revokeError) {
        console.warn(`[REVOKE] Warning: Failed to revoke Google tokens for service ${token.service}:`, revokeError.message);
        // Continue with local deletion even if remote revocation fails
      }
    }

    // Delete all tokens from database
    for (const token of userTokens) {
      await tokenDB.revokeTokens(user_id, token.service);
      console.log(`[REVOKE] Deleted tokens for service: ${token.service}`);
    }
    
    // Log revocation
    await tokenDB.logAudit(
      user_id,
      'tokens_revoked',
      req.ip,
      req.get('User-Agent'),
      JSON.stringify({ services: userTokens.map(t => t.service) })
    );

    res.json({
      success: true,
      message: 'Tokens revoked successfully'
    });

  } catch (error) {
    console.error('Error in /auth/google/revoke:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to revoke tokens'
    });
  }
});

/**
 * GET /auth/google/status
 * Check authentication status for a user
 */
router.get('/google/status', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'user_id parameter is required'
      });
    }

    console.log(`[STATUS] Checking tokens for user: ${user_id}`);

    // Get all tokens for the user from the new tokens table
    const userTokens = await tokenDB.getAllUserTokens(user_id);
    
    if (!userTokens || userTokens.length === 0) {
      console.log(`[STATUS] No tokens found for user: ${user_id}`);
      return res.json({
        authenticated: false,
        gmail: { connected: false },
        gcal: { connected: false },
        message: 'No tokens found for user'
      });
    }

    console.log(`[STATUS] Found ${userTokens.length} token records for user: ${user_id}`);

    // Check Gmail and Calendar connection status
    const now = new Date();
    let gmailConnected = false;
    let gcalConnected = false;

    for (const token of userTokens) {
      const expiryDate = new Date(token.expiry_date);
      const isExpired = now >= expiryDate;

      if (!isExpired) {
        if (token.service === 'gmail') {
          gmailConnected = true;
          console.log(`[STATUS] Gmail connected for user: ${user_id}`);
        } else if (token.service === 'gcal') {
          gcalConnected = true;
          console.log(`[STATUS] Google Calendar connected for user: ${user_id}`);
        }
      } else {
        console.log(`[STATUS] ${token.service} tokens expired for user: ${user_id}`);
      }
    }

    const authenticated = gmailConnected || gcalConnected;

    console.log(`[STATUS] Final status for user ${user_id}:`);
    console.log(`[STATUS] - authenticated: ${authenticated}`);
    console.log(`[STATUS] - gmail.connected: ${gmailConnected}`);
    console.log(`[STATUS] - gcal.connected: ${gcalConnected}`);

    res.json({
      authenticated,
      gmail: { 
        connected: gmailConnected,
        service: 'gmail'
      },
      gcal: { 
        connected: gcalConnected,
        service: 'gcal'
      },
      message: authenticated ? 'User has valid tokens' : 'No valid tokens found'
    });

  } catch (error) {
    console.error('Error in /auth/google/status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check authentication status'
    });
  }
});

/**
 * POST /auth/google/test-tokens
 * Test endpoint to simulate OAuth token storage
 */
router.post('/google/test-tokens', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'user_id is required'
      });
    }

    // Create test token data
    const testTokenData = {
      access_token: `test_access_token_${Date.now()}`,
      refresh_token: `test_refresh_token_${Date.now()}`,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      token_type: 'Bearer',
      scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly'
    };

    console.log(`[TEST] Creating test tokens for user: ${user_id}`);
    console.log(`[TEST] Token data:`, testTokenData);

    // Save tokens to database
    await tokenDB.saveTokens(user_id, testTokenData);
    
    // Log test token creation
    await tokenDB.logAudit(
      user_id,
      'test_tokens_created',
      req.ip,
      req.get('User-Agent'),
      JSON.stringify({ scope: testTokenData.scope, test: true })
    );

    console.log(`[TEST] Test tokens created successfully for user: ${user_id}`);

    res.json({
      success: true,
      message: 'Test tokens created successfully',
      user_id: user_id,
      tokens: testTokenData
    });

  } catch (error) {
    console.error('Error in /auth/google/test-tokens:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create test tokens'
    });
  }
});

module.exports = router;