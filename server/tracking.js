// Vigitech/Traccar GPS tracking integration
// Polls positions from the tracking API and updates vehicle positions in Supabase

import { config } from './config.js';

const SUPABASE_URL = 'https://bwwfrdwpcxzlvprswzne.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2ZyZHdwY3h6bHZwcnN3em5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTY2MjIsImV4cCI6MjA4ODU3MjYyMn0.KYJYGHFo2WstiVFgEIuBv0P3i40OM4wcHmdkLcujVeo';

// Map Vigitech device names → our Supabase vehicle IDs
const DEVICE_TO_VEHICLE = {
  'GLE': 'v1',           // MERCEDES GLE
  'V Class': 'v5',       // MERCEDES-BENZ V Class
  'S Class': 'v6',       // MERCEDES-BENZ S Class
  // Rename unnamed Vigitech devices to match these to activate tracking:
  // 'Sprinter': 'v4',   // NISSAN Sprinter
  // 'Range': 'v2',      // LAND ROVER Sport
  // 'Insignia': 'v3',   // VAUXHALL Insignia
  // 'Ibiza': 'v1774290886803', // SEAT Ibiza
};

let sessionCookie = null;

async function authenticate() {
  const { url, username, password } = config.traccar;
  const resp = await fetch(`${url}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `email=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
  });
  if (!resp.ok) throw new Error(`Vigitech auth failed: ${resp.status}`);
  // Extract session cookie
  const setCookie = resp.headers.get('set-cookie');
  if (setCookie) {
    sessionCookie = setCookie.split(';')[0];
  }
  return resp.json();
}

async function fetchDevices() {
  const { url } = config.traccar;
  const resp = await fetch(`${url}/api/devices`, {
    headers: { Cookie: sessionCookie },
  });
  if (resp.status === 401) {
    await authenticate();
    return fetchDevices();
  }
  if (!resp.ok) throw new Error(`Vigitech devices failed: ${resp.status}`);
  return resp.json();
}

async function fetchPositions() {
  const { url } = config.traccar;
  const resp = await fetch(`${url}/api/positions`, {
    headers: { Cookie: sessionCookie },
  });
  if (resp.status === 401) {
    await authenticate();
    return fetchPositions();
  }
  if (!resp.ok) throw new Error(`Vigitech positions failed: ${resp.status}`);
  return resp.json();
}

async function updateVehiclePosition(vehicleId, lat, lng, speed, course, address, attrs) {
  const body = {
    position: { lat, lng },
    speed: speed || 0,
    heading: course || 0,
    last_gps_update: new Date().toISOString(),
  };

  // Fuel data from OBD/tracker
  const fuel = {};
  if (attrs.evBatteryLevel != null) fuel.level = attrs.evBatteryLevel;
  else if (attrs.fuelLevel != null) fuel.level = attrs.fuelLevel;
  if (attrs.range != null) fuel.range = attrs.range;
  if (attrs.ignition != null) fuel.ignition = attrs.ignition;
  if (attrs.motion != null) fuel.motion = attrs.motion;
  if (attrs.obdOdometer != null) fuel.odometer = Math.round(attrs.obdOdometer / 1000); // meters to km
  if (attrs.power != null) fuel.voltage = attrs.power;

  if (Object.keys(fuel).length > 0) {
    body.fuel = fuel;
  }

  // Also store status based on ignition/motion
  if (attrs.ignition === true && attrs.motion === true) {
    body.status = 'active';
  } else if (attrs.ignition === false && attrs.motion === false) {
    body.status = 'parked';
  }

  await fetch(`${SUPABASE_URL}/rest/v1/vehicles?id=eq.${vehicleId}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
}

let pollInterval = null;
let devices = [];

async function poll() {
  try {
    const positions = await fetchPositions();

    // Build deviceId → device name map
    const deviceNameMap = {};
    devices.forEach(d => { deviceNameMap[d.id] = d.name; });

    let updated = 0;
    for (const pos of positions) {
      const deviceName = deviceNameMap[pos.deviceId];
      if (!deviceName) continue;

      const vehicleId = DEVICE_TO_VEHICLE[deviceName];
      if (!vehicleId) continue;

      await updateVehiclePosition(
        vehicleId,
        pos.latitude,
        pos.longitude,
        pos.speed,
        pos.course,
        pos.address,
        pos.attributes || {}
      );
      updated++;
    }

    if (updated > 0) {
      console.log(`[Tracking] Updated ${updated} vehicle position(s)`);
    }
  } catch (err) {
    console.warn('[Tracking] Poll error:', err.message);
  }
}

export async function startTracking() {
  try {
    await authenticate();
    devices = await fetchDevices();
    console.log(`[Tracking] Connected to Vigitech — ${devices.length} devices found`);

    // Log device mappings
    devices.forEach(d => {
      const vehicleId = DEVICE_TO_VEHICLE[d.name];
      console.log(`  ${d.name} (${d.id}) → ${vehicleId || 'UNMAPPED'}`);
    });

    // Initial poll
    await poll();

    // Start periodic polling
    pollInterval = setInterval(poll, config.traccar.pollIntervalMs);
    console.log(`[Tracking] Polling every ${config.traccar.pollIntervalMs / 1000}s`);
  } catch (err) {
    console.error('[Tracking] Failed to start:', err.message);
  }
}

export function stopTracking() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log('[Tracking] Stopped');
  }
}

// Expose for API: return current devices + positions + mappings
export async function getTrackingStatus() {
  try {
    const positions = await fetchPositions();
    const deviceNameMap = {};
    devices.forEach(d => { deviceNameMap[d.id] = d; });

    return positions.map(pos => {
      const device = deviceNameMap[pos.deviceId] || {};
      return {
        deviceId: pos.deviceId,
        deviceName: device.name || 'Unknown',
        vehicleId: DEVICE_TO_VEHICLE[device.name] || null,
        lat: pos.latitude,
        lng: pos.longitude,
        speed: pos.speed,
        course: pos.course,
        address: pos.address,
        ignition: pos.attributes?.ignition || false,
        motion: pos.attributes?.motion || false,
        batteryLevel: pos.attributes?.batteryLevel,
        lastUpdate: pos.deviceTime,
      };
    });
  } catch (err) {
    return { error: err.message };
  }
}
