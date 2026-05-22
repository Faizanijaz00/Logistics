import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { execFile } from 'child_process';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { config } from './config.js';
import { traccarService } from './traccarService.js';
import { seedUsers, registerAuthRoutes, requireAuth, requireRole } from './auth.js';
import { registerJourneyRoutes } from './journeys.js';
import { registerVehicleRoutes } from './vehicles.js';
import { registerMiscRoutes } from './misc.js';
import { tripsRouter } from './trips.js';
import { registerPassengerRoutes } from './passengers.js';
import { startTracking, stopTracking, getTrackingStatus } from './tracking.js';

const app = express();
const server = createServer(app);

// CORS — allow all origins when CORS_ORIGIN is '*', otherwise whitelist
const corsWildcard = config.corsOrigin === '*';
const ALLOWED_ORIGINS = new Set(
  [config.corsOrigin, process.env.CORS_ORIGIN_2].filter(Boolean)
);
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?$/.test(origin);
  if (corsWildcard || isLocalhost || ALLOWED_ORIGINS.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '20mb' }));

// Serve static files (car images etc.) from /public
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname2 = dirname(fileURLToPath(import.meta.url));
// Serve from server/public first (Railway-friendly), then fall back to repo root /public (local dev)
app.use(express.static(join(__dirname2, 'public')));
app.use(express.static(join(__dirname2, '..', 'public')));

// --- Auth routes ---
registerAuthRoutes(app);
registerJourneyRoutes(app);
registerVehicleRoutes(app, requireAuth, requireRole);
registerMiscRoutes(app, requireAuth);
app.use(tripsRouter);
registerPassengerRoutes(app);

// --- REST endpoints ---

app.get('/api/health', (req, res) => {
  const devices = traccarService.getDevices();
  const uptime = process.uptime();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    traccarConnected: devices.length > 0,
    deviceCount: devices.length,
    environment: config.nodeEnv,
    version: '1.0.0',
  });
});

app.get('/api/devices', (req, res) => {
  res.json(traccarService.getDevices().map(d => ({
    id: d.id,
    uniqueId: d.uniqueId,
    name: d.name,
    status: d.status,
    lastUpdate: d.lastUpdate,
  })));
});

app.get('/api/positions', (req, res) => {
  res.json(traccarService.getLastPositions());
});

// --- DVSA MOT History API Proxy (OAuth2) ---

let motTokenCache = null; // { token, expiresAt }

async function getMotToken() {
  if (motTokenCache && Date.now() < motTokenCache.expiresAt) return motTokenCache.token;

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.MOT_CLIENT_ID,
    client_secret: process.env.MOT_CLIENT_SECRET,
    scope: process.env.MOT_SCOPE,
  });

  const resp = await fetch(process.env.MOT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!resp.ok) throw new Error(`MOT token fetch failed (${resp.status})`);
  const data = await resp.json();
  motTokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return motTokenCache.token;
}

app.get('/api/mot-lookup', requireAuth, async (req, res) => {
  const { registration } = req.query;
  if (!registration) return res.status(400).json({ error: 'No registration provided' });

  const apiKey = process.env.MOT_API_KEY;
  if (!apiKey || !process.env.MOT_CLIENT_ID) return res.status(500).json({ error: 'MOT API not configured' });

  try {
    const token = await getMotToken();
    const motResp = await fetch(
      `https://history.mot.api.gov.uk/v1/trade/vehicles/registration/${encodeURIComponent(registration)}`,
      { headers: { 'Authorization': `Bearer ${token}`, 'X-API-Key': apiKey } }
    );

    if (!motResp.ok) {
      if (motResp.status === 404) return res.json({ motExpiry: '', history: [] });
      return res.status(motResp.status).json({ error: `MOT lookup failed (${motResp.status})` });
    }

    const data = await motResp.json();
    const vehicle = Array.isArray(data) ? data[0] : data;
    if (!vehicle?.motTests?.length) return res.json({ motExpiry: '', history: [] });

    const latestTest = vehicle.motTests[0];
    res.json({
      motExpiry: latestTest.expiryDate || '',
      history: vehicle.motTests.map(test => ({
        testDate: test.completedDate || '',
        expiryDate: test.expiryDate || '',
        result: test.testResult || '',
        mileage: test.odometerValue || '',
        failures: (test.rfrAndComments || []).filter(c => c.type === 'FAIL').map(c => c.text),
        advisories: (test.rfrAndComments || []).filter(c => c.type === 'ADVISORY').map(c => c.text),
      })),
    });
  } catch (err) {
    console.error('[MOT] Error:', err.message);
    res.status(500).json({ error: 'MOT lookup failed: ' + err.message });
  }
});

// --- DVLA Vehicle Lookup Proxy ---

app.post('/api/vehicle-lookup', requireAuth, async (req, res) => {
  const { registration } = req.body;
  if (!registration) return res.status(400).json({ error: 'No registration provided' });

  const dvlaKey = process.env.DVLA_API_KEY || '';
  if (!dvlaKey) return res.status(500).json({ error: 'DVLA API key not configured on server' });

  try {
    const dvlaResp = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
      method: 'POST',
      headers: {
        'x-api-key': dvlaKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ registrationNumber: registration }),
    });

    if (!dvlaResp.ok) {
      if (dvlaResp.status === 404) return res.status(404).json({ error: 'Vehicle not found' });
      return res.status(dvlaResp.status).json({ error: `DVLA lookup failed (${dvlaResp.status})` });
    }

    const data = await dvlaResp.json();
    res.json(data);
  } catch (err) {
    console.error('[DVLA] Error:', err.message);
    res.status(500).json({ error: 'DVLA lookup failed: ' + err.message });
  }
});

// --- Image Upload with Background Removal ---

// Resolve the public/cars and public/docs directories relative to the project root
const carsDir = join(new URL('.', import.meta.url).pathname, '..', 'public', 'cars');
const docsDir = join(new URL('.', import.meta.url).pathname, '..', 'public', 'docs');

app.post('/api/upload-image', requireAuth, requireRole('admin'), async (req, res) => {
  const { imageData } = req.body; // base64 data URI
  if (!imageData) return res.status(400).json({ error: 'No imageData provided' });

  const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
  const inputPath = join(tmpdir(), `rembg-in-${randomUUID()}.png`);
  const filename = `upload-${Date.now()}.png`;
  const outputPath = join(carsDir, filename);

  try {
    await writeFile(inputPath, Buffer.from(base64, 'base64'));

    // Remove background with rembg
    const scriptPath = new URL('./remove_bg.py', import.meta.url).pathname;
    await new Promise((resolve, reject) => {
      execFile('python3', [scriptPath, inputPath, outputPath], { timeout: 120000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve();
      });
    });

    // Return the public URL path (served by Vite dev server)
    res.json({ url: `/cars/${filename}` });
  } catch (err) {
    console.error('[Upload] Error:', err.message);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  } finally {
    unlink(inputPath).catch(() => {});
  }
});

// --- Document Upload ---
app.post('/api/upload-doc', requireAuth, async (req, res) => {
  const { imageData, filename } = req.body;
  if (!imageData) return res.status(400).json({ error: 'No imageData provided' });

  const base64 = imageData.replace(/^data:[^;]+;base64,/, '');
  const ext = (filename?.split('.').pop() || 'pdf').toLowerCase();
  const savedFilename = `doc-${Date.now()}.${ext}`;
  const outputPath = join(docsDir, savedFilename);

  try {
    await mkdir(docsDir, { recursive: true });
    await writeFile(outputPath, Buffer.from(base64, 'base64'));
    res.json({ url: `/docs/${savedFilename}` });
  } catch (err) {
    console.error('[Doc Upload] Error:', err.message);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// --- Vehicle Photo Upload (no background removal) ---
app.post('/api/upload-photo', requireAuth, async (req, res) => {
  const { imageData } = req.body; // base64 data URI
  if (!imageData) return res.status(400).json({ error: 'No imageData provided' });

  const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
  const filename = `photo-${Date.now()}.png`;
  const outputPath = join(carsDir, filename);

  try {
    await writeFile(outputPath, Buffer.from(base64, 'base64'));
    res.json({ url: `/cars/${filename}` });
  } catch (err) {
    console.error('[Photo Upload] Error:', err.message);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// --- WebSocket ---

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log(`[WS] Client connected (${wss.clients.size} total)`);

  // Send current positions immediately
  const snapshot = [];
  const devices = traccarService.getDevices();
  for (const [deviceId, pos] of traccarService.lastPositions) {
    const device = devices.find(d => d.id === deviceId);
    snapshot.push({
      deviceId: pos.deviceId,
      uniqueId: device?.uniqueId || null,
      deviceName: device?.name || null,
      lat: pos.latitude,
      lng: pos.longitude,
      speed: pos.speed,
      heading: pos.course,
      timestamp: pos.fixTime,
    });
  }

  if (snapshot.length > 0) {
    ws.send(JSON.stringify({ type: 'positions_snapshot', data: snapshot }));
  }

  ws.on('close', () => {
    console.log(`[WS] Client disconnected (${wss.clients.size} total)`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
  });
});

// Broadcast position updates to all connected clients
traccarService.onPositionUpdate((updates) => {
  const message = JSON.stringify({ type: 'position_update', data: updates });

  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
});

// --- Start ---

// Tracking status endpoint
app.get('/api/tracking/status', requireAuth, async (req, res) => {
  try {
    const status = await getTrackingStatus();
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

server.listen(config.port, async () => {
  console.log(`[Server] Running on port ${config.port}`);
  console.log(`[Server] WebSocket: ws://localhost:${config.port}/ws`);
  await seedUsers();
  traccarService.start();
  startTracking();
});

process.on('SIGTERM', () => {
  stopTracking();
  traccarService.stop();
  wss.close();
  server.close();
});
