import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  uri: config.databaseUrl,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return {
    rows: Array.isArray(rows) ? rows : [],
    rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows,
  };
};