import 'dotenv/config';

const env = process.env;

// Locally:  DATABASE_URL=mysql://root:password@localhost:3306/zebook   (in .env)
// On Wasmer: the managed database injects DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD.
function databaseConfig() {
  if (env.DB_HOST) {
    return {
      host: env.DB_HOST,
      port: Number(env.DB_PORT || 3306),
      user: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
    };
  }
  if (env.DATABASE_URL) {
    const u = new URL(env.DATABASE_URL);
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.slice(1),
    };
  }
  return null;
}

export const config = {
  port: env.PORT || 5000,
  db: databaseConfig(),
  dbSsl: env.DB_SSL === 'true',
  jwtSecret: env.JWT_SECRET,
  corsOrigin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : '*',
  limits: { guest: 5, user: 10 },
  guestSessionHours: 24,
  userSessionDays: 7,
};

if (!config.db) {
  throw new Error('Set DATABASE_URL (local) or the DB_* variables (Wasmer) to connect to MySQL');
}
if (!config.jwtSecret || config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters');
}
