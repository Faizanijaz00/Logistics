import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { getCarImage } from '../../src/config/carImages';

const GOOGLE_MAPS_API_KEY = 'AIzaSyB1ut_fLXEtEfEXFKpGkmLDHtqddF_JiGE';

function buildMapHTML(vehicles) {
  const markers = vehicles
    .map(v => {
      const lat = parseFloat(v.position?.lat);
      const lng = parseFloat(v.position?.lng);
      if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;
      let imageUri = null;
      try {
        const asset = getCarImage(v.imageId);
        if (asset) imageUri = Image.resolveAssetSource(asset).uri || null;
      } catch (_) {}
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

  const center = markers.length > 0
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
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    function goToVehicle(id) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(id);
      }
    }

    function initMap() {
      var markers = ${JSON.stringify(markers)};
      var center = ${JSON.stringify(center)};

      var map = new google.maps.Map(document.getElementById('map'), {
        zoom: markers.length > 0 ? 13 : 12,
        center: center,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'greedy',
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] }
        ],
      });

      var bounds = new google.maps.LatLngBounds();

      markers.forEach(function(v) {
        var pos = { lat: v.lat, lng: v.lng };
        bounds.extend(pos);

        var infoContent = '<div style="font-family:sans-serif;padding:4px 2px">' +
          '<strong>' + v.title + '</strong><br/>' +
          '<span style="font-family:monospace;font-size:13px">' + v.plate + '</span><br/>' +
          '<button onclick="goToVehicle(\\'' + v.id + '\\')" style="margin-top:8px;padding:6px 14px;background:#000;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;">View</button>' +
          '</div>';

        function placeMarker(icon) {
          var marker = new google.maps.Marker({ position: pos, map: map, title: v.title, icon: icon });
          var info = new google.maps.InfoWindow({ content: infoContent });
          marker.addListener('click', function() { info.open(map, marker); });
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

      if (markers.length > 1) {
        map.fitBounds(bounds, { top: 60, right: 40, bottom: 60, left: 40 });
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
  const router = useRouter();

  useEffect(() => {
    fetchVehicles();
  }, []);

  const vehiclesWithPos = vehicles.filter(v => {
    const lat = parseFloat(v.position?.lat);
    const lng = parseFloat(v.position?.lng);
    return !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0);
  });

  // Memoize so the WebView source object stays stable between renders
  const source = useMemo(() => ({ html: buildMapHTML(vehicles) }), [vehicles]);

  function handleMessage(event) {
    const vehicleId = event.nativeEvent.data;
    if (vehicleId) router.push('/vehicle/' + vehicleId);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Map</Text>
        <Text style={styles.headerCount}>
          {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <WebView
        style={styles.map}
        source={source}
        onLoad={() => setMapReady(true)}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  headerCount: { fontSize: 13, color: '#888' },
  map: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
