// Mapbox Directions helper — estimated driving duration + distance between two
// points. Used to show "how long the ride takes" before a rider requests it.
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

export async function getRouteEstimate(pickup, dest) {
  if (pickup?.lat == null || dest?.lat == null || !MAPBOX_TOKEN) return null;
  try {
    const coords = `${pickup.lng},${pickup.lat};${dest.lng},${dest.lat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}`
      + `?access_token=${MAPBOX_TOKEN}&overview=false`;
    const res = await fetch(url);
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;
    return {
      durationMin: Math.max(1, Math.round(route.duration / 60)),
      distanceKm: route.distance / 1000,
    };
  } catch {
    return null;
  }
}
