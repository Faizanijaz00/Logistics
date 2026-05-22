import { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { LocateFixed } from 'lucide-react-native';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { SERVER_URL } from '../../src/config/api';
import { useLayout } from '../../src/hooks/useLayout';

// Get car image URL served by the Express server
function getServerImageUrl(imageId) {
  if (!imageId) return null;
  return `${SERVER_URL}/cars/${imageId}.png`;
}

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

function buildMapHTML(vehicles, userLocation) {
  const markers = vehicles
    .map(v => {
      const lat = parseFloat(v.position?.lat);
      const lng = parseFloat(v.position?.lng);
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;
      const imageUri = getServerImageUrl(v.imageId);
      return {
        id: String(v.id),
        lat,
        lng,
        title: String(v.make + ' ' + v.model),
        plate: String(v.licensePlate || ''),
        active: v.status === 'active',
        imageUri,
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
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }

    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 0.6;
      }
      50% {
        transform: scale(2.2);
        opacity: 0;
      }
      100% {
        transform: scale(1);
        opacity: 0;
      }
    }

    .user-location-marker {
      position: relative;
      width: 22px;
      height: 22px;
    }

    .user-dot {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 14px;
      height: 14px;
      transform: translate(-50%, -50%);
      background: #4285F4;
      border: 2.5px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 6px rgba(66, 133, 244, 0.5);
      z-index: 2;
    }

    .user-pulse {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 14px;
      height: 14px;
      transform: translate(-50%, -50%);
      background: rgba(66, 133, 244, 0.35);
      border-radius: 50%;
      animation: pulse 2s ease-out infinite;
      z-index: 1;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var _map;
    var _userMarker;

    function goToVehicle(id) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(id);
      }
    }

    function panToUser(lat, lng) {
      if (_map && lat && lng) {
        _map.panTo({ lat: lat, lng: lng });
        _map.setZoom(15);
      }
    }

    function initMap() {
      var markers = ${JSON.stringify(markers)};
      var center = ${JSON.stringify(center)};
      var userLat = ${userLat !== null ? userLat : 'null'};
      var userLng = ${userLng !== null ? userLng : 'null'};

      _map = new google.maps.Map(document.getElementById('map'), {
        zoom: markers.length > 0 ? 13 : 12,
        center: center,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] }
        ],
      });

      var bounds = new google.maps.LatLngBounds();

      // Add user location blue dot
      if (userLat !== null && userLng !== null) {
        var userPos = { lat: userLat, lng: userLng };
        bounds.extend(userPos);

        _userMarker = new google.maps.marker.AdvancedMarkerElement
          ? null : null;

        // Use OverlayView for custom HTML marker
        function UserLocationOverlay(pos, map) {
          this.pos = pos;
          this.map = map;
          this.div = null;
          this.setMap(map);
        }
        UserLocationOverlay.prototype = new google.maps.OverlayView();
        UserLocationOverlay.prototype.onAdd = function() {
          var div = document.createElement('div');
          div.className = 'user-location-marker';
          div.innerHTML = '<div class="user-pulse"></div><div class="user-dot"></div>';
          div.style.position = 'absolute';
          div.style.cursor = 'default';
          this.div = div;
          var panes = this.getPanes();
          panes.overlayMouseTarget.appendChild(div);
        };
        UserLocationOverlay.prototype.draw = function() {
          var projection = this.getProjection();
          var point = projection.fromLatLngToDivPixel(new google.maps.LatLng(this.pos.lat, this.pos.lng));
          if (this.div) {
            this.div.style.left = (point.x - 11) + 'px';
            this.div.style.top = (point.y - 11) + 'px';
          }
        };
        UserLocationOverlay.prototype.onRemove = function() {
          if (this.div && this.div.parentNode) {
            this.div.parentNode.removeChild(this.div);
            this.div = null;
          }
        };

        new UserLocationOverlay(userPos, _map);
      }

      markers.forEach(function(v) {
        var pos = { lat: v.lat, lng: v.lng };
        bounds.extend(pos);

        var infoContent = '<div style="font-family:sans-serif;padding:4px 2px">' +
          '<strong>' + v.title + '</strong><br/>' +
          '<span style="font-family:monospace;font-size:13px">' + v.plate + '</span><br/>' +
          '<button onclick="goToVehicle(\\'' + v.id + '\\')" style="margin-top:8px;padding:6px 14px;background:#000;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;">View</button>' +
          '</div>';

        function placeMarker(icon) {
          var marker = new google.maps.Marker({ position: pos, map: _map, title: v.title, icon: icon });
          var info = new google.maps.InfoWindow({ content: infoContent });
          marker.addListener('click', function() { info.open(_map, marker); });
        }

        var circleIcon = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: v.active ? '#018a16' : '#333333',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
        };

        if (v.imageUri) {
          var img = new window.Image();
          img.onload = function() {
            var h = 50;
            var w = Math.round(img.naturalWidth * (h / img.naturalHeight));
            placeMarker({ url: v.imageUri, scaledSize: new google.maps.Size(w, h) });
          };
          img.onerror = function() { placeMarker(circleIcon); };
          img.src = v.imageUri;
        } else {
          placeMarker(circleIcon);
        }
      });

      if (markers.length > 1 || (markers.length >= 1 && userLat !== null)) {
        _map.fitBounds(bounds, { top: 60, right: 40, bottom: 60, left: 40 });
      }
    }
  </script>
  <script
    src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap"
    async defer>
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

  // Memoize so the WebView source object stays stable between renders
  const source = useMemo(
    () => ({ html: buildMapHTML(vehicles, userLocation) }),
    [vehicles, userLocation]
  );

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
