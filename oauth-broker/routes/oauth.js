const express = require('express');
const router = express.Router();

// Initialize services
const GoogleAuthService = require('../services/googleAuth');
const TokenDatabase = require('../database/db');
const SecurityMiddleware = require('../middleware/security');

const googleAuth = new GoogleAuthService();
const tokenDB = new TokenDatabase(process.env.DATABASE_PATH);

// Initialize security middleware with allowed IPs for n8n
const allowedIPs = process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : [];
const security = new SecurityMiddleware(allowedIPs);

/**
 * POST /oauth/google/save-tokens
 * Save OAuth tokens for a specific service
 */
router.post('/google/save-tokens', async (req, res) => {
  try {
    const { user_id, service, access_token, refresh_token, expiry_date } = req.body;

    if (!user_id || !service || !access_token || !refresh_token || !expiry_date) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'user_id, service, access_token, refresh_token, and expiry_date are required'
      });
    }

    if (!['gmail', 'gcal'].includes(service)) {
      return res.status(400).json({
        error: 'Invalid service',
        message: 'service must be either "gmail" or "gcal"'
      });
    }

    console.log(`[SAVE-TOKENS] Saving tokens for user: ${user_id}, service: ${service}`);

    const tokenData = {
      access_token,
      refresh_token,
      expiry_date,
      token_type: 'Bearer',
      scope: service === 'gmail' 
        ? 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly'
        : 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly'
    };

    // Save tokens to database
    await tokenDB.saveTokens(user_id, service, tokenData);
    
    // Log token creation
    await tokenDB.logAudit(
      user_id,
      'tokens_created',
      req.ip,
      req.get('User-Agent'),
      JSON.stringify({ service, scope: tokenData.scope }),
      service
    );

    console.log(`[SAVE-TOKENS] Tokens saved successfully for user: ${user_id}, service: ${service}`);

    res.json({
      success: true,
      message: 'Tokens saved successfully',
      user_id,
      service,
      expiry_date
    });

  } catch (error) {
    console.error('Error in POST /oauth/google/save-tokens:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to save tokens'
    });
  }
});

/**
 * GET /oauth/google/access-token
 * Get access token for a specific service (for n8n GET requests)
 */
router.get('/google/access-token', async (req, res) => {
  try {
    const { user_id, service } = req.query;

    if (!user_id || !service) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'user_id and service query parameters are required'
      });
    }

    if (!['gmail', 'gcal'].includes(service)) {
      return res.status(400).json({
        error: 'Invalid service',
        message: 'service must be either "gmail" or "gcal"'
      });
    }

    console.log(`[GET-ACCESS-TOKEN] Getting tokens for user: ${user_id}, service: ${service}`);

    // Get tokens from database for specific service
    const tokens = await tokenDB.getTokens(user_id, service);
    
    if (!tokens) {
      console.log(`[GET-ACCESS-TOKEN] No tokens found for user: ${user_id}, service: ${service}`);
      return res.status(404).json({
        error: 'Tokens not found',
        message: `No tokens found for user ${user_id} and service ${service}. User needs to authenticate first.`,
        requires_auth: true
      });
    }

    // Check if tokens are expired
    const now = new Date();
    const expiryDate = new Date(tokens.expiry_date);
    const isExpired = now >= expiryDate;

    if (isExpired) {
      console.log(`[GET-ACCESS-TOKEN] Tokens expired for user: ${user_id}, service: ${service}`);
      return res.status(401).json({
        error: 'Tokens expired',
        message: 'Access token has expired',
        expired: true,
        requires_auth: true
      });
    }

    console.log(`[GET-ACCESS-TOKEN] Tokens retrieved successfully for user: ${user_id}, service: ${service}`);

    // Log token access
    await tokenDB.logAudit(
      user_id,
      'token_accessed',
      req.ip,
      req.get('User-Agent'),
      JSON.stringify({ service, method: 'GET' }),
      service
    );

    res.json({
      success: true,
      user_id,
      service,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      token_type: tokens.token_type,
      expires_in: Math.floor((expiryDate - now) / 1000), // seconds until expiry
      scope: tokens.scope
    });

  } catch (error) {
    console.error('Error in GET /oauth/google/access-token:', error);
    
    // Log error
    if (req.query.user_id && req.query.service) {
      await tokenDB.logAudit(
        req.query.user_id,
        'token_error',
        req.ip,
        req.get('User-Agent'),
        JSON.stringify({ error: error.message, service: req.query.service, method: 'GET' }),
        req.query.service
      );
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve access token'
    });
  }
});

/**
 * POST /oauth/google/access-token
 * Get valid access token for a user (with auto-refresh)
 * Protected endpoint for n8n calls with IP restriction
 */
router.post('/google/access-token', 
  security.ipRestriction(),
  security.rateLimit(),
  security.validateTokenRequest(),
  async (req, res) => {
    try {
      const { user_id, service } = req.body;
      
      if (!user_id || !service) {
        return res.status(400).json({
          error: 'Missing required parameters',
          message: 'user_id and service are required'
        });
      }

      if (!['gmail', 'gcal'].includes(service)) {
        return res.status(400).json({
          error: 'Invalid service',
          message: 'service must be either "gmail" or "gcal"'
        });
      }
      
      // Get tokens from database for specific service
      const tokens = await tokenDB.getTokens(user_id, service);
      
      if (!tokens) {
        return res.status(404).json({
          error: 'Tokens not found',
          message: `No tokens found for user ${user_id} and service ${service}. User needs to authenticate first.`,
          requires_auth: true
        });
      }

      const now = new Date();
      const expiryDate = new Date(tokens.expiry_date);
      
      // Check if token needs refresh
      if (now >= expiryDate) {
        console.log(`Token needs refresh for user: ${user_id}, service: ${service}`);
        
        try {
          // Refresh the access token
          const refreshedTokens = await googleAuth.refreshAccessToken(tokens.refresh_token);
          
          // Update tokens in database
          await tokenDB.updateAccessToken(
            user_id,
            service,
            refreshedTokens.access_token,
            refreshedTokens.expires_at
          );
          
          // Log token refresh
          await tokenDB.logAudit(
            user_id,
            'token_refreshed',
            req.ip,
            req.get('User-Agent'),
            JSON.stringify({ 
              service,
              old_expiry_date: tokens.expiry_date,
              new_expiry_date: refreshedTokens.expires_at 
            }),
            service
          );
          
          console.log(`Token refreshed successfully for user: ${user_id}, service: ${service}`);
          
          // Return refreshed token
          return res.json({
            success: true,
            access_token: refreshedTokens.access_token,
            token_type: refreshedTokens.token_type,
            expires_at: refreshedTokens.expires_at,
            scope: tokens.scope,
            refreshed: true,
            service
          });
          
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
          
          // Log refresh failure
          await tokenDB.logAudit(
            user_id,
            'refresh_failed',
            req.ip,
            req.get('User-Agent'),
            JSON.stringify({ error: refreshError.message, service }),
            service
          );
          
          // If refresh fails, the user needs to re-authenticate
          return res.status(401).json({
            error: 'Token refresh failed',
            message: 'Failed to refresh access token. User needs to re-authenticate.',
            requires_auth: true,
            details: refreshError.message,
            service
          });
        }
      }
      
      // Token is still valid, return current token
      if (now < expiryDate) {
        // Log token access
        await tokenDB.logAudit(
          user_id,
          'token_accessed',
          req.ip,
          req.get('User-Agent'),
          JSON.stringify({ service }),
          service
        );
        
        return res.json({
          success: true,
          access_token: tokens.access_token,
          token_type: tokens.token_type,
          expires_at: tokens.expiry_date,
          scope: tokens.scope,
          refreshed: false,
          service
        });
      }
      
      // Token is expired and couldn't be refreshed
      return res.status(401).json({
        error: 'Token expired',
        message: 'Access token has expired and could not be refreshed. User needs to re-authenticate.',
        requires_auth: true,
        service
      });

    } catch (error) {
      console.error('Error in /oauth/google/access-token:', error);
      
      // Log error
      if (req.body.user_id && req.body.service) {
        await tokenDB.logAudit(
          req.body.user_id,
          'token_error',
          req.ip,
          req.get('User-Agent'),
          JSON.stringify({ error: error.message, service: req.body.service }),
          req.body.service
        );
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve access token'
      });
    }
  }
);

/**
 * POST /oauth/google/verify
 * Verify token validity by making a test API call
 */
router.post('/google/verify',
  security.ipRestriction(),
  security.rateLimit(),
  security.validateTokenRequest(),
  async (req, res) => {
    try {
      const { user_id, service } = req.body;
      
      if (!user_id || !service) {
        return res.status(400).json({
          error: 'Missing required parameters',
          message: 'user_id and service are required'
        });
      }

      if (!['gmail', 'gcal'].includes(service)) {
        return res.status(400).json({
          error: 'Invalid service',
          message: 'service must be either "gmail" or "gcal"'
        });
      }
      
      // Get tokens from database for specific service
      const tokens = await tokenDB.getTokens(user_id, service);
      
      if (!tokens) {
        return res.status(404).json({
          error: 'Tokens not found',
          message: `No tokens found for user ${user_id} and service ${service}`
        });
      }

      // Verify token with Google API
      const verification = await googleAuth.verifyToken(tokens.access_token);
      
      // Log verification
      await tokenDB.logAudit(
        user_id,
        'token_verified',
        req.ip,
        req.get('User-Agent'),
        JSON.stringify({ 
          service,
          valid: verification.valid,
          error: verification.error || null 
        }),
        service
      );
      
      if (verification.valid) {
        res.json({
          success: true,
          valid: true,
          user_info: verification.user,
          message: 'Token is valid',
          service
        });
      } else {
        res.status(401).json({
          success: false,
          valid: false,
          error: verification.error,
          message: 'Token is invalid or expired',
          service
        });
      }

    } catch (error) {
      console.error('Error in /oauth/google/verify:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to verify token'
      });
    }
  }
);

/**
 * GET /oauth/google/scopes
 * Get the OAuth scopes that will be requested
 */
router.get('/google/scopes', (req, res) => {
  res.json({
    scopes: googleAuth.scopes,
    description: {
      'https://www.googleapis.com/auth/gmail.send': 'Send emails via Gmail',
      'https://www.googleapis.com/auth/gmail.compose': 'Compose emails in Gmail',
      'https://www.googleapis.com/auth/calendar': 'View and manage calendar',
      'https://www.googleapis.com/auth/calendar.events': 'View and manage calendar events',
      'https://www.googleapis.com/auth/userinfo.profile': 'View basic profile information',
      'https://www.googleapis.com/auth/userinfo.email': 'View email address'
    }
  });
});

/**
 * GET /oauth/google/access-tok
 * Alias for /oauth/google/access-token (for n8n compatibility)
 */
router.get('/google/access-tok', async (req, res) => {
  // Call the main endpoint handler directly
  const { user_id, service } = req.query;

  if (!user_id || !service) {
    return res.status(400).json({
      error: 'Missing required parameters',
      message: 'user_id and service query parameters are required'
    });
  }

  if (!['gmail', 'gcal'].includes(service)) {
    return res.status(400).json({
      error: 'Invalid service',
      message: 'service must be either "gmail" or "gcal"'
    });
  }

  console.log(`[GET-ACCESS-TOK] Getting tokens for user: ${user_id}, service: ${service}`);

  // Get tokens from database for specific service
  const tokens = await tokenDB.getTokens(user_id, service);
  
  if (!tokens) {
    console.log(`[GET-ACCESS-TOK] No tokens found for user: ${user_id}, service: ${service}`);
    return res.status(404).json({
      error: 'Tokens not found',
      message: `No tokens found for user ${user_id} and service ${service}. User needs to authenticate first.`,
      requires_auth: true
    });
  }

  // Check if tokens are expired
  const now = new Date();
  const expiryDate = new Date(tokens.expiry_date);
  const isExpired = now >= expiryDate;

  if (isExpired) {
    console.log(`[GET-ACCESS-TOK] Tokens expired for user: ${user_id}, service: ${service}`);
    return res.status(401).json({
      error: 'Tokens expired',
      message: 'Access token has expired',
      expired: true,
      requires_auth: true
    });
  }

  console.log(`[GET-ACCESS-TOK] Tokens retrieved successfully for user: ${user_id}, service: ${service}`);

  // Log token access
  await tokenDB.logAudit(
    user_id,
    'token_accessed',
    req.ip,
    req.get('User-Agent'),
    JSON.stringify({ service, method: 'GET' }),
    service
  );

  res.json({
    success: true,
    user_id,
    service,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    token_type: tokens.token_type,
    expires_in: Math.floor((expiryDate - now) / 1000), // seconds until expiry
    scope: tokens.scope
  });
});

module.exports = router;