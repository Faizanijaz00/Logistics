import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load server/.env first (server-specific secrets), then fall back to root .env
dotenv.config({ path: join(__dirname, '.env') });
dotenv.config({ path: join(__dirname, '..', '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001'),

  traccar: {
    url: process.env.TRACCAR_URL || 'http://localhost:8082',
    username: process.env.TRACCAR_USERNAME || 'admin',
    password: process.env.TRACCAR_PASSWORD || 'admin',
    pollIntervalMs: parseInt(process.env.TRACCAR_POLL_INTERVAL || '5000'),
  },

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  jwtSecret: process.env.JWT_SECRET || 'fleet-hub-secret-key-2024',
};
