import { LoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, googleMapsLibraries } from '../../config/googleMaps';

export function GoogleMapsProvider({ children }) {
  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={googleMapsLibraries}
    >
      {children}
    </LoadScript>
  );
}
