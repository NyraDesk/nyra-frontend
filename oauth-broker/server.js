require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Initialize services
const TokenDatabase = require('./database/db');
const SecurityMiddleware = require('./middleware/security');

// Initialize routes
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const openRouterRoutes = require('./routes/openrouter');
const chatRoutes = require('./routes/chat');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize security middleware
const allowedIPs = process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : [];
const security = new SecurityMiddleware(allowedIPs);

// Initialize database
const tokenDB = new TokenDatabase(process.env.DATABASE_PATH);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration - MANUAL HEADERS
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://nyra-frontend-nyradesks-projects.vercel.app',
    'https://nyra-frontend.vercel.app',
    'https://nyra-frontend-beta.vercel.app'  // DOMINIO CORRETTO DAL LOG
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Fallback CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://nyra-frontend-nyradesks-projects.vercel.app',
    'https://nyra-frontend.vercel.app',
    'https://nyra-frontend-beta.vercel.app'  // DOMINIO CORRETTO DAL LOG
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = security.getClientIP(req);
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/auth', authRoutes);
app.use('/oauth', oauthRoutes);
app.use('/', openRouterRoutes);
app.use('/', chatRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'NYRA OAuth2 Token Broker',
    version: '1.0.0',
    description: 'Google OAuth2 token management service for NYRA',
    endpoints: {
      health: '/health',
      auth: {
        start: 'GET /auth/google/start?user_id=<user_id>',
        callback: 'GET /auth/google/callback',
        status: 'GET /auth/google/status?user_id=<user_id>',
        revoke: 'DELETE /auth/google/revoke'
      },
      oauth: {
        'save-tokens': 'POST /oauth/google/save-tokens',
        'access-token': 'GET /oauth/google/access-token?user_id=<user_id>&service=<gmail|gcal>',
        verify: 'POST /oauth/google/verify',
        scopes: 'GET /oauth/google/scopes'
      },
      openrouter: {
        'chat': 'POST /api/openrouter',
        'health': 'GET /api/openrouter/health'
      },
      chat: {
        'chat': 'POST /api/chat',
        'health': 'GET /api/chat/health',
        'intent-stats': 'GET /api/chat/intent-stats',
        'test-intent': 'POST /api/chat/test-intent',
        'cleanup': 'POST /api/chat/cleanup',
        'add-intent': 'POST /api/chat/add-intent'
      }
    },
    security: {
      ip_restriction: allowedIPs.length > 0,
      rate_limiting: true,
      cors_enabled: true
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use(security.errorHandler());

// Cleanup expired tokens every hour
setInterval(async () => {
  try {
    console.log('Running cleanup of expired tokens...');
    const cleaned = await tokenDB.cleanExpiredTokens();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired tokens`);
    }
  } catch (error) {
    console.error('Error during token cleanup:', error);
  }
}, 60 * 60 * 1000); // Every hour

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  tokenDB.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  tokenDB.close();
  process.exit(0);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 NYRA OAuth2 Token Broker started successfully!

Server Details:
- Port: ${PORT}
- Environment: ${process.env.NODE_ENV || 'development'}
- Database: ${process.env.DATABASE_PATH || './database/tokens.db'}
- CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}
- IP Restrictions: ${allowedIPs.length > 0 ? allowedIPs.join(', ') : 'None'}
- OpenRouter: ${process.env.OPENROUTER_API_KEY ? 'Configured' : 'Not configured'}

API Endpoints:
- Health: http://localhost:${PORT}/health
- Start Auth: http://localhost:${PORT}/auth/google/start?user_id=<user_id>
- Save Tokens: http://localhost:${PORT}/oauth/google/save-tokens (POST)
- Get Access Token: http://localhost:${PORT}/oauth/google/access-token?user_id=<user_id>&service=<gmail|gcal>
- Check Status: http://localhost:${PORT}/auth/google/status?user_id=<user_id>
- Token Verify: http://localhost:${PORT}/oauth/google/verify (POST)
- OpenRouter Chat: http://localhost:${PORT}/api/openrouter (POST)
- OpenRouter Health: http://localhost:${PORT}/api/openrouter/health

Security Features:
✅ Helmet security headers
✅ CORS protection
✅ Rate limiting
✅ IP restrictions (${allowedIPs.length > 0 ? 'enabled' : 'disabled'})
✅ Request validation
✅ Auto token refresh
✅ Audit logging

Ready to handle OAuth2 requests! 🔐
  `);
});

module.exports = app;