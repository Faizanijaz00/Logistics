// Client-side reverse geocoding via Mapbox. We already ship a working Mapbox
// token (the map + destination autocomplete use it), and unlike Nominatim it
// isn't blocked from datacenter/CDN IPs — so this is the reliable path for
// turning stored lat/lng into a readable address for display. Never throws.
import { useState, useEffect } from 'react';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

// Memoise by rounded coordinate so panning/polling doesn't refetch the same spot.
const _cache = new Map();

// Trim Mapbox's long place_name ("7 Caledonian Road, London, N1 9DU, United
// Kingdom") down to the first couple of segments for a compact label.
function shorten(placeName) {
  if (!placeName) return null;
  return placeName.split(',').slice(0, 2).join(',').trim();
}

export async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null || !MAPBOX_TOKEN) return null;
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (_cache.has(key)) return _cache.get(key);
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`
      + `?access_token=${MAPBOX_TOKEN}&types=address,poi,place,locality,neighborhood&limit=1`;
    const resp = await fetch(url);
    const data = await resp.json();
    const feat = Array.isArray(data?.features) ? data.features[0] : null;
    const addr = feat ? shorten(feat.place_name) || feat.text || null : null;
    _cache.set(key, addr);
    return addr;
  } catch {
    return null;
  }
}

// Returns a readable address for the given coords. If `existing` (a server-
// provided address) is passed, it's used as-is and no lookup happens.
export function useReverseGeocode(lat, lng, existing) {
  const [addr, setAddr] = useState(existing || null);
  useEffect(() => {
    if (existing) { setAddr(existing); return; }
    if (lat == null || lng == null) { setAddr(null); return; }
    let alive = true;
    reverseGeocode(lat, lng).then(a => { if (alive) setAddr(a); });
    return () => { alive = false; };
  }, [lat, lng, existing]);
  return addr;
}
