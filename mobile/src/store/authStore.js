import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/api';
import { showDrivingNotification, clearDrivingNotification } from '../services/driveNotification';

// Live location watcher handle (module-level so it survives store re-renders).
// While a driver is on a journey we push their phone GPS to the vehicle's
// position so the car shows up — and moves — on the live map.
let _locationSub = null;

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      error: null,
      selectedVehicleId: null,
      selectedVehicleName: null,
      isDriving: false,
      activeDriveId: null,

      // Get the current GPS position, but never block longer than 4s — a slow
      // or unavailable fix must not freeze "select vehicle" / "stop driving".
      _getCurrentPosition: async () => {
        try {
          const Location = await import('expo-location');
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') return null;
          const posPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 4000));
          const pos = await Promise.race([posPromise, timeout]);
          if (!pos?.coords) return null;
          return { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch { return null; }
      },

      // PATCH the selected vehicle's position so it shows/moves on the live map.
      _pushVehiclePosition: (lat, lng) => {
        const { token, selectedVehicleId } = get();
        if (!token || !selectedVehicleId || lat == null || lng == null) return;
        fetch(`${SERVER_URL}/api/vehicles/${selectedVehicleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ position: { lat, lng }, lastGpsUpdate: new Date().toISOString() }),
        }).catch(() => {});
      },

      _startLocationTracking: async () => {
        try {
          const Location = await import('expo-location');
          let { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') {
            const req = await Location.requestForegroundPermissionsAsync();
            status = req.status;
          }
          if (status !== 'granted') return;
          if (_locationSub) { try { _locationSub.remove(); } catch {} _locationSub = null; }
          // Push one position immediately so the car appears on the map right away
          const first = await get()._getCurrentPosition();
          if (first) get()._pushVehiclePosition(first.lat, first.lng);
          _locationSub = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 20 },
            (pos) => { if (pos?.coords) get()._pushVehiclePosition(pos.coords.latitude, pos.coords.longitude); }
          );
        } catch {}
      },

      _stopLocationTracking: () => {
        if (_locationSub) { try { _locationSub.remove(); } catch {} _locationSub = null; }
      },

      // Re-arm location tracking after an app relaunch if a drive is in progress.
      resumeDriving: () => {
        const { isDriving, selectedVehicleId, selectedVehicleName } = get();
        if (isDriving && selectedVehicleId) {
          get()._startLocationTracking();
          showDrivingNotification(selectedVehicleName || '');
        }
      },

      // Reconcile local driving state against the shared server truth so every
      // device agrees on who's driving which car. If another driver now holds the
      // vehicle we thought we were in, we've been bumped off it — drop it locally.
      reconcileFromVehicles: (vehicles) => {
        const { isDriving, selectedVehicleId, user } = get();
        if (!isDriving || !selectedVehicleId || !user?.id) return;
        const v = (vehicles || []).find((x) => x.id === selectedVehicleId);
        if (!v) return;
        const driverId = v.currentDriverId || v.current_driver_id || null;
        if (driverId && driverId !== user.id) {
          if (_locationSub) { try { _locationSub.remove(); } catch {} _locationSub = null; }
          set({ selectedVehicleId: null, isDriving: false, activeDriveId: null });
        }
      },

      _startDrive: async (vehicleId, vehicleName) => {
        const { token, user } = get();
        if (!token) return;
        try {
          // Create the drive record immediately (no GPS wait) so it shows on the
          // Drives tab straight away; attach the start position once GPS resolves.
          const resp = await fetch(`${SERVER_URL}/api/drives/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              vehicleId,
              vehicleName,
              startPosition: null,
              driverId: user?.id || null,
              driverName: user?.name || user?.username || 'Unknown',
            }),
          });
          if (resp.ok) {
            const data = await resp.json();
            set({ activeDriveId: data.id });
            get()._getCurrentPosition().then((startPosition) => {
              if (startPosition && data.id) {
                fetch(`${SERVER_URL}/api/drives/${data.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ startPosition }),
                }).catch(() => {});
                get()._pushVehiclePosition(startPosition.lat, startPosition.lng);
              }
            });
          }
        } catch {}
      },

      _endDrive: async () => {
        const { token, activeDriveId, user } = get();
        // Clear synchronously up-front so a subsequent _startDrive (switch) can't
        // have its new id wiped, and so a retry can't double-stop.
        set({ activeDriveId: null });
        if (!token) return;
        const endPosition = await get()._getCurrentPosition();
        let driveIds = [];
        if (activeDriveId) driveIds.push(activeDriveId);

        // Recovery: also stop ANY ongoing drive owned by this user on the server,
        // so "stop driving" reliably closes the trip even if local state is stale.
        try {
          if (user?.id) {
            const r = await fetch(`${SERVER_URL}/api/drives?driverId=${encodeURIComponent(user.id)}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (r.ok) {
              const list = await r.json();
              for (const d of (Array.isArray(list) ? list : [])) {
                if (!d.endedAt && d.id && !driveIds.includes(d.id)) driveIds.push(d.id);
              }
            }
          }
        } catch {}

        for (const id of driveIds) {
          try {
            await fetch(`${SERVER_URL}/api/drives/${id}/stop`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ endPosition }),
            });
          } catch {}
        }
      },

      selectVehicle: async (vehicleId, vehicleName) => {
        // Optimistic: update UI instantly, then talk to the server in the background.
        set({ selectedVehicleId: vehicleId, selectedVehicleName: vehicleName || null, isDriving: true });
        get()._startLocationTracking();
        showDrivingNotification(vehicleName || '');
        const { token } = get();
        if (!token) return;
        fetch(`${SERVER_URL}/api/auth/select-vehicle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ vehicleId }),
        }).catch(() => {});
        get()._startDrive(vehicleId, vehicleName || '');
      },

      stopDriving: async () => {
        // Clear UI state immediately so the button responds instantly, then end
        // the drive + release the vehicle in the background.
        set({ selectedVehicleId: null, selectedVehicleName: null, isDriving: false });
        get()._stopLocationTracking();
        clearDrivingNotification();
        get()._endDrive();
        const { token } = get();
        if (!token) return;
        fetch(`${SERVER_URL}/api/auth/select-vehicle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ vehicleId: null }),
        }).catch(() => {});
      },

      switchVehicle: async (vehicleId, vehicleName) => {
        get()._stopLocationTracking();
        get()._endDrive(); // captures + clears the old drive id synchronously
        set({ selectedVehicleId: vehicleId, selectedVehicleName: vehicleName || null, isDriving: true });
        get()._startLocationTracking();
        showDrivingNotification(vehicleName || '');
        const { token } = get();
        if (token) {
          fetch(`${SERVER_URL}/api/auth/select-vehicle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ vehicleId }),
          }).catch(() => {});
        }
        get()._startDrive(vehicleId, vehicleName || '');
      },

      login: async (username, password) => {
        set({ loading: true, error: null });
        try {
          const resp = await fetch(`${SERVER_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || 'Login failed');
          }
          const data = await resp.json();
          set({ token: data.token, user: data.user, loading: false });
          return data;
        } catch (err) {
          set({ loading: false, error: err.message });
          throw err;
        }
      },

      logout: () => {
        // Release any vehicle this driver was holding + close any open drive on
        // the server BEFORE we drop the token, otherwise the car stays stuck as
        // "In use by <name>" for everyone else even though they've left.
        const { token, selectedVehicleId } = get();
        if (token) {
          if (selectedVehicleId) {
            fetch(`${SERVER_URL}/api/auth/select-vehicle`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ vehicleId: null }),
            }).catch(() => {});
          }
          get()._endDrive();
        }
        if (_locationSub) { try { _locationSub.remove(); } catch {} _locationSub = null; }
        set({ token: null, user: null, selectedVehicleId: null, isDriving: false, activeDriveId: null });
      },

      fetchMe: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const resp = await fetch(`${SERVER_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          // Only clear session on explicit "token rejected" response
          if (resp.status === 401) {
            set({ token: null, user: null });
            return;
          }
          if (!resp.ok) return; // Server error or network timeout — keep existing session
          const data = await resp.json();
          set({ user: data.user ?? data });
        } catch {
          // No network / server offline — keep the stored token so user stays logged in
          return;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ token: state.token, user: state.user, selectedVehicleId: state.selectedVehicleId, selectedVehicleName: state.selectedVehicleName, isDriving: state.isDriving, activeDriveId: state.activeDriveId }),
    }
  )
);
