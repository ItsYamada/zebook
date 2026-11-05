import 'dotenv/config';

const env = process.env;

// Locally you set DATABASE_URL in .env.
// On Wasmer Edge the managed database injects DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD.
const databaseUrl =
  env.DATABASE_URL ||
  (env.DB_HOST
    ? `postgres://${encodeURIComponent(env.DB_USERNAME)}:${encodeURIComponent(env.DB_PASSWORD)}@${env.DB_HOST}:${env.DB_PORT || 5432}/${env.DB_NAME}`
    : undefined);

export const config = {
  port: env.PORT || 5000,
  databaseUrl,
  dbSsl: env.DB_SSL === 'true',
  jwtSecret: env.JWT_SECRET,
  corsOrigin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : '*',
  limits: { guest: 5, user: 10 },
  guestSessionHours: 24,
  userSessionDays: 7,
};

if (!config.databaseUrl) {
  throw new Error('Set DATABASE_URL (local) or the DB_* variables (Wasmer) to connect to PostgreSQL');
}
if (!config.jwtSecret || config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters');
}
