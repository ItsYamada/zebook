import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import mysql from 'mysql2/promise';
import { config } from './config.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'db');
const read = (name) => readFileSync(join(dir, name), 'utf8');

/**
 * Creates the tables, and loads the demo books when the catalog is empty.
 * Enabled with AUTO_MIGRATE=true. Everything is idempotent, so running it twice is safe.
 * A separate connection is used because only this one is allowed to run multi-statement SQL.
 */
export async function migrate() {
  const conn = await mysql.createConnection({
    ...config.db,
    ssl: config.dbSsl ? { rejectUnauthorized: false } : undefined,
    charset: 'utf8mb4',
    multipleStatements: true,
  });
  try {
    await conn.query(read('schema.sql'));
    const [rows] = await conn.query('SELECT COUNT(*) AS n FROM books');
    if (rows[0].n === 0) {
      await conn.query(read('seed_sample.sql'));
      console.log('Migration: tables ready, demo books loaded');
    } else {
      console.log(`Migration: tables ready (${rows[0].n} books already present)`);
    }
  } finally {
    await conn.end();
  }
}
