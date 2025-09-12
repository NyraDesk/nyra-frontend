const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// POST /api/auth/google - Google OAuth login
router.post('/google', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ 
        error: 'Authorization code is required' 
      });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const userInfo = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };

    // Generate JWT token
    const jwtToken = authMiddleware.generateToken({
      userId: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      googleTokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date
      }
    });

    res.json({
      success: true,
      token: jwtToken,
      user: userInfo,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// GET /api/auth/verify - Verify JWT token
router.get('/verify', authMiddleware.required, (req, res) => {
  res.json({
    success: true,
    user: {
      userId: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture
    }
  });
});

// POST /api/auth/refresh - Refresh Google tokens
router.post('/refresh', authMiddleware.required, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Refresh token is required' 
      });
    }

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update JWT with new tokens
    const updatedPayload = {
      ...req.user,
      googleTokens: {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || refreshToken,
        expires_at: credentials.expiry_date
      }
    };

    const newJwtToken = authMiddleware.generateToken(updatedPayload);

    res.json({
      success: true,
      token: newJwtToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Token refresh failed',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
});

// GET /api/auth/google-url - Get Google OAuth URL
router.get('/google-url', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: process.env.GMAIL_SCOPES?.split(',') || [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    prompt: 'consent'
  });

  res.json({
    authUrl,
    clientId: process.env.GOOGLE_CLIENT_ID
  });
});

module.exports = router;
