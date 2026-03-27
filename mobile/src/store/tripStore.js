import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../config/api';
import { useAuthStore } from './authStore';
import { usePassengerStore } from './passengerStore';

/**
 * Normalise a passenger entry to { name, active }.
 * Handles both legacy string format and new object format.
 */
function normalizePassenger(p) {
  if (typeof p === 'string') return { name: p, active: true };
  if (p && typeof p === 'object' && typeof p.name === 'string') {
    return { name: p.name, active: p.active !== false };
  }
  return { name: String(p), active: true };
}

/**
 * Get display name from a passenger (handles both string and object).
 */
export function getPassengerName(p) {
  if (typeof p === 'string') return p;
  return p?.name || '';
}

/**
 * Check if passenger is active (handles both string and object).
 */
export function isPassengerActive(p) {
  if (typeof p === 'string') return true;
  return p?.active !== false;
}

// --- API helpers ---

function getAuthHeaders() {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

async function fetchTrips() {
  return apiFetch('/api/trips');
}

async function createTrip(trip) {
  return apiFetch('/api/trips', {
    method: 'POST',
    body: JSON.stringify(trip),
  });
}

async function updateTripOnServer(id, trip) {
  return apiFetch(`/api/trips/${id}`, {
    method: 'PUT',
    body: JSON.stringify(trip),
  });
}

async function deleteTripOnServer(id) {
  return apiFetch(`/api/trips/${id}`, {
    method: 'DELETE',
  });
}

// --- Helper: apply a mutation locally, push to server, then refresh ---

function mutateTrip(set, get, tripId, mutator) {
  const trips = get().trips;
  const trip = trips.find((t) => t.id === tripId);
  if (!trip) return;

  const updated = mutator(trip);
  if (updated === trip) return; // no change

  // Optimistic local update
  set({ trips: trips.map((t) => (t.id === tripId ? updated : t)) });

  // Push to server then refresh
  updateTripOnServer(tripId, updated)
    .then(() => fetchTrips())
    .then((serverTrips) => set({ trips: serverTrips }))
    .catch((err) => console.warn('[tripStore] sync error:', err.message));
}

/**
 * Ensures every trip has the full fixed passenger pool.
 * Missing passengers are added as inactive. Existing ones are untouched.
 */
function backfillPassengers(trips) {
  const pool = usePassengerStore.getState().passengers || [];
  const fixedPool = pool.filter(p => !p.isVip);
  if (!fixedPool.length) return trips;

  return trips.map(trip => {
    const existing = trip.passengers || [];
    const existingNames = new Set(existing.map(p => p.name));
    const missing = fixedPool
      .filter(p => !existingNames.has(p.name))
      .map(p => ({ name: p.name, active: false, isDriver: !!p.isDriver }));
    if (!missing.length) return trip;
    return { ...trip, passengers: [...existing, ...missing] };
  });
}

export const useTripStore = create(
  persist(
    (set, get) => ({
  trips: [],
  loading: false,
  error: null,

  // Load all trips from the server, backfill fixed passenger pool on each
  loadTrips: async () => {
    set({ loading: true, error: null });
    try {
      let trips = await fetchTrips();
      trips = backfillPassengers(trips);
      set({ trips, loading: false });
    } catch (err) {
      console.warn('[tripStore] loadTrips error, using cached data:', err.message);
      // Backfill cached trips too
      const cached = get().trips;
      if (cached.length) set({ trips: backfillPassengers(cached) });
      set({ loading: false, error: err.message });
    }
  },

  addTrip: async ({ name, date, description }) => {
    const id = `trip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Pre-populate with the fixed passenger/driver pool (all toggled off by default)
    const pool = usePassengerStore.getState().passengers || [];
    const preloadedPassengers = pool
      .filter(p => !p.isVip) // Only fixed pool, not VIP guests
      .map(p => ({ name: p.name, active: false, isDriver: !!p.isDriver }));

    const trip = {
      id,
      name,
      date,
      description: description || '',
      passengers: preloadedPassengers,
      vehicles: [],
    };

    // Optimistic local update
    set((state) => ({ trips: [trip, ...state.trips] }));

    try {
      await createTrip(trip);
      const serverTrips = await fetchTrips();
      set({ trips: serverTrips });
    } catch (err) {
      console.warn('[tripStore] addTrip sync error:', err.message);
    }

    return id;
  },

  updateTrip: (tripId, updates) => {
    mutateTrip(set, get, tripId, (trip) => ({ ...trip, ...updates }));
  },

  deleteTrip: async (tripId) => {
    // Optimistic local removal
    set((state) => ({ trips: state.trips.filter((t) => t.id !== tripId) }));

    try {
      await deleteTripOnServer(tripId);
      const serverTrips = await fetchTrips();
      set({ trips: serverTrips });
    } catch (err) {
      console.warn('[tripStore] deleteTrip sync error:', err.message);
    }
  },

  addVehicleToTrip: (tripId, vehicleId, seats) => {
    mutateTrip(set, get, tripId, (trip) => {
      if (trip.vehicles.some((v) => v.vehicleId === vehicleId)) return trip;
      return {
        ...trip,
        vehicles: [
          ...trip.vehicles,
          {
            vehicleId,
            driver: '',
            seats: seats || 4,
            departureLocation: '',
            passengers: [],
            completed: false,
          },
        ],
      };
    });
  },

  removeVehicleFromTrip: (tripId, vehicleId) => {
    mutateTrip(set, get, tripId, (trip) => ({
      ...trip,
      vehicles: trip.vehicles.filter((v) => v.vehicleId !== vehicleId),
    }));
  },

  updateTripVehicle: (tripId, vehicleId, updates) => {
    mutateTrip(set, get, tripId, (trip) => ({
      ...trip,
      vehicles: trip.vehicles.map((v) =>
        v.vehicleId === vehicleId ? { ...v, ...updates } : v
      ),
    }));
  },

  // ── Per-vehicle passenger actions (legacy, backwards compatible) ──

  addPassenger: (tripId, vehicleId, passengerName) => {
    mutateTrip(set, get, tripId, (trip) => ({
      ...trip,
      vehicles: trip.vehicles.map((v) => {
        if (v.vehicleId !== vehicleId) return v;
        return {
          ...v,
          passengers: [...v.passengers, { name: passengerName, active: true }],
        };
      }),
    }));
  },

  removePassenger: (tripId, vehicleId, passengerIndex) => {
    mutateTrip(set, get, tripId, (trip) => ({
      ...trip,
      vehicles: trip.vehicles.map((v) => {
        if (v.vehicleId !== vehicleId) return v;
        return {
          ...v,
          passengers: v.passengers.filter((_, i) => i !== passengerIndex),
        };
      }),
    }));
  },

  togglePassenger: (tripId, vehicleId, passengerIndex) => {
    mutateTrip(set, get, tripId, (trip) => ({
      ...trip,
      vehicles: trip.vehicles.map((v) => {
        if (v.vehicleId !== vehicleId) return v;
        return {
          ...v,
          passengers: v.passengers.map((p, i) => {
            if (i !== passengerIndex) return p;
            const norm = normalizePassenger(p);
            return { ...norm, active: !norm.active };
          }),
        };
      }),
    }));
  },

  // ── Trip-level passenger actions ──

  addTripPassenger: (tripId, name, isDriver = false) => {
    mutateTrip(set, get, tripId, (trip) => {
      const passengers = trip.passengers || [];
      if (passengers.some((p) => p.name === name)) return trip;
      return {
        ...trip,
        passengers: [...passengers, { name, active: true, isDriver }],
      };
    });
  },

  removeTripPassenger: (tripId, name) => {
    mutateTrip(set, get, tripId, (trip) => ({
      ...trip,
      passengers: (trip.passengers || []).filter((p) => p.name !== name),
      vehicles: trip.vehicles.map((v) => ({
        ...v,
        passengers: (v.passengers || []).filter((pName) => {
          const n = typeof pName === 'string' ? pName : pName?.name;
          return n !== name;
        }),
      })),
    }));
  },

  toggleTripPassenger: (tripId, name) => {
    mutateTrip(set, get, tripId, (trip) => {
      const passengers = (trip.passengers || []).map((p) => {
        if (p.name !== name) return p;
        return { ...p, active: !p.active };
      });
      const toggledPassenger = passengers.find((p) => p.name === name);
      const nowInactive = toggledPassenger && !toggledPassenger.active;
      return {
        ...trip,
        passengers,
        vehicles: nowInactive
          ? trip.vehicles.map((v) => ({
              ...v,
              passengers: (v.passengers || []).filter((pName) => {
                const n = typeof pName === 'string' ? pName : pName?.name;
                return n !== name;
              }),
            }))
          : trip.vehicles,
      };
    });
  },

  assignPassengerToVehicle: (tripId, vehicleId, name) => {
    mutateTrip(set, get, tripId, (trip) => {
      const tripPassenger = (trip.passengers || []).find((p) => p.name === name);
      if (!tripPassenger || !tripPassenger.active) return trip;
      return {
        ...trip,
        vehicles: trip.vehicles.map((v) => {
          if (v.vehicleId !== vehicleId) return v;
          const existingNames = (v.passengers || []).map((pName) =>
            typeof pName === 'string' ? pName : pName?.name
          );
          if (existingNames.includes(name)) return v;
          return {
            ...v,
            passengers: [...(v.passengers || []), name],
          };
        }),
      };
    });
  },

  completeTripVehicle: (tripId, vehicleId) => {
    mutateTrip(set, get, tripId, (trip) => ({
      ...trip,
      vehicles: trip.vehicles.map((v) =>
        v.vehicleId === vehicleId ? { ...v, completed: true } : v
      ),
    }));
  },

  unassignPassengerFromVehicle: (tripId, vehicleId, name) => {
    mutateTrip(set, get, tripId, (trip) => ({
      ...trip,
      vehicles: trip.vehicles.map((v) => {
        if (v.vehicleId !== vehicleId) return v;
        return {
          ...v,
          passengers: (v.passengers || []).filter((pName) => {
            const n = typeof pName === 'string' ? pName : pName?.name;
            return n !== name;
          }),
        };
      }),
    }));
  },
}),
    {
      name: 'trip-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ trips: state.trips }),
    }
  )
);

/**
 * Returns true if ALL vehicles in the trip have completed: true.
 * A trip with no vehicles is NOT considered complete.
 */
export function isTripComplete(trip) {
  if (!trip.vehicles || trip.vehicles.length === 0) return false;
  return trip.vehicles.every((v) => v.completed === true);
}
