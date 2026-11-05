import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL || 'mysql://root:igopkiba0129*@localhost:3306/zebook',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-at-least-32-chars-long',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  limits: {
    guest: 5,
    user: 10,
  },
  userSessionDays: 7,
  guestSessionHours: 24,
};