// Reverse geocoding via OpenStreetMap Nominatim — free, no API key or billing.
// Used to turn drive start/end coordinates into a human-readable address.
// Nominatim asks for a descriptive User-Agent and <=1 req/sec; our volume
// (one lookup per drive start/stop) is well within that.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'FleetLogistics/1.0 (fleet ops app)';

// Build a short "Road, Area, City" label from Nominatim's address parts,
// falling back to the full display_name if the parts are sparse.
function shortAddress(data) {
  const a = data?.address || {};
  const road = a.road || a.pedestrian || a.footway || a.neighbourhood || null;
  const area = a.suburb || a.city_district || a.town || a.village || null;
  const city = a.city || a.county || a.state || null;
  const parts = [road, area, city].filter(Boolean);
  const seen = new Set();
  const unique = parts.filter(p => (seen.has(p) ? false : seen.add(p)));
  if (unique.length) return unique.slice(0, 3).join(', ');
  return data?.display_name || null;
}

// Returns a short address string, or null on any failure (never throws — a
// missing address must not break saving a drive).
export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null;
  try {
    const url = `${NOMINATIM_URL}?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const data = await resp.json();
    return shortAddress(data);
  } catch {
    return null;
  }
}
