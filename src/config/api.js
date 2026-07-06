// Defaults to the live Railway backend so the deployed site works out of the
// box. Override with VITE_API_URL (e.g. http://localhost:3001) for local dev.
export const SERVER_URL = import.meta.env.VITE_API_URL || 'https://logistics-api-production-06b2.up.railway.app';
