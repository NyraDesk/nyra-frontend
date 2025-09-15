const express = require('express');
const router = express.Router();

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://nyra-backend-c7zi.onrender.com/auth/google/callback';

// GET /auth/google/start - initiates OAuth flow
router.get('/google/start', (req, res) => {
  try {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&` +
      `scope=email profile https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent`;

    console.log('[AUTH] Starting Google OAuth flow');
    res.redirect(authUrl);
  } catch (error) {
    console.error('[AUTH] Error starting OAuth:', error);
    res.status(500).json({ error: 'Failed to start OAuth flow' });
  }
});

// GET /auth/google/callback - handles OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      console.error('[AUTH] OAuth error:', error);
      return res.status(400).json({ error: 'OAuth authorization failed' });
    }

    if (!code) {
      console.error('[AUTH] No authorization code received');
      return res.status(400).json({ error: 'No authorization code received' });
    }

    console.log('[AUTH] Received authorization code, exchanging for tokens...');

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('[AUTH] Token exchange failed:', tokens);
      return res.status(400).json({ error: 'Failed to exchange code for tokens' });
    }

    console.log('[AUTH] Tokens received successfully');

    // TODO: Save tokens to database
    // For now, just return success
    res.json({
      success: true,
      message: 'OAuth completed successfully',
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in
      }
    });

  } catch (error) {
    console.error('[AUTH] Callback error:', error);
    res.status(500).json({ error: 'OAuth callback failed' });
  }
});

// GET /auth/google/status - checks auth status
router.get('/google/status', (req, res) => {
  try {
    // TODO: Check actual authentication status from database
    // For now, return basic status
    res.json({
      authenticated: false,
      message: 'Authentication status endpoint - not implemented yet'
    });
  } catch (error) {
    console.error('[AUTH] Status check error:', error);
    res.status(500).json({ error: 'Failed to check auth status' });
  }
});

module.exports = router;
