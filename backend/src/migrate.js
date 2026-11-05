import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool } from './db.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'db');
const read = (name) => readFileSync(join(dir, name), 'utf8');

/**
 * Creates the tables (and the demo books if the catalog is empty) when the server starts.
 * Enabled with AUTO_MIGRATE=true. Everything is idempotent, so running it twice is safe.
 * This is how the managed Wasmer database gets its tables without needing psql access.
 */
export async function migrate() {
  // pgcrypto may need extra privileges on a managed DB; gen_random_uuid() is built in on PostgreSQL 13+.
  try { await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto'); } catch { /* ignore */ }

  const schema = read('schema.sql')
    .split('\n')
    .filter((line) => !/^\s*CREATE EXTENSION/i.test(line))
    .join('\n');
  await pool.query(schema);

  const { rows } = await pool.query('SELECT count(*)::int AS n FROM books');
  if (rows[0].n === 0) {
    await pool.query(read('seed_sample.sql'));
    console.log('Migration: tables ready, demo books loaded');
  } else {
    console.log(`Migration: tables ready (${rows[0].n} books already present)`);
  }
}
