import { create } from 'zustand';

const API = 'http://localhost:3001';

function getToken() {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    return JSON.parse(raw)?.state?.token || null;
  } catch { return null; }
}

// Default car images from /public/cars/ — used as fallback if API is unavailable
const defaultImages = [
  { id: 'img-1', name: 'Mercedes GLE', url: '/cars/merc.png' },
  { id: 'img-2', name: 'Range Rover', url: '/cars/Range.png' },
  { id: 'img-3', name: 'Vauxhall Insignia', url: '/cars/Insignia.png' },
  { id: 'img-4', name: 'Van', url: '/cars/van.png' },
  { id: 'img-5', name: 'Mercedes V Class', url: '/cars/v-class.png' },
  { id: 'img-6', name: 'Mercedes S Class', url: '/cars/s-class.png' },
  { id: 'upload-1771856217515', name: 'Custom Car 1', url: '/cars/upload-1771856217515.png' },
  { id: 'upload-1771861220653', name: 'Custom Car 2', url: '/cars/upload-1771861220653.png' },
  { id: 'upload-1771861229403', name: 'Custom Car 3', url: '/cars/upload-1771861229403.png' },
  { id: 'upload-1771861237097', name: 'Custom Car 4', url: '/cars/upload-1771861237097.png' },
  { id: 'upload-1771861244767', name: 'Custom Car 5', url: '/cars/upload-1771861244767.png' },
  { id: 'upload-1771861252322', name: 'Custom Car 6', url: '/cars/upload-1771861252322.png' },
  { id: 'upload-1771861806061', name: 'Custom Car 7', url: '/cars/upload-1771861806061.png' },
  { id: 'upload-1771861861400', name: 'Custom Car 8', url: '/cars/upload-1771861861400.png' },
];

export const useCarImageStore = create((set, get) => ({
  images: defaultImages,

  // Fetch images from backend (source of truth), merge with defaults
  fetchImages: async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/car-images`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const apiImages = await res.json();
      if (!apiImages?.length) return;
      // Merge: API images take precedence, then any defaults not in API
      const apiIds = new Set(apiImages.map((img) => img.id));
      const merged = [
        ...apiImages,
        ...defaultImages.filter((img) => !apiIds.has(img.id)),
      ];
      set({ images: merged });
    } catch { /* silently fall back to defaults */ }
  },

  // Get all images
  getImages: () => get().images,

  // Get image by ID
  getImageById: (id) => get().images.find((img) => img.id === id),

  // Add a new image — persist to backend
  addImage: async (name, url) => {
    const id = `img-${Date.now()}`;
    const newImage = { id, name, url };
    set((state) => ({ images: [...state.images, newImage] }));
    const token = getToken();
    if (token) {
      await fetch(`${API}/api/car-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newImage),
      }).catch(() => {});
    }
    return newImage;
  },

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
}));
