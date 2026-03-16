import { GoogleMap } from '@react-google-maps/api';
import { VehicleMarker } from './VehicleMarker';
import { VehicleRoute } from './VehicleRoute';
import { defaultCenter, defaultZoom, defaultMapOptions } from '../../config/googleMaps';

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '500px',
};

export function FleetMap({ vehicles = [], showRoutes = true }) {
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

      {showRoutes &&
        vehicles
          .filter((v) => v.route)
          .map((vehicle) => (
            <VehicleRoute
              key={`route-${vehicle.id}`}
              route={vehicle.route}
              color={vehicle.status === 'active' ? '#22c55e' : '#3b82f6'}
            />
          ))}
    </GoogleMap>
  );
}
