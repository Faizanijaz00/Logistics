import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../config/api';

const DEFAULT_PASSENGERS = [
  { id: 'default-1', name: 'Ali', isDriver: true, isVip: false, active: true },
  { id: 'default-2', name: 'Adam', isDriver: true, isVip: false, active: true },
  { id: 'default-3', name: 'Aristotle', isDriver: true, isVip: false, active: true },
  { id: 'default-4', name: 'Panos', isDriver: true, isVip: false, active: true },
  { id: 'default-5', name: 'Faizan', isDriver: true, isVip: false, active: true },
  { id: 'default-6', name: 'Fivos', isDriver: true, isVip: false, active: true },
  { id: 'default-7', name: 'Aris', isDriver: true, isVip: false, active: true },
  { id: 'default-8', name: 'AR', isDriver: true, isVip: false, active: true },
];

export const usePassengerStore = create(
  persist(
    (set, get) => ({
      passengers: [],
      _hydrated: false,
      _fetched: false,

      /**
       * Fetch master passenger list from the server.
       * Falls back to persisted/default data on failure.
       */
      fetchPassengers: async () => {
        try {
          const resp = await fetch(`${SERVER_URL}/api/passengers`);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data = await resp.json();
          set({ passengers: data, _fetched: true });
        } catch (err) {
          console.warn('[PassengerStore] fetchPassengers failed, using local cache:', err.message);
          // If we have no local passengers at all, use defaults
          const current = get().passengers;
          if (!current || current.length === 0) {
            set({ passengers: [...DEFAULT_PASSENGERS] });
          }
        }
      },

      /**
       * Add a new passenger via the server.
       * Falls back to local-only on failure.
       */
      addPassenger: async (name, isDriver = false, isVip = false) => {
        const trimmed = (name || '').trim();
        if (!trimmed) return;

        // Check local duplicates first
        if (get().passengers.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;

        try {
          const resp = await fetch(`${SERVER_URL}/api/passengers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: trimmed, isVip }),
          });
          if (resp.ok) {
            const newPassenger = await resp.json();
            set((state) => ({
              passengers: [...state.passengers, newPassenger],
            }));
            return;
          }
          // 409 = duplicate on server, don't add locally
          if (resp.status === 409) return;
        } catch (err) {
          console.warn('[PassengerStore] addPassenger server failed, adding locally:', err.message);
        }

        // Fallback: add locally only
        const localId = `pax-local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        set((state) => ({
          passengers: [...state.passengers, { id: localId, name: trimmed, isDriver, isVip, active: true }],
        }));
      },

      /**
       * Remove a passenger by ID via the server.
       * Cannot remove drivers.
       */
      removePassenger: async (id) => {
        const passenger = get().passengers.find((p) => p.id === id);
        if (!passenger) return;
        if (passenger.isDriver) return; // Cannot remove drivers

        try {
          const resp = await fetch(`${SERVER_URL}/api/passengers/${id}`, {
            method: 'DELETE',
          });
          if (resp.ok || resp.status === 404) {
            set((state) => ({
              passengers: state.passengers.filter((p) => p.id !== id),
            }));
            return;
          }
          if (resp.status === 403) return; // Server says can't delete
        } catch (err) {
          console.warn('[PassengerStore] removePassenger server failed, removing locally:', err.message);
        }

        // Fallback: remove locally
        set((state) => ({
          passengers: state.passengers.filter((p) => p.id !== id),
        }));
      },

      /**
       * Toggle VIP status for a passenger by ID via the server.
       */
      toggleVip: async (id) => {
        const passenger = get().passengers.find((p) => p.id === id);
        if (!passenger) return;

        const newVip = !passenger.isVip;

        // Optimistic local update
        set((state) => ({
          passengers: state.passengers.map((p) =>
            p.id === id ? { ...p, isVip: newVip } : p
          ),
        }));

        try {
          const resp = await fetch(`${SERVER_URL}/api/passengers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isVip: newVip }),
          });
          if (resp.ok) {
            const updated = await resp.json();
            set((state) => ({
              passengers: state.passengers.map((p) =>
                p.id === id ? updated : p
              ),
            }));
          }
        } catch (err) {
          console.warn('[PassengerStore] toggleVip server failed, kept local update:', err.message);
        }
      },

      /**
       * Set driver status for a passenger.
       */
      setDriver: (name, isDriver) => {
        set((state) => ({
          passengers: state.passengers.map((p) =>
            p.name === name ? { ...p, isDriver } : p
          ),
        }));
      },
    }),
    {
      name: 'passenger-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Pre-seed with default passengers on first load
        if (state && (!state.passengers || state.passengers.length === 0)) {
          state.passengers = [...DEFAULT_PASSENGERS];
        }
        if (state) {
          state._hydrated = true;
        }
      },
    }
  )
);
