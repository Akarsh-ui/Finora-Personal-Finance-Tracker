import mongoose from 'mongoose';
import { getConnectionStatus, connectDB } from '../config/db.js';

let lastAttemptTime = 0;
const RETRY_INTERVAL_MS = 5000;

/**
 * Middleware that guarantees MongoDB is connected before running database operations.
 * Prevents Mongoose from buffering queries for 10000ms and timing out.
 */
export async function requireDatabase(req, res, next) {
  // Always permit health checks to pass through without requiring active DB
  if (req.path === '/health' || req.originalUrl === '/api/health') {
    return next();
  }

  // If already connected, proceed immediately
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  // Attempt automatic reconnection if URI is configured and cooldown has passed
  const now = Date.now();
  const uri = process.env.MONGODB_URI;
  const isConfigured = Boolean(
    uri &&
    uri.trim() !== '' &&
    uri !== 'your_mongodb_connection_string_here' &&
    (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'))
  );

  if (isConfigured && now - lastAttemptTime > RETRY_INTERVAL_MS) {
    lastAttemptTime = now;
    console.log('[MongoDB] Attempting reconnection before processing API request...');
    try {
      const connected = await connectDB(false);
      if (connected && mongoose.connection.readyState === 1) {
        return next();
      }
    } catch {
      // Handled by getConnectionStatus below
    }
  }

  const status = getConnectionStatus();
  return res.status(503).json({
    success: false,
    message: status.error?.message || 'Database connection is unavailable. Please check MONGODB_URI in settings.',
    code: 'DATABASE_UNAVAILABLE',
    database: status,
  });
}
