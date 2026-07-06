// Vigitech/Traccar GPS tracking integration
// Polls positions from the tracking API and updates vehicle positions in Supabase

import { config } from './config.js';

const SUPABASE_URL = 'https://bwwfrdwpcxzlvprswzne.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2ZyZHdwY3h6bHZwcnN3em5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5OTY2MjIsImV4cCI6MjA4ODU3MjYyMn0.KYJYGHFo2WstiVFgEIuBv0P3i40OM4wcHmdkLcujVeo';

// Device → vehicle links are data-driven: each vehicle's `tracker_id` in Supabase
// holds the GPS device IMEI (Traccar/Vigitech `uniqueId`). No hardcoded mapping.
// The map is refreshed every poll so linking a tracker in the UI takes effect live.
let imeiToVehicleId = {};

// Path-history recording: only store a breadcrumb once a car has moved far enough
// from its last recorded point, so parked cars don't flood the table.
const MIN_TRACK_MOVE_METERS = 20;
const lastRecordedPoint = {}; // vehicleId → { lat, lng }

function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

async function recordPositionHistory(vehicleId, lat, lng, speed, heading) {
  if (lat == null || lng == null) return;
  const prev = lastRecordedPoint[vehicleId];
  if (prev && distanceMeters(prev, { lat, lng }) < MIN_TRACK_MOVE_METERS) return;
  lastRecordedPoint[vehicleId] = { lat, lng };
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/vehicle_positions`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ vehicle_id: vehicleId, lat, lng, speed: speed ?? null, heading: heading ?? null }),
    });
  } catch (err) {
    console.warn('[Tracking] Failed to record position history:', err.message);
  }
}

async function refreshVehicleTrackerMap() {
  try {
    const rows = await fetch(
      `${SUPABASE_URL}/rest/v1/vehicles?select=id,tracker_id&tracker_id=not.is.null`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    ).then(r => (r.ok ? r.json() : []));

    const map = {};
    for (const row of rows) {
      if (row.tracker_id) map[String(row.tracker_id).trim()] = row.id;
    }
    imeiToVehicleId = map;
    return map;
  } catch (err) {
    console.warn('[Tracking] Failed to refresh vehicle tracker map:', err.message);
    return imeiToVehicleId;
  }
}

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

async function updateVehiclePosition(vehicleId, lat, lng, speed, course, attrs) {
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

  // Record a breadcrumb for the path trail (deduped by distance)
  await recordPositionHistory(vehicleId, lat, lng, speed, course);
}

let pollInterval = null;
let devices = [];

async function poll() {
  try {
    const positions = await fetchPositions();

    // Refresh the IMEI → vehicle map so UI tracker changes apply without a restart
    await refreshVehicleTrackerMap();

    // Build deviceId → device IMEI (uniqueId) map
    const deviceImeiMap = {};
    devices.forEach(d => { deviceImeiMap[d.id] = d.uniqueId; });

    let updated = 0;
    for (const pos of positions) {
      const imei = deviceImeiMap[pos.deviceId];
      if (!imei) continue;

      const vehicleId = imeiToVehicleId[String(imei).trim()];
      if (!vehicleId) continue;

      await updateVehiclePosition(
        vehicleId,
        pos.latitude,
        pos.longitude,
        pos.speed,
        pos.course,
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

    // Load tracker links from the DB, then log which devices are linked to a vehicle
    await refreshVehicleTrackerMap();
    devices.forEach(d => {
      const vehicleId = imeiToVehicleId[String(d.uniqueId).trim()];
      console.log(`  ${d.name} (imei ${d.uniqueId}) → ${vehicleId || 'UNLINKED'}`);
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
        vehicleId: imeiToVehicleId[String(device.uniqueId).trim()] || null,
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
