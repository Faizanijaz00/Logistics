import { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { LocateFixed } from 'lucide-react-native';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

// Interactive in-app navigation map (Mapbox GL in a WebView, same engine as the
// Map tab). Draws the driving route pickup→destination and plots a moving dot.
//  • Driver mode (default): watches the device GPS, follows it, and reports each
//    fix via onLocation so it can be shared to the rider.
//  • Rider mode: pass `externalLocation` (the driver's location from the ride)
//    and it plots that instead of the device GPS.
export default function NavMapView({ pickup, destination, mapStyle = 'streets-v12', accent = '#2563eb', externalLocation, onLocation }) {
  const ref = useRef(null);

  const html = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link href="https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.css" rel="stylesheet" />
<script src="https://api.mapbox.com/mapbox-gl-js/v3.20.0/mapbox-gl.js"></script>
<style>html,body,#map{margin:0;height:100%;width:100%}.mapboxgl-ctrl-logo,.mapboxgl-ctrl-attrib{display:none!important}
.udot{width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.25)}</style>
</head><body><div id="map"></div><script>
mapboxgl.accessToken=${JSON.stringify(MAPBOX_TOKEN)};
var P=[${pickup?.lng},${pickup?.lat}], D=[${destination?.lng},${destination?.lat}];
var map=new mapboxgl.Map({container:'map',style:'mapbox://styles/mapbox/${mapStyle}',center:P,zoom:13,attributionControl:false});
new mapboxgl.Marker({color:'#16a34a'}).setLngLat(P).addTo(map);
new mapboxgl.Marker({color:'#dc2626'}).setLngLat(D).addTo(map);
var userEl=document.createElement('div');userEl.className='udot';
var userMarker=new mapboxgl.Marker({element:userEl});
window.setUser=function(lat,lng){userMarker.setLngLat([lng,lat]).addTo(map);if(window.__follow){map.easeTo({center:[lng,lat],duration:600});}};
window.__follow=true;
window.recenter=function(){window.__follow=true;userMarker.getLngLat&&map.easeTo({center:userMarker.getLngLat(),zoom:15,duration:500});};
map.on('dragstart',function(){window.__follow=false;});
map.on('load',function(){
  fetch('https://api.mapbox.com/directions/v5/mapbox/driving/'+P[0]+','+P[1]+';'+D[0]+','+D[1]+'?geometries=geojson&overview=full&access_token='+mapboxgl.accessToken)
  .then(function(r){return r.json()}).then(function(j){
    if(!j.routes||!j.routes[0])return; var g=j.routes[0].geometry;
    map.addSource('route',{type:'geojson',data:{type:'Feature',geometry:g}});
    map.addLayer({id:'route',type:'line',source:'route',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'${accent}','line-width':5}});
    var b=new mapboxgl.LngLatBounds(g.coordinates[0],g.coordinates[0]);
    g.coordinates.forEach(function(c){b.extend(c)});
    map.fitBounds(b,{padding:{top:60,bottom:80,left:50,right:50}});
  }).catch(function(){});
});
</script></body></html>`;

  // Rider mode: plot the driver's location passed in from the ride.
  useEffect(() => {
    if (externalLocation?.lat != null) {
      ref.current?.injectJavaScript(`window.setUser(${externalLocation.lat},${externalLocation.lng});true;`);
    }
  }, [externalLocation?.lat, externalLocation?.lng]);

  // Driver mode: watch device GPS, plot it, and report it up via onLocation.
  useEffect(() => {
    if (externalLocation) return; // rider mode uses the prop instead
    let sub;
    (async () => {
      try {
        const Location = await import('expo-location');
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') status = (await Location.requestForegroundPermissionsAsync()).status;
        if (status !== 'granted') return;
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 15 },
          (pos) => {
            ref.current?.injectJavaScript(`window.setUser(${pos.coords.latitude},${pos.coords.longitude});true;`);
            onLocation?.({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          }
        );
      } catch {}
    })();
    return () => { try { sub?.remove(); } catch {} };
  }, [externalLocation]);

  return (
    <View style={styles.wrap}>
      <WebView ref={ref} originWhitelist={['*']} source={{ html }} style={styles.web} scrollEnabled={false} />
      <TouchableOpacity style={styles.recenter} onPress={() => ref.current?.injectJavaScript('window.recenter();true;')}>
        <LocateFixed size={20} color="#2563eb" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  web: { flex: 1, backgroundColor: 'transparent' },
  recenter: { position: 'absolute', right: 14, bottom: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 5 },
});
