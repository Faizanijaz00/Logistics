/**
 * Route Service — uses Google Maps Directions API
 * Provides real road routes with live traffic ETAs in miles.
 * Requires the Google Maps JS API to be loaded (via LoadScript in App.jsx).
 */

let directionsService = null;

function getDirectionsService() {
  if (!directionsService && window.google?.maps) {
    directionsService = new window.google.maps.DirectionsService();
  }
  return directionsService;
}

/**
 * Calculate route between two points using Google Maps Directions API.
 * Returns real road-following path with traffic-aware duration in miles.
 */
export async function calculateRoute(start, end) {
  const service = getDirectionsService();
  if (!service) {
    console.error('Google Maps Directions Service not available');
    return fallbackRoute(start, end);
  }

  try {
    const result = await new Promise((resolve, reject) => {
      service.route(
        {
          origin: new window.google.maps.LatLng(start.lat, start.lng),
          destination: new window.google.maps.LatLng(end.lat, end.lng),
          travelMode: window.google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: window.google.maps.TrafficModel.BEST_GUESS,
          },
          unitSystem: window.google.maps.UnitSystem.IMPERIAL,
          provideRouteAlternatives: false,
        },
        (response, status) => {
          if (status === 'OK') resolve(response);
          else reject(new Error(`Directions request failed: ${status}`));
        }
      );
    });

    const route = result.routes[0];
    const leg = route.legs[0];

    // Extract the full path from all route steps for maximum detail
    const coordinates = [];
    leg.steps.forEach((step) => {
      step.path.forEach((point) => {
        coordinates.push({ lat: point.lat(), lng: point.lng() });
      });
    });

    // Use duration_in_traffic if available (requires traffic layer enabled on API key)
    const duration = leg.duration_in_traffic || leg.duration;

    // Distance comes in miles from IMPERIAL unit system
    const distanceText = leg.distance.text;
    const durationText = duration.text;

    return {
      coordinates,
      distance: leg.distance.value,
      duration: duration.value,
      distanceText,
      durationText,
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      hasTraffic: !!leg.duration_in_traffic,
    };
  } catch (error) {
    console.error('Route calculation error:', error);
    return fallbackRoute(start, end);
  }
}

/**
 * Geocode an address using Google Maps Geocoder.
 */
export async function geocodeAddress(address) {
  if (!window.google?.maps) return [];

  try {
    const geocoder = new window.google.maps.Geocoder();
    const result = await new Promise((resolve, reject) => {
      geocoder.geocode(
        { address: address + ', UK' },
        (results, status) => {
          if (status === 'OK' && results.length > 0) resolve(results);
          else reject(new Error(`Geocoding failed: ${status}`));
        }
      );
    });

    return result.map((r) => ({
      lat: r.geometry.location.lat(),
      lng: r.geometry.location.lng(),
      displayName: r.formatted_address,
      name: r.address_components[0]?.long_name || r.formatted_address,
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
}

/**
 * Fallback: direct line route when API is unavailable.
 */
function fallbackRoute(start, end) {
  const distanceMeters = haversineDistance(start, end);
  const duration = distanceMeters / (40 * 1000 / 3600);
  const miles = distanceMeters / 1609.344;

  return {
    coordinates: [start, end],
    distance: distanceMeters,
    duration,
    distanceText: miles < 0.5 ? `${Math.round(distanceMeters * 3.281)} ft` : `${miles.toFixed(1)} mi`,
    durationText: formatDuration(duration),
    isEstimate: true,
  };
}

function haversineDistance(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes} mins`;
  return `${minutes} mins`;
}

// London area landmarks for quick destination selection
export const popularDestinations = [
  { name: 'Heathrow Airport', lat: 51.4700, lng: -0.4543 },
  { name: 'London City Airport', lat: 51.5048, lng: 0.0495 },
  { name: 'Kings Cross Station', lat: 51.5308, lng: -0.1238 },
  { name: 'Paddington Station', lat: 51.5154, lng: -0.1755 },
  { name: 'Victoria Station', lat: 51.4952, lng: -0.1439 },
  { name: 'Waterloo Station', lat: 51.5031, lng: -0.1132 },
  { name: 'Liverpool Street Station', lat: 51.5178, lng: -0.0823 },
  { name: 'Canary Wharf', lat: 51.5054, lng: -0.0235 },
  { name: 'The O2 Arena', lat: 51.5030, lng: 0.0032 },
  { name: 'Wembley Stadium', lat: 51.5560, lng: -0.2795 },
];
