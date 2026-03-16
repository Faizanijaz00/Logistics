// Google Maps API Configuration
// Replace with your actual Google Maps API key
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';

// Default map settings
export const defaultCenter = { lat: 51.507, lng: -0.09 }; // London
export const defaultZoom = 14;

// Clean minimal map style - area names & main road labels visible, small roads only when zoomed
export const cleanMapStyles = [
  // Hide all POI labels and icons
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  // Hide transit
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  // Simplified colors
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#e0e0e0' }] },

  // Show area / neighbourhood / locality names
  { featureType: 'administrative.locality', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#333333' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#666666' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 2 }] },

  // Show highway / arterial road labels (main roads)
  { featureType: 'road.highway', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#333333' }] },
  { featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#555555' }] },
  { featureType: 'road.arterial', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 2 }] },

  // Show local / small road labels but only at high zoom (Google handles this automatically)
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#999999' }] },
  { featureType: 'road.local', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 2 }] },
  // Make local road labels smaller so they only appear when zoomed in
  { featureType: 'road.local', elementType: 'labels.text', stylers: [{ weight: 0.5 }] },

  // Hide all label icons (route shields, etc) to keep it clean
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },

  // Water labels
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
];

// Default map options
export const defaultMapOptions = {
  styles: cleanMapStyles,
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  clickableIcons: false,
};

// Libraries to load
export const googleMapsLibraries = ['places', 'geometry'];
