import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useTripStore = create(
  persist(
    (set, get) => ({
      trips: [],

      addTrip: ({ name, date, description }) => {
        const id = `trip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const trip = {
          id,
          name,
          date,
          description: description || '',
          vehicles: [],
        };
        set((state) => ({ trips: [trip, ...state.trips] }));
        return id;
      },

      updateTrip: (tripId, updates) => {
        set((state) => ({
          trips: state.trips.map((t) =>
            t.id === tripId ? { ...t, ...updates } : t
          ),
        }));
      },

      deleteTrip: (tripId) => {
        set((state) => ({
          trips: state.trips.filter((t) => t.id !== tripId),
        }));
      },

      addVehicleToTrip: (tripId, vehicleId) => {
        set((state) => ({
          trips: state.trips.map((t) => {
            if (t.id !== tripId) return t;
            // Don't add the same vehicle twice
            if (t.vehicles.some((v) => v.vehicleId === vehicleId)) return t;
            return {
              ...t,
              vehicles: [
                ...t.vehicles,
                {
                  vehicleId,
                  driver: '',
                  seats: 4,
                  departureLocation: '',
                  passengers: [],
                },
              ],
            };
          }),
        }));
      },

      removeVehicleFromTrip: (tripId, vehicleId) => {
        set((state) => ({
          trips: state.trips.map((t) => {
            if (t.id !== tripId) return t;
            return {
              ...t,
              vehicles: t.vehicles.filter((v) => v.vehicleId !== vehicleId),
            };
          }),
        }));
      },

      updateTripVehicle: (tripId, vehicleId, updates) => {
        set((state) => ({
          trips: state.trips.map((t) => {
            if (t.id !== tripId) return t;
            return {
              ...t,
              vehicles: t.vehicles.map((v) =>
                v.vehicleId === vehicleId ? { ...v, ...updates } : v
              ),
            };
          }),
        }));
      },

      addPassenger: (tripId, vehicleId, passengerName) => {
        set((state) => ({
          trips: state.trips.map((t) => {
            if (t.id !== tripId) return t;
            return {
              ...t,
              vehicles: t.vehicles.map((v) => {
                if (v.vehicleId !== vehicleId) return v;
                return {
                  ...v,
                  passengers: [...v.passengers, passengerName],
                };
              }),
            };
          }),
        }));
      },

      removePassenger: (tripId, vehicleId, passengerIndex) => {
        set((state) => ({
          trips: state.trips.map((t) => {
            if (t.id !== tripId) return t;
            return {
              ...t,
              vehicles: t.vehicles.map((v) => {
                if (v.vehicleId !== vehicleId) return v;
                return {
                  ...v,
                  passengers: v.passengers.filter((_, i) => i !== passengerIndex),
                };
              }),
            };
          }),
        }));
      },
    }),
    {
      name: 'trip-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
