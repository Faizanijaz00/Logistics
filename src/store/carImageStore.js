import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Default car images from /public/cars/
const defaultImages = [
  {
    id: 'img-1',
    name: 'Mercedes GLE',
    url: '/cars/merc.png',
  },
  {
    id: 'img-2',
    name: 'Range Rover',
    url: '/cars/Range.png',
  },
  {
    id: 'img-3',
    name: 'Vauxhall Insignia',
    url: '/cars/Insignia.png',
  },
  {
    id: 'img-4',
    name: 'Van',
    url: '/cars/van.png',
  },
  {
    id: 'img-5',
    name: 'Mercedes V Class',
    url: '/cars/v-class.png',
  },
  {
    id: 'img-6',
    name: 'Mercedes S Class',
    url: '/cars/s-class.png',
  },
  { id: 'upload-1771856217515', name: 'Custom Car 1', url: '/cars/upload-1771856217515.png' },
  { id: 'upload-1771861220653', name: 'Custom Car 2', url: '/cars/upload-1771861220653.png' },
  { id: 'upload-1771861229403', name: 'Custom Car 3', url: '/cars/upload-1771861229403.png' },
  { id: 'upload-1771861237097', name: 'Custom Car 4', url: '/cars/upload-1771861237097.png' },
  { id: 'upload-1771861244767', name: 'Custom Car 5', url: '/cars/upload-1771861244767.png' },
  { id: 'upload-1771861252322', name: 'Custom Car 6', url: '/cars/upload-1771861252322.png' },
  { id: 'upload-1771861806061', name: 'Custom Car 7', url: '/cars/upload-1771861806061.png' },
  { id: 'upload-1771861861400', name: 'Custom Car 8', url: '/cars/upload-1771861861400.png' },
];

export const useCarImageStore = create(
  persist(
    (set, get) => ({
      images: defaultImages,

      // Get all images
      getImages: () => get().images,

      // Get image by ID
      getImageById: (id) => get().images.find((img) => img.id === id),

      // Add a new image
      addImage: (name, url) =>
        set((state) => ({
          images: [
            ...state.images,
            { id: `img-${Date.now()}`, name, url },
          ],
        })),

      // Remove an image
      removeImage: (imageId) =>
        set((state) => ({
          images: state.images.filter((img) => img.id !== imageId),
        })),

      // Update an image
      updateImage: (imageId, updates) =>
        set((state) => ({
          images: state.images.map((img) =>
            img.id === imageId ? { ...img, ...updates } : img
          ),
        })),

      // Reset to default images
      resetToDefaults: () => set({ images: defaultImages }),
    }),
    {
      name: 'car-images-storage',
      version: 6,
      migrate: (persisted) => {
        // Keep any existing custom images, but ensure all defaults are present
        const existing = persisted?.images || [];
        const existingIds = new Set(existing.map((img) => img.id));
        const merged = [
          ...existing,
          ...defaultImages.filter((img) => !existingIds.has(img.id)),
        ];
        return { images: merged };
      },
    }
  )
);
