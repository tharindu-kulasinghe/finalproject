const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = require('./src/app');
const prisma = require('./src/prisma/client');
const http = require('http');
const cron = require('node-cron');
const { createWsHub } = require('./src/realtime/wsHub');
const { runDueReminders } = require('./src/jobs/dueReminders.job');

const PORT = Number(process.env.PORT) || 3000;

function normalizeWsPath() {
  const raw = (process.env.WS_PATH || '/ws').trim();
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
  const noTrailingSlash = withLeading.replace(/\/+$/, '');
  return noTrailingSlash || '/ws';
}

function normalizeBackendUrl() {
  const v = process.env.BACKEND_URL;
  return v ? String(v).trim().replace(/\/+$/, '') : null;
}

function webSocketUrlOverride() {
  const v = process.env.WEBSOCKET_URL;
  return v ? String(v).trim() : null;
}

function publicHttpBase() {
  return normalizeBackendUrl() || `http://localhost:${PORT}`;
}

function publicWebSocketBase() {
  const wsOverride = webSocketUrlOverride();
  if (wsOverride) return wsOverride;
  const backend = normalizeBackendUrl();
  const wsPath = normalizeWsPath();
  if (backend) {
    try {
      const u = new URL(backend);
      const wsProto = u.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProto}//${u.host}${wsPath}`;
    } catch (_) {}
  }
  return `ws://localhost:${PORT}${wsPath}`;
}

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected');

    const server = http.createServer(app);
    const wsHub = createWsHub({ server });

    const onListenError = (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `Port ${PORT} is already in use. Stop the other process or set PORT in backend/.env (e.g. PORT=3001) and update BACKEND_URL / WEBSOCKET_URL there if set.`
        );
        process.exit(1);
      }
      console.error('HTTP server error:', err);
      process.exit(1);
    };
    server.on('error', onListenError);
    wsHub.wss.on('error', onListenError);

    runDueReminders({ wsHub }).catch((e) => console.error('runDueReminders:', e));
    cron.schedule('0 * * * *', () => {
      runDueReminders({ wsHub }).catch((e) => console.error('runDueReminders:', e));
    });

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API: ${publicHttpBase()}`);
      console.log(`WebSocket: ${publicWebSocketBase()}?token=...`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
