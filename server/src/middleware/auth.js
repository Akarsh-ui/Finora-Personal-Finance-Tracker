import mongoose from 'mongoose';
import User from '../models/User.js';
import { verifyToken } from '../utils/token.js';

/**
 * Authentication middleware to protect private API routes
 * Extracts JWT from either HttpOnly cookie or Bearer header
 */
export async function requireAuth(req, res, next) {
  try {
    let token = null;

    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 2. Check Authorization Bearer header as dual fallback
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again.',
      });
    }

    // Check database connection state before querying user
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection is currently unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    // Locate user in database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Account not found or session revoked.',
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server authentication error.',
    });
  }
}
