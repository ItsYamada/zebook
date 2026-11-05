import mysql from 'mysql2/promise';
import { config } from './config.js';

const ssl = config.dbSsl ? { rejectUnauthorized: false } : undefined;

export const pool = mysql.createPool({
  ...config.db,
  ssl,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
});

// Small helper: returns { rows } for SELECTs and { insertId, rowCount } for writes.
export async function query(sql, params = []) {
  const [result] = await pool.query(sql, params);
  if (Array.isArray(result)) return { rows: result, rowCount: result.length };
  return { rows: [], rowCount: result.affectedRows, insertId: result.insertId };
}
