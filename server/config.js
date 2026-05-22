import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load server/.env first (server-specific secrets), then fall back to root .env
dotenv.config({ path: join(__dirname, '.env') });
dotenv.config({ path: join(__dirname, '..', '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  nodeEnv: process.env.NODE_ENV || 'development',

  traccar: {
    url: process.env.TRACCAR_URL,
    username: process.env.TRACCAR_USERNAME,
    password: process.env.TRACCAR_PASSWORD,
    pollIntervalMs: parseInt(process.env.TRACCAR_POLL_INTERVAL || '30000'),
  },

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  jwtSecret: process.env.JWT_SECRET,
};

// Validate required environment variables in production
if (config.nodeEnv === 'production') {
  const required = ['JWT_SECRET', 'TRACCAR_URL', 'TRACCAR_USERNAME', 'TRACCAR_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('[Config] Missing required environment variables:', missing.join(', '));
    console.error('[Config] Please set these in Railway environment variables.');
    process.exit(1);
  }
}
