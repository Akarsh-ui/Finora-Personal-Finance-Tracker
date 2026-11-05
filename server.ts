import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import serverApp from './server/src/app.js';
import { connectDB } from './server/src/config/db.js';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'server', '.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
function getArg(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 ? args[index + 1] : undefined;
}

// Unified full-stack server listens on port 3000 for AI Studio environment
const PORT = Number(getArg('--port') || process.env.PORT || 3000);
const HOST = getArg('--host') || '0.0.0.0';

async function start() {
  const app = express();

  // Attempt database connection without blocking server boot in dev
  try {
    await connectDB(false);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[MongoDB] Initial connection check: ${message}`);
  }

  // Mount backend API app (which includes /api/health, CORS, JSON parsers, etc.)
  app.use(serverApp);

  // Mount Vite in development or serve static built files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`[Full-Stack] Finora unified server running on http://${HOST}:${PORT}`);
    console.log(`[Full-Stack] API Health Endpoint: http://localhost:${PORT}/api/health`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Full-Stack] Port ${PORT} is already in use.`);
    } else {
      console.error('[Full-Stack] Server error:', err);
    }
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('[Full-Stack] Error starting server:', err);
  process.exit(1);
});
