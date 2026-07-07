// Live fleet map — Mapbox GL (Google Maps billing is off, so the whole app is
// moving to Mapbox like the mobile app did). Renders vehicle markers (car image
// or coloured dot + label), saved-location pins, the user's location, and
// fits the view to everything. Token comes from VITE_MAPBOX_TOKEN.
import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useSavedLocationStore } from '../../../store';
import { useCarImageStore } from '../../../store/carImageStore';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const LONDON = [-0.118, 51.509];

function carDot(active) {
  const c = document.createElement('div');
  c.style.cssText = `width:20px;height:20px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.4);background:${active ? '#018a16' : '#333'};`;
  return c;
}

function vehicleElement(v, imageUrl) {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;';
  const top = document.createElement('div');
  const active = v.status === 'active';
  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = 'height:44px;width:auto;display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));';
    img.onerror = () => { top.innerHTML = ''; top.appendChild(carDot(active)); };
    top.appendChild(img);
  } else {
    top.appendChild(carDot(active));
  }
  el.appendChild(top);
  const label = document.createElement('div');
  label.textContent = `${v.make || ''} ${v.model || ''}`.trim();
  label.style.cssText = 'margin-top:2px;background:#111;color:#fff;font-size:10px;font-weight:700;letter-spacing:.02em;padding:2px 7px;border-radius:6px;white-space:nowrap;font-family:-apple-system,sans-serif;';
  el.appendChild(label);
  return el;
}

function vehiclePopupHtml(v) {
  const driver = v.currentDriver ? `<div style="font-size:12px;color:#444;margin-top:3px">Driver: ${v.currentDriver}</div>` : '';
  const dest = v.destination ? `<div style="font-size:12px;color:#3B82F6;margin-top:3px">→ ${v.destination}</div>` : '';
  return `<div style="font-family:-apple-system,sans-serif;padding:2px">
    <strong>${v.make || ''} ${v.model || ''}</strong><br/>
    <span style="font-family:monospace;font-size:13px">${v.licensePlate || ''}</span>${driver}${dest}</div>`;
}

function locationElement() {
  const el = document.createElement('div');
  el.innerHTML = `<svg width="34" height="42" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 2 C10.6 2 3 9.6 3 19 C3 30.5 20 46 20 46 C20 46 37 30.5 37 19 C37 9.6 29.4 2 20 2 Z" fill="#1e293b" stroke="#fff" stroke-width="1.5"/>
    <polygon points="20,9 10,17 12,17 12,27 17,27 17,22 23,22 23,27 28,27 28,17 30,17" fill="#fff"/>
    <rect x="17" y="22" width="6" height="5" rx="1" fill="#1e293b"/></svg>`;
  el.style.cursor = 'pointer';
  return el;
}

const containerStyle = { width: '100%', height: '100%', minHeight: '600px' };

export function LiveMap({ vehicles = [], filters = {} }) {
  const { locations } = useSavedLocationStore();
  const { images } = useCarImageStore();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [ready, setReady] = useState(false);

  const imageUrlFor = useCallback(
    (imageId) => {
      if (!imageId) return null;
      // A full URL imageId is an uploaded vehicle photo — use it directly.
      if (/^https?:\/\//i.test(imageId)) return imageId;
      return (images || []).find((i) => i.id === imageId)?.url || null;
    },
    [images]
  );

  // Init map once.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      projection: 'mercator',
      center: LONDON,
      zoom: 12,
      attributionControl: false,
    });
    mapRef.current = map;
    map.on('load', () => setReady(true));
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // User location (live).
  useEffect(() => {
    if (!navigator.geolocation) return;
    const ok = (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    navigator.geolocation.getCurrentPosition(ok, () => {}, { enableHighAccuracy: true, timeout: 10000 });
    const id = navigator.geolocation.watchPosition(ok, () => {}, { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // (Re)draw vehicle + saved-location markers and fit bounds.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const bounds = new mapboxgl.LngLatBounds();
    let has = false;

    const visible = vehicles.filter((v) => {
      if (v.status === 'active' && filters.showActiveVehicles === false) return false;
      if (v.status === 'parked' && filters.showParkedVehicles === false) return false;
      const lat = parseFloat(v.position?.lat);
      const lng = parseFloat(v.position?.lng);
      return !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0);
    });

    visible.forEach((v) => {
      const lat = parseFloat(v.position.lat);
      const lng = parseFloat(v.position.lng);
      const marker = new mapboxgl.Marker({ element: vehicleElement(v, imageUrlFor(v.imageId)), anchor: 'bottom' })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 30, closeButton: false }).setHTML(vehiclePopupHtml(v)))
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend([lng, lat]);
      has = true;
    });

    locations.forEach((loc) => {
      const lat = loc.position?.lat;
      const lng = loc.position?.lng;
      if (lat == null || lng == null) return;
      const marker = new mapboxgl.Marker({ element: locationElement(), anchor: 'bottom' })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 28, closeButton: false }).setHTML(
          `<div style="font-family:-apple-system,sans-serif;padding:2px"><strong>${loc.name || 'Location'}</strong>${loc.address ? `<div style="font-size:11px;color:#888;margin-top:2px">${loc.address}</div>` : ''}</div>`
        ))
        .addTo(map);
      markersRef.current.push(marker);
      bounds.extend([lng, lat]);
      has = true;
    });

    // Guard against a stray position blowing the view out to the whole globe.
    if (has) {
      const span = Math.max(
        Math.abs(bounds.getEast() - bounds.getWest()),
        Math.abs(bounds.getNorth() - bounds.getSouth())
      );
      if (span > 5) {
        map.flyTo({ center: bounds.getCenter(), zoom: 11 });
      } else {
        map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 600 });
      }
    }
  }, [vehicles, locations, ready, filters, imageUrlFor]);

  // User location dot (create/update).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !userLocation) return;
    const lngLat = [userLocation.lng, userLocation.lat];
    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#4285F4;border:2.5px solid #fff;box-shadow:0 0 8px rgba(66,133,244,.6);';
      userMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
    } else {
      userMarkerRef.current.setLngLat(lngLat);
    }
  }, [userLocation, ready]);

  const panToUser = useCallback(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], zoom: 15 });
    }
  }, [userLocation]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '600px' }}>
      <div ref={containerRef} style={containerStyle} />
      {userLocation && (
        <button
          onClick={panToUser}
          title="Go to my location"
          style={{
            position: 'absolute', bottom: 24, right: 24, width: 44, height: 44, borderRadius: 22,
            background: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </button>
      )}
    </div>
  );
}
