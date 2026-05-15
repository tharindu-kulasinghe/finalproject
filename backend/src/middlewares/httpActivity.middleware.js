const { logAudit } = require('../utils/auditLogger');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const PATH_SKIP = [
  (p) => p === '/health',
  (p) => p.startsWith('/uploads'),
];

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'token',
  'authorization',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'refreshtoken',
];

function shouldSkipPath(pathOnly) {
  return PATH_SKIP.some((fn) => fn(pathOnly));
}

function scrubValue(key, value) {
  const lower = String(key).toLowerCase();
  if (SENSITIVE_KEYS.some((s) => lower.includes(s))) return '[REDACTED]';
  if (typeof value === 'string' && value.length > 800) return `${value.slice(0, 800)}…`;
  return value;
}

function sanitizeBody(body, depth = 0) {
  if (body == null || depth > 8) return body;
  if (Buffer.isBuffer(body)) return '[binary]';
  if (typeof body !== 'object') {
    return typeof body === 'string' && body.length > 800 ? `${body.slice(0, 800)}…` : body;
  }
  if (Array.isArray(body)) {
    return body.slice(0, 50).map((item) => sanitizeBody(item, depth + 1));
  }
  const out = {};
  let count = 0;
  for (const [k, v] of Object.entries(body)) {
    if (count++ > 80) {
      out._truncated = '…';
      break;
    }
    if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) {
      out[k] = '[REDACTED]';
      continue;
    }
    if (v !== null && typeof v === 'object') {
      out[k] = sanitizeBody(v, depth + 1);
    } else {
      out[k] = scrubValue(k, v);
    }
  }
  return out;
}

function actionForMethod(method) {
  if (method === 'POST') return 'CREATE';
  if (method === 'DELETE') return 'DELETE';
  if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
  return method;
}

function pickEntityId(params) {
  if (!params || typeof params !== 'object') return null;
  if (params.id) return String(params.id);
  for (const key of Object.keys(params)) {
    if (key === 'id' || key.endsWith('Id')) return String(params[key]);
  }
  const first = Object.values(params)[0];
  return first != null ? String(first) : null;
}

function httpActivityMiddleware(req, res, next) {
  res.on('finish', () => {
    try {
      if (!MUTATING_METHODS.has(req.method)) return;
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      if (res.locals?.skipHttpAudit) return;

      const pathOnly = (req.originalUrl || req.url || '').split('?')[0];
      if (shouldSkipPath(pathOnly)) return;

      const userId = req.user?.id ?? null;
      const ipAddress = req.ip || req.socket?.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;

      const action = actionForMethod(req.method);
      const entityType = 'SYSTEM_ACTIVITY';
      const entityId = pickEntityId(req.params);
      const description = `${req.method} ${pathOnly}`.slice(0, 500);

      const newValues =
        req.method === 'DELETE'
          ? null
          : Object.keys(req.body || {}).length
            ? sanitizeBody(req.body)
            : null;

      void logAudit({
        userId,
        action,
        entityType,
        entityId,
        description,
        oldValues: null,
        newValues,
        ipAddress,
        userAgent,
      });
    } catch (e) {
      console.error('httpActivityMiddleware:', e);
    }
  });

  next();
}

module.exports = httpActivityMiddleware;
