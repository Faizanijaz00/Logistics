// Renders a readable address for a lat/lng. Prefers a server-supplied address
// when present, otherwise reverse-geocodes on the client (Mapbox). Falls back
// to trimmed coordinates, then a caller-supplied placeholder.
import { Text } from 'react-native';
import { useReverseGeocode } from '../lib/geocode';

export default function GeoText({ lat, lng, address, style, numberOfLines = 1, placeholder = 'Unknown' }) {
  const resolved = useReverseGeocode(lat, lng, address);
  const text =
    resolved ||
    (lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : placeholder);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {text}
    </Text>
  );
}
