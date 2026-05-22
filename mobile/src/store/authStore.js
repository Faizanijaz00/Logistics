import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      error: null,
      selectedVehicleId: null,
      isDriving: false,
      activeDriveId: null,

      _getCurrentPosition: async () => {
        try {
          const Location = await import('expo-location');
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') return null;
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          return { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch { return null; }
      },

      _startDrive: async (vehicleId, vehicleName) => {
        const { token, _getCurrentPosition } = get();
        if (!token) return;
        try {
          const startPosition = await _getCurrentPosition();
          const resp = await fetch(`${SERVER_URL}/api/drives/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ vehicleId, vehicleName, startPosition }),
          });
          if (resp.ok) {
            const data = await resp.json();
            set({ activeDriveId: data.id });
          }
        } catch {}
      },

      _endDrive: async () => {
        const { token, activeDriveId, _getCurrentPosition } = get();
        if (!token || !activeDriveId) return;
        try {
          const endPosition = await _getCurrentPosition();
          await fetch(`${SERVER_URL}/api/drives/${activeDriveId}/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ endPosition }),
          });
        } catch {}
        set({ activeDriveId: null });
      },

      selectVehicle: async (vehicleId, vehicleName) => {
        const { _startDrive } = get();
        set({ selectedVehicleId: vehicleId, isDriving: true });
        const { token } = get();
        if (!token) return;
        try {
          await fetch(`${SERVER_URL}/api/auth/select-vehicle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ vehicleId }),
          });
        } catch {}
        await _startDrive(vehicleId, vehicleName || '');
      },
      stopDriving: async () => {
        const { _endDrive } = get();
        await _endDrive();
        set({ selectedVehicleId: null, isDriving: false });
        const { token } = get();
        if (!token) return;
        try {
          await fetch(`${SERVER_URL}/api/auth/select-vehicle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ vehicleId: null }),
          });
        } catch {}
      },
      switchVehicle: async (vehicleId, vehicleName) => {
        const { _endDrive, _startDrive } = get();
        await _endDrive();
        set({ selectedVehicleId: vehicleId, isDriving: true });
        const { token } = get();
        if (!token) return;
        try {
          await fetch(`${SERVER_URL}/api/auth/select-vehicle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ vehicleId }),
          });
        } catch {}
        await _startDrive(vehicleId, vehicleName || '');
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

      logout: () => set({ token: null, user: null, selectedVehicleId: null, isDriving: false }),

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
      partialize: (state) => ({ token: state.token, user: state.user, selectedVehicleId: state.selectedVehicleId, isDriving: state.isDriving, activeDriveId: state.activeDriveId }),
    }
  )
);
