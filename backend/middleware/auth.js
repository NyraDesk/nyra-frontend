const jwt = require('jsonwebtoken');

const authMiddleware = {
  // Required authentication middleware
  required: (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ 
          error: 'Access denied. No token provided.' 
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ 
        error: 'Invalid token.',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      });
    }
  },

  // Optional authentication middleware
  optional: (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      }
      
      next();
    } catch (error) {
      // Continue without authentication if token is invalid
      next();
    }
  },

  // Generate JWT token
  generateToken: (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  },

  // Verify JWT token
  verifyToken: (token) => {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
};

module.exports = authMiddleware;
