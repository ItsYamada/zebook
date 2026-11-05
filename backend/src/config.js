import 'dotenv/config';

export const config = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  corsOrigin: process.env.CORS_ORIGIN?.split(',') ?? '*',
  limits: { guest: 5, user: 10 },
  guestSessionHours: 24,
  userSessionDays: 7,
};

if (!config.jwtSecret || config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters');
}