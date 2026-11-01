import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/ladies_wear_db',
  JWT_SECRET: process.env.JWT_SECRET?.trim(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  INITIAL_ADMIN_NAME: process.env.INITIAL_ADMIN_NAME?.trim(),
  INITIAL_ADMIN_EMAIL: process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase(),
  INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD,
  INITIAL_STAFF_NAME: process.env.INITIAL_STAFF_NAME?.trim(),
  INITIAL_STAFF_EMAIL: process.env.INITIAL_STAFF_EMAIL?.trim().toLowerCase(),
  INITIAL_STAFF_PASSWORD: process.env.INITIAL_STAFF_PASSWORD
};

export function getJwtSecret(): string {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in the server environment.');
  }

  return env.JWT_SECRET;
}
