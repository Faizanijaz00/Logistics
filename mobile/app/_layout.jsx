import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { useVehicleStore } from '../src/store/vehicleStore';

// NOTE: expo-notifications / expo-task-manager / the geofence service are
// imported *dynamically* below, never at module top level. That keeps this JS
// bundle safe to ship over-the-air (OTA) onto an older native binary that
// doesn't yet contain those native modules — the imports just fail silently
// there instead of crashing app startup. The geofence feature activates once a
// native build that includes the modules is installed.

// Tapping a drive-prompt's "Yes" button starts/ends the drive — no need to open
// the app and navigate. Fires wherever the app resumes to handle the response.
function useDriveNotificationActions() {
  useEffect(() => {
    let sub;
    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        const { ACTION_START_DRIVE, ACTION_END_DRIVE } = await import('../src/services/notifications');
        sub = Notifications.addNotificationResponseReceivedListener((response) => {
          const action = response?.actionIdentifier;
          const data = response?.notification?.request?.content?.data || {};
          const store = useAuthStore.getState();
          if (action === ACTION_START_DRIVE && data.vehicleId) {
            store.selectVehicle(data.vehicleId, data.vehicleName || '');
          } else if (action === ACTION_END_DRIVE) {
            store.stopDriving();
          }
        });
      } catch { /* native module absent (e.g. OTA on old binary) — no-op */ }
    })();
    return () => { try { sub?.remove(); } catch {} };
  }, []);
}

function AuthGate({ children }) {
  const { token, user, fetchMe } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    const inAuth = segments[0] === 'login';
    if (!token && !inAuth) {
      router.replace('/login');
    } else if (token && inAuth) {
      router.replace('/(tabs)');
    }
  }, [token, segments]);

  // Fetch vehicles from backend whenever authenticated
  useEffect(() => {
    if (token) {
      useVehicleStore.getState().fetchVehicles();
    }
  }, [token]);

  // (Re)arm background geofencing around the fleet whenever the vehicle list
  // (and thus their parked positions) changes while authenticated.
  const vehicles = useVehicleStore((s) => s.vehicles);
  useEffect(() => {
    if (token && vehicles.length) {
      (async () => {
        try {
          const { startDriveGeofencing } = await import('../src/services/geofenceService');
          await startDriveGeofencing(vehicles);
        } catch { /* native geofencing absent (OTA on old binary) — no-op */ }
      })();
    }
  }, [token, vehicles]);

  return children;
}

export default function RootLayout() {
  useDriveNotificationActions();
  return (
    <AuthGate>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthGate>
  );
}
