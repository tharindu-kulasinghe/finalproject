const WebSocket = require('ws');
const { verifyToken } = require('../utils/jwt');

function wsListenPath() {
  const raw = (process.env.WS_PATH || '/ws').trim();
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
  const noTrailingSlash = withLeading.replace(/\/+$/, '');
  return noTrailingSlash || '/ws';
}

function createWsHub({ server }) {
  const wss = new WebSocket.Server({ server, path: wsListenPath() });
  const connectionsByUserId = new Map();

  function addConn(userId, ws) {
    const set = connectionsByUserId.get(userId) || new Set();
    set.add(ws);
    connectionsByUserId.set(userId, set);
  }

  function removeConn(userId, ws) {
    const set = connectionsByUserId.get(userId);
    if (!set) return;
    set.delete(ws);
    if (!set.size) connectionsByUserId.delete(userId);
  }

  function safeSend(ws, payload) {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(payload));
  }

  function broadcastToUser(userId, payload) {
    const set = connectionsByUserId.get(userId);
    if (!set) return;
    for (const ws of set) safeSend(ws, payload);
  }

  wss.on('connection', (ws, req) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      if (!token) {
        ws.close(1008, 'Missing token');
        return;
      }
      const decoded = verifyToken(token);
      const userId = decoded?.id;
      if (!userId) {
        ws.close(1008, 'Invalid token');
        return;
      }

      addConn(userId, ws);
      safeSend(ws, { type: 'CONNECTED' });

      ws.on('close', () => removeConn(userId, ws));
      ws.on('error', () => removeConn(userId, ws));
    } catch (_) {
      ws.close(1011, 'Server error');
    }
  });

  return {
    broadcastToUser,
    wss,
  };
}

module.exports = { createWsHub };

