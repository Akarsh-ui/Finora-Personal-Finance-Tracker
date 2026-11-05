import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';

import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

const PORT = process.env.PORT || 5000;

async function startServer() {
  console.log('----------------------------------------------------');
  console.log('🚀 Starting Finora Backend API Server (Stage 2)...');
  console.log('----------------------------------------------------');

  // Attempt database connection
  try {
    await connectDB(false);
  } catch (error) {
    console.error(`[Server] Failed to connect to MongoDB: ${error.message}`);
  }

  // Start HTTP listener
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Finora Express server running on port: ${PORT}`);
    console.log(`🔗 Health check available at: http://localhost:${PORT}/api/health`);
    console.log('----------------------------------------------------');
  });
}

startServer();
