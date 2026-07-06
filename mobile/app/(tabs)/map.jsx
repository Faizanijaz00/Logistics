import { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { LocateFixed } from 'lucide-react-native';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { getCarImage } from '../../src/config/carImages';
import { useLayout } from '../../src/hooks/useLayout';

// Use the SAME bundled car images as the Fleet page. The map runs inside a
// WebView, so resolve each require()'d asset to a URI it can load (a Metro URL
// in dev, a packaged file:// asset in production). The server does not host
// these images, so loading them over HTTP would 404 and show only a circle.
function getCarImageUrl(imageId) {
  const src = getCarImage(imageId);
  if (!src) return null;
  const resolved = Image.resolveAssetSource(src);
  return resolved?.uri || null;
}

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

function buildMapHTML(vehicles, userLocation) {
  const markers = vehicles
    .map(v => {
      const lat = parseFloat(v.position?.lat);
      const lng = parseFloat(v.position?.lng);
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;
      const imageUri = getCarImageUrl(v.imageId);
      return {
        id: String(v.id),
        lat,
        lng,
        title: String(v.make + ' ' + v.model),
        plate: String(v.licensePlate || ''),
        active: v.status === 'active',
        imageUri,
        destination: v.destination ? String(v.destination) : '',
        driver: v.currentDriver ? String(v.currentDriver) : '',
      };
    })
    .filter(Boolean);

  const userLat = userLocation ? userLocation.lat : null;
  const userLng = userLocation ? userLocation.lng : null;

  // If we have user location, center on user; otherwise fallback to first marker or London
  const center = userLocation
    ? { lat: userLat, lng: userLng }
    : markers.length > 0
      ? { lat: markers[0].lat, lng: markers[0].lng }
      : { lat: 51.515, lng: -0.09 };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.js"></script>
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.css" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { display: none !important; }

    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.6; }
      50% { transform: scale(2.2); opacity: 0; }
      100% { transform: scale(1); opacity: 0; }
    }

    .user-location-marker { position: relative; width: 22px; height: 22px; }
    .user-dot {
      position: absolute; top: 50%; left: 50%; width: 14px; height: 14px;
      transform: translate(-50%, -50%); background: #4285F4; border: 2.5px solid #fff;
      border-radius: 50%; box-shadow: 0 0 6px rgba(66, 133, 244, 0.5); z-index: 2;
    }
    .user-pulse {
      position: absolute; top: 50%; left: 50%; width: 14px; height: 14px;
      transform: translate(-50%, -50%); background: rgba(66, 133, 244, 0.35);
      border-radius: 50%; animation: pulse 2s ease-out infinite; z-index: 1;
    }
    .car-marker { cursor: pointer; }
    .car-marker img { height: 50px; width: auto; display: block; }
    .car-dot {
      width: 22px; height: 22px; border-radius: 50%; border: 2.5px solid #fff;
      box-shadow: 0 0 4px rgba(0,0,0,0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var _map;
    var _markersById = {};
    var _popupById = {};

    function goToVehicle(id) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(id);
      }
    }

    // Live position updates pushed from React Native every poll
    window.updateMarkers = function(updates) {
      if (!_map) return;
      for (var i = 0; i < updates.length; i++) {
        var u = updates[i];
        var m = _markersById[u.id];
        if (!m) continue;
        m.setLngLat([u.lng, u.lat]);
        var pop = _popupById[u.id];
        if (pop && m._buildInfo) pop.setHTML(m._buildInfo(u));
      }
    };

    function panToUser(lat, lng) {
      if (_map && lat && lng) {
        _map.flyTo({ center: [lng, lat], zoom: 15 });
      }
    }

    function buildInfoFor(v, state) {
      var driver = (state && state.driver !== undefined) ? state.driver : v.driver;
      var dest = (state && state.destination !== undefined) ? state.destination : v.destination;
      var driverLine = driver ? '<div style="font-size:12px;color:#444;margin-top:3px">Driver: ' + driver + '</div>' : '';
      var destLine = dest ? '<div style="font-size:12px;color:#3B82F6;margin-top:3px">→ ' + dest + '</div>' : '';
      return '<div style="font-family:sans-serif;padding:4px 2px">' +
        '<strong>' + v.title + '</strong><br/>' +
        '<span style="font-family:monospace;font-size:13px">' + v.plate + '</span>' +
        driverLine +
        destLine +
        '<button onclick="goToVehicle(\\'' + v.id + '\\')" style="margin-top:8px;padding:6px 14px;background:#000;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;">View</button>' +
        '</div>';
    }

    function makeCarElement(v) {
      var el = document.createElement('div');
      el.className = 'car-marker';
      function circle() {
        var c = document.createElement('div');
        c.className = 'car-dot';
        c.style.background = v.active ? '#018a16' : '#333333';
        return c;
      }
      // Show the car image if it loads, otherwise a coloured dot fallback.
      if (v.imageUri) {
        var img = document.createElement('img');
        img.onerror = function() { el.innerHTML = ''; el.appendChild(circle()); };
        img.src = v.imageUri;
        el.appendChild(img);
      } else {
        el.appendChild(circle());
      }
      return el;
    }

    function initMap() {
      var markers = ${JSON.stringify(markers)};
      var center = ${JSON.stringify(center)};
      var userLat = ${userLat !== null ? userLat : 'null'};
      var userLng = ${userLng !== null ? userLng : 'null'};

      mapboxgl.accessToken = ${JSON.stringify(MAPBOX_TOKEN || '')};

      _map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        projection: 'mercator', // flat map, not the 3D globe
        center: [center.lng, center.lat],
        zoom: markers.length > 0 ? 13 : 12,
        attributionControl: false,
      });

      // Render the user's location dot (but don't force it into the fleet view —
      // the "my location" button pans to it on demand).
      if (userLat !== null && userLng !== null) {
        var uel = document.createElement('div');
        uel.className = 'user-location-marker';
        uel.innerHTML = '<div class="user-pulse"></div><div class="user-dot"></div>';
        new mapboxgl.Marker({ element: uel }).setLngLat([userLng, userLat]).addTo(_map);
      }

      var bounds = new mapboxgl.LngLatBounds();
      markers.forEach(function(v) {
        bounds.extend([v.lng, v.lat]);
        var popup = new mapboxgl.Popup({ offset: 28, closeButton: false }).setHTML(buildInfoFor(v));
        var marker = new mapboxgl.Marker({ element: makeCarElement(v) })
          .setLngLat([v.lng, v.lat])
          .setPopup(popup)
          .addTo(_map);
        marker._buildInfo = function(state) { return buildInfoFor(v, state); };
        _markersById[v.id] = marker;
        _popupById[v.id] = popup;
      });

      // Focus on the fleet: fit multiple cars, or center a single car at street zoom.
      if (markers.length > 1) {
        _map.fitBounds(bounds, { padding: { top: 60, right: 40, bottom: 60, left: 40 }, maxZoom: 15 });
      } else if (markers.length === 1) {
        _map.flyTo({ center: [markers[0].lng, markers[0].lat], zoom: 14 });
      }
    }

    if (window.mapboxgl) { initMap(); }
    else { window.addEventListener('load', initMap); }
  </script>
</body>
</html>`;
}

export default function MapScreen() {
  const { vehicles, loading, fetchVehicles } = useVehicleStore();
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const router = useRouter();
  const { isUnfolded } = useLayout();
  const webViewRef = useRef(null);

  useEffect(() => {
    fetchVehicles();
    // Poll positions every 5s so the cars track live on the map
    const interval = setInterval(() => { fetchVehicles(); }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Request location permissions and get current position
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission denied');
          return;
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      } catch (err) {
        console.warn('Failed to get location:', err);
      }
    })();
  }, []);

  const vehiclesWithPos = vehicles.filter(v => {
    const lat = parseFloat(v.position?.lat);
    const lng = parseFloat(v.position?.lng);
    return !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0);
  });

  // Stable key — only the set of vehicle IDs that are on the map.
  // Re-build the HTML only when vehicles get added/removed, NOT on every
  // position update (those are injected via updateMarkers below).
  const vehicleIdsKey = vehiclesWithPos.map(v => v.id).sort().join('|');
  const initialMarkersRef = useRef(vehiclesWithPos);
  useEffect(() => { initialMarkersRef.current = vehiclesWithPos; }, [vehicleIdsKey]);

  const source = useMemo(
    () => ({ html: buildMapHTML(initialMarkersRef.current, userLocation) }),
    [vehicleIdsKey, userLocation]
  );

  // Push position updates live without reloading the WebView
  useEffect(() => {
    if (!mapReady || !webViewRef.current) return;
    const payload = vehiclesWithPos.map(v => ({
      id: String(v.id),
      lat: parseFloat(v.position.lat),
      lng: parseFloat(v.position.lng),
      active: v.status === 'active',
      destination: v.destination ? String(v.destination) : '',
      driver: v.currentDriver ? String(v.currentDriver) : '',
    }));
    const js = `if (window.updateMarkers) { updateMarkers(${JSON.stringify(payload)}); } true;`;
    webViewRef.current.injectJavaScript(js);
  }, [vehiclesWithPos, mapReady]);

  function handleMessage(event) {
    const vehicleId = event.nativeEvent.data;
    if (vehicleId) router.push('/vehicle/' + vehicleId);
  }

  function handleMyLocation() {
    if (userLocation && webViewRef.current) {
      const js = `panToUser(${userLocation.lat}, ${userLocation.lng}); true;`;
      webViewRef.current.injectJavaScript(js);
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, isUnfolded && styles.headerUnfolded]}>
        <Text style={[styles.headerTitle, isUnfolded && styles.headerTitleUnfolded]}>Live Map</Text>
        <Text style={styles.headerCount}>
          {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          style={styles.map}
          source={source}
          onLoad={() => setMapReady(true)}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />

        {userLocation && (
          <TouchableOpacity
            style={styles.myLocationButton}
            onPress={handleMyLocation}
            activeOpacity={0.7}
          >
            <LocateFixed size={22} color="#333" strokeWidth={2.2} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    zIndex: 10,
  },
  headerUnfolded: {
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 18,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  headerTitleUnfolded: { fontSize: 24 },
  headerCount: { fontSize: 13, color: '#888' },
  mapContainer: { flex: 1, position: 'relative' },
  map: { flex: 1 },
  myLocationButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
