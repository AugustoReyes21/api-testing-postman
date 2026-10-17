import express from 'express';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { checkPassword, hashToken, newSecret } from './security.mjs';

const spec = JSON.parse(readFileSync(new URL('../openapi/openapi.json', import.meta.url)));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validators = Object.fromEntries(['LoginInput', 'OrderInput', 'StatusInput'].map(name => [name, ajv.compile(spec.components.schemas[name])]));
const parseRow = row => ({
  id: Number(row.id), ownerId: Number(row.owner_id), items: JSON.parse(row.items),
  currency: row.currency, totalCents: Number(row.total_cents), status: row.status,
  version: Number(row.version), createdAt: row.created_at, updatedAt: row.updated_at,
});

export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.set('X-Request-Id', req.requestId).set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    req.fail = (status, code, message, details = []) => res.status(status).json({ error: { code, message, details, requestId: req.requestId } });
    next();
  });
  app.use(express.json({ limit: '32kb', strict: true }));
  const validate = name => (req, res, next) => {
    if (!req.is('application/json')) return req.fail(415, 'UNSUPPORTED_MEDIA_TYPE', 'Se requiere Content-Type application/json.');
    if (!validators[name](req.body)) return req.fail(400, 'VALIDATION_ERROR', 'La solicitud contiene datos inválidos.', validators[name].errors.map(e => `${e.instancePath || '/'}: ${e.keyword}`));
    next();
  };
  const auth = (req, res, next) => {
    const match = /^Bearer ([A-Za-z0-9_-]+)$/.exec(req.get('Authorization') || '');
    const session = match && db.prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?').get(hashToken(match[1]), Date.now());
    if (!session) { res.set('WWW-Authenticate', 'Bearer'); return req.fail(401, 'UNAUTHORIZED', 'Se requiere una sesión válida.'); }
    req.userId = Number(session.user_id);
    next();
  };
  const owned = (req, res, next) => {
    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) return req.fail(400, 'VALIDATION_ERROR', 'El identificador debe ser un entero positivo.');
    const row = db.prepare('SELECT * FROM orders WHERE id=?').get(Number(req.params.id));
    if (!row) return req.fail(404, 'NOT_FOUND', 'El pedido no existe.');
    if (Number(row.owner_id) !== req.userId) return req.fail(403, 'FORBIDDEN', 'No tiene permiso para acceder a este pedido.');
    req.order = row;
    next();
  };
  app.get('/health', (req, res) => res.json({ status: 'ok', storage: 'sqlite' }));
  app.post('/auth/login', validate('LoginInput'), (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE email=?').get(req.body.email);
    if (!user || !checkPassword(req.body.password, user.salt, user.password_hash)) return req.fail(401, 'INVALID_CREDENTIALS', 'Credenciales de prueba incorrectas.');
    const token = newSecret();
    const expiresIn = 3600;
    db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hashToken(token), user.id, Date.now() + expiresIn * 1000);
    res.json({ accessToken: token, tokenType: 'Bearer', expiresIn, user: { id: Number(user.id), email: user.email } });
  });
  app.use('/orders', auth);
  app.post('/orders', validate('OrderInput'), (req, res) => {
    const { items, currency } = req.body;
    const now = new Date().toISOString();
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
    const id = Number(db.prepare('INSERT INTO orders(owner_id,items,currency,total_cents,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(req.userId, JSON.stringify(items), currency, total, now, now).lastInsertRowid);
    res.status(201).location(`/orders/${id}`).json(parseRow(db.prepare('SELECT * FROM orders WHERE id=?').get(id)));
  });
  app.get('/orders', (req, res) => {
    const keys = Object.keys(req.query);
    const p = req.query.page ?? '1'; const s = req.query.limit ?? '10';
    if (keys.some(k => !['page', 'limit'].includes(k)) || typeof p !== 'string' || typeof s !== 'string' || !/^[1-9]\d*$/.test(p) || !/^[1-9]\d*$/.test(s)) return req.fail(400, 'VALIDATION_ERROR', 'Paginación inválida.');
    const page = Number(p), limit = Number(s);
    if (!Number.isSafeInteger(page) || page > 1000000 || !Number.isSafeInteger(limit) || limit > 50) return req.fail(400, 'VALIDATION_ERROR', 'page debe ser 1..1000000 y limit 1..50.');
    const total = Number(db.prepare('SELECT COUNT(*) AS total FROM orders WHERE owner_id=?').get(req.userId).total);
    const data = db.prepare('SELECT * FROM orders WHERE owner_id=? ORDER BY id LIMIT ? OFFSET ?').all(req.userId, limit, (page - 1) * limit).map(parseRow);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });
  app.get('/orders/:id', owned, (req, res) => res.json(parseRow(req.order)));
  app.put('/orders/:id/status', owned, validate('StatusInput'), (req, res) => {
    if (req.order.status !== req.body.status) {
      const updatedAt = new Date(Math.max(Date.now(), Date.parse(req.order.updated_at) + 1)).toISOString();
      db.prepare('UPDATE orders SET status=?, version=version+1, updated_at=? WHERE id=?').run(req.body.status, updatedAt, req.order.id);
    }
    res.json(parseRow(db.prepare('SELECT * FROM orders WHERE id=?').get(req.order.id)));
  });
  app.delete('/orders/:id', (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) return req.fail(400, 'VALIDATION_ERROR', 'El identificador debe ser un entero positivo.');
    const row = db.prepare('SELECT owner_id FROM orders WHERE id=?').get(Number(req.params.id));
    if (row && Number(row.owner_id) !== req.userId) return req.fail(403, 'FORBIDDEN', 'No tiene permiso para eliminar este pedido.');
    db.prepare('DELETE FROM orders WHERE id=? AND owner_id=?').run(Number(req.params.id), req.userId);
    res.status(204).end();
  });
  app.use((req, res) => req.fail(404, 'NOT_FOUND', 'La ruta no existe.'));
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.type === 'entity.too.large') return req.fail(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo supera 32 KB.');
    if (err instanceof SyntaxError && 'body' in err) return req.fail(400, 'INVALID_JSON', 'El cuerpo no es JSON válido.');
    console.error('Error interno; requestId=', req.requestId, 'type=', err.name);
    req.fail(500, 'INTERNAL_ERROR', 'Error interno del servidor.');
  });
  return app;
}
