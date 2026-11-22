import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from './config.js';
import { query } from './db.js';
import { importStatus } from './importBooks.js';
import authRoutes from './routes/auth.js';
import bookRoutes from './routes/books.js';

const app = express();

// Allow book cover images from https sites (Project Gutenberg); keep the other secure defaults.
const csp = helmet.contentSecurityPolicy.getDefaultDirectives();
csp['img-src'] = ["'self'", 'data:', 'https:'];
delete csp['upgrade-insecure-requests']; // lets the site also work over http://localhost
app.use(helmet({ contentSecurityPolicy: { directives: csp } }));

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Checks the database connection (shows only an error code, never secrets). Handy right after deploying.
app.get('/api/health/db', async (_req, res) => {
  try {
    const { rows } = await query('SELECT COUNT(*) AS books FROM books');
    res.json({ db: 'ok', books: Number(rows[0].books), import: importStatus });
  } catch (err) {
    res.status(500).json({ db: 'error', code: err.code || 'UNKNOWN' });
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` }));

// Serve the built website (web/dist) from the same server, so one Wasmer app hosts web + API.
const dist = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(join(dist, 'index.html')); // single-page app fallback (/login, /register, ...)
  });
}

app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));

// Express 5 forwards errors from async handlers here
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

export default app;
