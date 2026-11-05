import { getConnectionStatus } from '../config/db.js';

/**
 * Health check controller
 * Responds with API server status and sanitized database connectivity state
 */
export function getHealthStatus(req, res) {
  const dbStatus = getConnectionStatus();

  return res.status(200).json({
    status: 'ok',
    server: 'Finora API Server',
    stage: 'Stage 2: Backend Setup & Database Connection',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus.state,
      connected: dbStatus.isConnected,
      configured: dbStatus.isConfigured,
      ...(dbStatus.database ? { database: dbStatus.database } : {}),
      ...(dbStatus.host ? { host: dbStatus.host } : {}),
      ...(dbStatus.error ? { error: dbStatus.error } : {}),
    },
  });
}
