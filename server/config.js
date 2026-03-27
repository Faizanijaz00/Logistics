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
    url: process.env.TRACCAR_URL || 'https://tracking.vigitech.uk',
    username: process.env.TRACCAR_USERNAME || 'faizan11ijaz@gmail.com',
    password: process.env.TRACCAR_PASSWORD || 'n491YgzD4Q',
    pollIntervalMs: parseInt(process.env.TRACCAR_POLL_INTERVAL || '30000'),
  },

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  jwtSecret: process.env.JWT_SECRET || 'fleet-hub-secret-key-2024',
};
