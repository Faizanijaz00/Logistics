import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useActivityStore = create(
  persist(
    (set, get) => ({
      activities: [],

      addActivity: ({ vehicleId, vehicleName, type, description, details = {} }) =>
        set((state) => ({
          activities: [
            {
              id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              vehicleId,
              vehicleName,
              type,
              description,
              details,
              timestamp: new Date().toISOString(),
            },
            ...state.activities,
          ].slice(0, 500),
        })),

      getActivitiesByVehicle: (vehicleId) =>
        get().activities.filter((a) => a.vehicleId === vehicleId),

      getActivitiesByDateRange: (vehicleId, startDate, endDate) =>
        get().activities.filter((a) => {
          if (a.vehicleId !== vehicleId) return false;
          const t = new Date(a.timestamp);
          return t >= startDate && t <= endDate;
        }),

      clearActivities: () => set({ activities: [] }),
    }),
    {
      name: 'activity-storage',
      version: 1,
    }
  )
);
