// Background geofencing that powers the drive-detection prompts:
//  • Enter a car's location and stay ~30s  → "Are you driving X?"  (start)
//  • While driving X, walk away for ~5 min → "Are you done driving X?" (end)
//
// iOS/Android deliver region enter/exit events to a TaskManager task even when
// the app is closed. We don't run background timers (unreliable) — instead we
// SCHEDULE a delayed local notification on enter/exit and CANCEL it if the
// opposite event arrives first. That gives us the dwell / walk-away behaviour.
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ensureNotificationsReady, scheduleDrivePrompt, cancelPrompt,
  CATEGORY_DRIVE_START, CATEGORY_DRIVE_END,
} from './notifications';

export const GEOFENCE_TASK = 'fleet-geofence-task';
const RADIUS_M = 120;            // iOS min reliable region radius is ~100m
const DWELL_SECONDS = 30;        // enter + stay this long → "are you driving?"
const WALKAWAY_SECONDS = 5 * 60; // driving + away this long → "are you done?"

const NAMES_KEY = 'geo:vehicleNames';   // { [vehicleId]: name }
const startKey = (id) => `geo:start:${id}`;
const endKey = (id) => `geo:end:${id}`;

async function getJSON(key, fallback) {
  try { const raw = await AsyncStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

// Which vehicle (if any) is currently being driven — read from the persisted
// auth store so the background task sees the latest truth.
async function activeVehicleId() {
  const auth = await getJSON('auth-storage', null);
  const s = auth?.state || {};
  return s.isDriving ? (s.selectedVehicleId || null) : null;
}

// ── The background task ────────────────────────────────────────────────────
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const { eventType, region } = data;
  const vehicleId = region?.identifier;
  if (!vehicleId) return;

  const names = await getJSON(NAMES_KEY, {});
  const name = names[vehicleId] || 'the vehicle';
  await ensureNotificationsReady();

  // Location.GeofencingEventType.Enter === 1, Exit === 2
  if (eventType === Location.GeofencingEventType.Enter) {
    // Cancel any pending "are you done?" for this car — they're back at it.
    const endId = await AsyncStorage.getItem(endKey(vehicleId));
    if (endId) { await cancelPrompt(endId); await AsyncStorage.removeItem(endKey(vehicleId)); }

    // Only prompt to start if they're not already driving this car.
    if (await activeVehicleId() === vehicleId) return;
    const id = await scheduleDrivePrompt({
      category: CATEGORY_DRIVE_START,
      title: `Are you driving ${name}?`,
      body: 'Tap to start the drive.',
      data: { vehicleId, vehicleName: name, kind: 'start' },
      delaySeconds: DWELL_SECONDS,
    });
    if (id) await AsyncStorage.setItem(startKey(vehicleId), id);
    return;
  }

  if (eventType === Location.GeofencingEventType.Exit) {
    // Left before the dwell elapsed — cancel the pending start prompt.
    const sid = await AsyncStorage.getItem(startKey(vehicleId));
    if (sid) { await cancelPrompt(sid); await AsyncStorage.removeItem(startKey(vehicleId)); }

    // If they're driving this car and have now walked away, prompt to finish.
    if (await activeVehicleId() === vehicleId) {
      const id = await scheduleDrivePrompt({
        category: CATEGORY_DRIVE_END,
        title: `Are you done driving ${name}?`,
        body: 'Tap to end the drive.',
        data: { vehicleId, vehicleName: name, kind: 'end' },
        delaySeconds: WALKAWAY_SECONDS,
      });
      if (id) await AsyncStorage.setItem(endKey(vehicleId), id);
    }
  }
});

// Build regions from vehicles that have a known position.
function regionsFor(vehicles) {
  return (vehicles || [])
    .filter(v => v?.position && v.position.lat != null && v.position.lng != null)
    .map(v => ({
      identifier: v.id,
      latitude: v.position.lat,
      longitude: v.position.lng,
      radius: RADIUS_M,
      notifyOnEnter: true,
      notifyOnExit: true,
    }));
}

// Ask for Always-location + notification permission, then (re)start geofencing
// around the current fleet positions. Returns true if geofencing is running.
export async function startDriveGeofencing(vehicles) {
  try {
    const regions = regionsFor(vehicles);
    if (regions.length === 0) return false;

    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') return false;
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') return false;
    await ensureNotificationsReady();

    // Persist id→name so the background task can label notifications.
    const names = {};
    for (const v of vehicles) names[v.id] = [v.make, v.model].filter(Boolean).join(' ') || v.licensePlate || 'vehicle';
    await AsyncStorage.setItem(NAMES_KEY, JSON.stringify(names));

    // Restart cleanly so region set reflects the latest positions.
    const already = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(() => false);
    if (already) await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {});
    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
    return true;
  } catch {
    return false;
  }
}

export async function stopDriveGeofencing() {
  try {
    const started = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK).catch(() => false);
    if (started) await Location.stopGeofencingAsync(GEOFENCE_TASK);
  } catch {}
}
