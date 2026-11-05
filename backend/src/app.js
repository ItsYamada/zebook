import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import bookRoutes from './routes/books.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes); // GET /api/books, GET /api/books/genres, POST /api/books/:id/download

app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));

// Express 5 forwards errors from async handlers here
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

export default app;
