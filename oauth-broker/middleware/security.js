const { RateLimiterMemory } = require('rate-limiter-flexible');
const { body, validationResult } = require('express-validator');

class SecurityMiddleware {
  constructor(allowedIPs = []) {
    this.allowedIPs = allowedIPs;
    this.rateLimiter = new RateLimiterMemory({
      points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900, // 15 minutes
    });
  }

  // IP Restriction Middleware for n8n calls
  ipRestriction() {
    return (req, res, next) => {
      if (!this.allowedIPs || this.allowedIPs.length === 0) {
        return next(); // No restrictions if no IPs configured
      }

      const clientIP = this.getClientIP(req);
      const isAllowed = this.isIPAllowed(clientIP);

      if (!isAllowed) {
        console.warn(`Blocked request from IP: ${clientIP}`);
        return res.status(403).json({
          error: 'Access denied',
          message: 'Your IP address is not authorized'
        });
      }

      next();
    };
  }

  // Rate limiting middleware
  rateLimit() {
    return async (req, res, next) => {
      try {
        const key = this.getClientIP(req);
        await this.rateLimiter.consume(key);
        next();
      } catch (rejRes) {
        const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
        res.set('Retry-After', String(secs));
        res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Try again in ${secs} seconds.`
        });
      }
    };
  }

  // Validation middleware
  validateTokenRequest() {
    return [
      body('user_id')
        .notEmpty()
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('User ID is required and must be between 1-255 characters'),
      
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
          });
        }
        next();
      }
    ];
  }

  // CORS configuration
  getCorsOptions() {
    return {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };
  }

  // Get client IP address
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           '127.0.0.1';
  }

  // Check if IP is allowed
  isIPAllowed(clientIP) {
    if (!this.allowedIPs || this.allowedIPs.length === 0) {
      return true;
    }

    for (const allowedIP of this.allowedIPs) {
      if (this.matchIP(clientIP, allowedIP.trim())) {
        return true;
      }
    }
    return false;
  }

  // Match IP against pattern (supports CIDR notation)
  matchIP(clientIP, pattern) {
    // Exact match
    if (clientIP === pattern) {
      return true;
    }

    // CIDR notation support (basic implementation)
    if (pattern.includes('/')) {
      try {
        const [network, prefixLength] = pattern.split('/');
        const prefix = parseInt(prefixLength, 10);
        
        // Convert IPs to integers for comparison (IPv4 only for simplicity)
        if (this.isIPv4(clientIP) && this.isIPv4(network)) {
          const clientInt = this.ipToInt(clientIP);
          const networkInt = this.ipToInt(network);
          const mask = (-1 << (32 - prefix)) >>> 0;
          
          return (clientInt & mask) === (networkInt & mask);
        }
      } catch (error) {
        console.warn('Error parsing CIDR notation:', error);
        return false;
      }
    }

    // Localhost variations
    if (pattern === '127.0.0.1' && (clientIP === '::1' || clientIP === '::ffff:127.0.0.1')) {
      return true;
    }

    return false;
  }

  // Check if IP is IPv4
  isIPv4(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    return ipv4Regex.test(ip);
  }

  // Convert IPv4 to integer
  ipToInt(ip) {
    return ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct, 10), 0) >>> 0;
  }

  // Error handling middleware
  errorHandler() {
    return (error, req, res, next) => {
      console.error('Security middleware error:', error);
      
      if (res.headersSent) {
        return next(error);
      }

      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' 
          ? 'Something went wrong' 
          : error.message
      });
    };
  }
}

module.exports = SecurityMiddleware;