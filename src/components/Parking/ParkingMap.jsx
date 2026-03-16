import { GoogleMap } from '@react-google-maps/api';
import { VehicleMarker } from '../Map/VehicleMarker';
import { defaultCenter, defaultZoom, defaultMapOptions } from '../../config/googleMaps';

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '500px',
};

export function ParkingMap({ vehicles = [] }) {
  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={defaultZoom}
      options={defaultMapOptions}
    >
      {vehicles.map((vehicle) => (
        <VehicleMarker key={vehicle.id} vehicle={vehicle} />
      ))}
    </GoogleMap>
  );
}
