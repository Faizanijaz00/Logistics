import 'dotenv/config';

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
