const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const authOAuthRoutes = require('./routes/authOAuthRoutes');
const emailRoutes = require('./routes/email');
const aiRoutes = require('./routes/ai');
const excelRoutes = require('./routes/excel');

// Import middleware
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://nyra-frontend-r1dqdnyen-nyradesk-projects.vercel.app',
    'https://nyra-frontend-beta.vercel.app',
    'https://nyra-frontend-git-main-nyradesk-projects.vercel.app',
    'https://nyra-frontend.vercel.app',
    'https://nyra-app.vercel.app',
    process.env.CORS_ORIGIN || 'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/auth', authOAuthRoutes);  // Google OAuth routes
app.use('/api/email', authMiddleware.optional, emailRoutes);
app.use('/api/ai', authMiddleware.optional, aiRoutes);
app.use('/api/excel', excelRoutes);  // Excel routes

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;
    
  res.status(err.status || 500).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 NYRA Backend server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Host: 0.0.0.0 (accessible from all interfaces)`);
  console.log(`🔗 CORS Origins: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
  
  // Log available routes
  console.log('\n📋 Available API Routes:');
  console.log('  GET  /health - Health check');
  console.log('  GET  /auth/google/start - Start Google OAuth');
  console.log('  GET  /auth/google/callback - Google OAuth callback');
  console.log('  GET  /auth/google/status - Check auth status');
  console.log('  POST /api/auth/google - Google OAuth login');
  console.log('  GET  /api/auth/verify - Verify JWT token');
  console.log('  POST /api/email/generate - Generate email with AI');
  console.log('  POST /api/email/send - Send email via Gmail');
  console.log('  POST /api/email/parse-excel - Parse Excel file');
  console.log('  POST /api/ai/chat - Chat with OpenRouter');
  console.log('  GET  /api/ai/test - Test AI connection');
  console.log('  POST /api/excel/upload - Upload Excel file');
  console.log('  POST /api/excel/analyze - Analyze Excel with AI');
  console.log('  GET  /api/excel/files - List uploaded files');
  console.log('  GET  /api/excel/file/:id - Get file data');
  console.log('  DELETE /api/excel/file/:id - Delete file');
});

module.exports = app;
// Force new deploy Wed Sep 17 07:56:25 CEST 2025
