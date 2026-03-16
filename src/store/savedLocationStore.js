import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultLocations = [
  {
    id: 'loc-basement',
    name: 'Basement',
    address: 'NW1 1BY',
    position: { lat: 51.5252, lng: -0.1387 },
  },
];

export const useSavedLocationStore = create(
  persist(
    (set, get) => ({
      locations: defaultLocations,

      addLocation: (name, address, lat, lng) =>
        set((state) => ({
          locations: [
            ...state.locations,
            { id: `loc-${Date.now()}`, name, address, position: { lat, lng } },
          ],
        })),

      removeLocation: (id) =>
        set((state) => ({
          locations: state.locations.filter((l) => l.id !== id),
        })),

      updateLocation: (id, updates) =>
        set((state) => ({
          locations: state.locations.map((l) =>
            l.id === id ? { ...l, ...updates } : l
          ),
        })),
    }),
    {
      name: 'saved-locations-storage',
    }
  )
);
