import { GoogleMap, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { useState } from 'react';
import { createCarIcon, createEndpointIcon } from './CarIcon';
import { defaultCenter, defaultZoom, defaultMapOptions } from '../../../config/googleMaps';

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '500px',
};


// Create retro car marker icon
const createRetroCarIcon = (heading = 0, status = 'active') => {
  const colors = {
    active: '#00ff41',
    parked: '#00cc33',
    maintenance: '#ffb000',
    emergency: '#ff0040',
  };
  const color = colors[status] || colors.active;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <g transform="rotate(${heading}, 12, 12)">
        <polygon points="12,2 20,22 12,17 4,22" fill="${color}" stroke="#001100" stroke-width="1"/>
      </g>
    </svg>
  `;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: { width: 24, height: 24 },
    anchor: { x: 12, y: 12 },
  };
};

// Vehicle Marker Component
function VehicleMarker({ vehicle }) {
  const [isOpen, setIsOpen] = useState(false);
  const icon = createRetroCarIcon(vehicle.heading, vehicle.status);
  const position = { lat: vehicle.position.lat, lng: vehicle.position.lng };

  return (
    <>
      <Marker position={position} icon={icon} onClick={() => setIsOpen(true)} />
      {isOpen && (
        <InfoWindow position={position} onCloseClick={() => setIsOpen(false)}>
          <div className="font-mono text-sm" style={{ color: '#00ff41', background: '#001100', padding: '8px', minWidth: '180px' }}>
            <div className="border-b border-green-900 pb-2 mb-2">
              <div className="text-xs opacity-70 uppercase tracking-wider">VEHICLE ID</div>
              <div className="font-bold">{vehicle.licensePlate}</div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="opacity-70">MODEL:</span>
                <span>{vehicle.make} {vehicle.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">STATUS:</span>
                <span className={
                  vehicle.status === 'active' ? 'text-green-400' :
                  vehicle.status === 'emergency' ? 'text-red-400 animate-pulse' :
                  'text-yellow-400'
                }>
                  [{vehicle.status.toUpperCase()}]
                </span>
              </div>
              {vehicle.currentDriver && (
                <div className="flex justify-between">
                  <span className="opacity-70">DRIVER:</span>
                  <span>{vehicle.currentDriver}</span>
                </div>
              )}
              {vehicle.destination && (
                <div className="flex justify-between">
                  <span className="opacity-70">DEST:</span>
                  <span>{vehicle.destination}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="opacity-70">MILEAGE:</span>
                <span>{vehicle.dailyMileage} KM</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">HEADING:</span>
                <span>{vehicle.heading}°</span>
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// Route Component
function VehicleRoute({ route, isActive }) {
  if (!route) return null;

  const path = [
    { lat: route.start.lat, lng: route.start.lng },
    { lat: route.end.lat, lng: route.end.lng },
  ];

  const startIcon = {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
        <circle cx="6" cy="6" r="5" fill="#00ff41" stroke="#001100" stroke-width="1"/>
      </svg>
    `),
    scaledSize: { width: 12, height: 12 },
    anchor: { x: 6, y: 6 },
  };

  const endIcon = {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
        <rect x="1" y="1" width="10" height="10" fill="#ff0040" stroke="#001100" stroke-width="1"/>
      </svg>
    `),
    scaledSize: { width: 12, height: 12 },
    anchor: { x: 6, y: 6 },
  };

  return (
    <>
      <Polyline
        path={path}
        options={{
          strokeColor: isActive ? '#00ff41' : '#00cc33',
          strokeWeight: 2,
          strokeOpacity: 0.8,
        }}
      />
      <Marker position={path[0]} icon={startIcon} />
      <Marker position={path[1]} icon={endIcon} />
    </>
  );
}

// Main SimpleMap Component
export function SimpleMap({
  vehicles = [],
  showRoutes = true,
  filters = {},
}) {
  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    if (v.status === 'emergency') return true; // Always show emergency
    if (filters.showActiveVehicles === false && v.status === 'active') return false;
    if (filters.showParkedVehicles === false && v.status === 'parked') return false;
    return true;
  });

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={defaultZoom}
      options={defaultMapOptions}
    >
      {/* Vehicle Routes */}
      {showRoutes &&
        filteredVehicles
          .filter((v) => v.route)
          .map((vehicle) => (
            <VehicleRoute
              key={`route-${vehicle.id}`}
              route={vehicle.route}
              isActive={vehicle.status === 'active'}
            />
          ))}

      {/* Vehicle Markers */}
      {filteredVehicles.map((vehicle) => (
        <VehicleMarker key={vehicle.id} vehicle={vehicle} />
      ))}
    </GoogleMap>
  );
}

export default SimpleMap;
