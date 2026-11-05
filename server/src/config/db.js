import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from workspace root and server/ directory
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });

// Disable command buffering globally: fail fast instead of freezing for 10000ms
mongoose.set('bufferCommands', false);

let lastConnectionError = null;

/**
 * Categorize MongoDB error without leaking sensitive credentials
 */
function categorizeError(error, uri) {
  if (!uri || uri.trim() === '' || uri === 'your_mongodb_connection_string_here') {
    return {
      category: 'missing_configuration',
      message: 'MONGODB_URI is not set in environment variables.',
      advice: 'Provide a complete MongoDB Atlas connection string starting with mongodb+srv:// in your .env file.',
    };
  }

  const rawMsg = error ? error.message || '' : '';
  const errName = error ? error.name || '' : '';

  if (
    !uri.startsWith('mongodb://') &&
    !uri.startsWith('mongodb+srv://') ||
    errName === 'MongoParseError' ||
    rawMsg.includes('Invalid scheme')
  ) {
    return {
      category: 'incorrect_uri_scheme',
      message: 'Invalid connection string scheme. Expected format: mongodb:// or mongodb+srv://.',
      advice: 'Verify MONGODB_URI contains the full URI string (e.g. mongodb+srv://<user>:<password>@cluster0.mongodb.net/finora), not just a password or cluster hostname.',
    };
  }

  if (
    rawMsg.includes('bad auth') ||
    rawMsg.includes('authentication failed') ||
    rawMsg.includes('AuthenticationFailed') ||
    error.code === 8000
  ) {
    return {
      category: 'invalid_credentials',
      message: 'MongoDB Atlas authentication failed.',
      advice: 'Double check the database username and password in MONGODB_URI. If the password contains special characters, ensure they are URL-encoded.',
    };
  }

  if (
    errName === 'MongoServerSelectionError' ||
    rawMsg.includes('queryTxt ETIMEOUT') ||
    rawMsg.includes('ETIMEDOUT') ||
    rawMsg.includes('ECONNREFUSED') ||
    rawMsg.includes('Server selection timed out')
  ) {
    return {
      category: 'network_access_restriction',
      message: 'Could not connect to MongoDB Atlas cluster within timeout period.',
      advice: 'Check MongoDB Atlas Network Access rules. Ensure your IP address (or 0.0.0.0/0 for anywhere access) is added to the IP Access List.',
    };
  }

  return {
    category: 'unknown_connection_error',
    message: rawMsg || 'An unknown error occurred while connecting to MongoDB.',
    advice: 'Review the Mongoose error logs and verify MongoDB Atlas cluster state.',
  };
}

/**
 * MongoDB connection helper using Mongoose
 * Reads connection URI from process.env.MONGODB_URI
 */
export async function connectDB(strictMode = false) {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '' || uri === 'your_mongodb_connection_string_here') {
    lastConnectionError = categorizeError(null, uri);
    console.warn(`[MongoDB] Warning: ${lastConnectionError.message}`);
    console.info(`[MongoDB] Tip: ${lastConnectionError.advice}`);

    if (strictMode) {
      throw new Error(lastConnectionError.message);
    }
    return false;
  }

  try {
    const dbName = process.env.DB_NAME || 'finora';
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      dbName,
    });
    lastConnectionError = null;
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return true;
  } catch (error) {
    lastConnectionError = categorizeError(error, uri);
    console.error(`[MongoDB] Connection failure [${lastConnectionError.category}]: ${lastConnectionError.message}`);
    console.info(`[MongoDB] Recommended action: ${lastConnectionError.advice}`);

    if (strictMode) {
      throw error;
    }
    return false;
  }
}

/**
 * Returns sanitized connection status for health check
 */
export function getConnectionStatus() {
  const state = mongoose.connection.readyState;
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const isConfigured = Boolean(
    process.env.MONGODB_URI &&
    process.env.MONGODB_URI.trim() !== '' &&
    process.env.MONGODB_URI !== 'your_mongodb_connection_string_here'
  );

  return {
    state: stateMap[state] || 'unknown',
    isConnected: state === 1,
    isConfigured,
    host: state === 1 ? mongoose.connection.host : null,
    database: state === 1 ? mongoose.connection.name : null,
    ...(lastConnectionError ? { error: lastConnectionError } : {}),
  };
}

export default connectDB;
