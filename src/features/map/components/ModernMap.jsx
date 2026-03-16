import { GoogleMap, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { useState } from 'react';
import { defaultCenter, defaultZoom, defaultMapOptions } from '../../../config/googleMaps';

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '500px',
  borderRadius: '0.75rem',
};

// Status colors
const statusColors = {
  active: '#10b981',
  parked: '#3b82f6',
  maintenance: '#f59e0b',
  emergency: '#ef4444',
};

// Create modern car icon
const createCarIcon = (heading = 0, status = 'active') => {
  const color = statusColors[status] || statusColors.active;
  const isEmergency = status === 'emergency';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/>
        </filter>
      </defs>
      <g transform="rotate(${heading}, 20, 20)" filter="url(#shadow)">
        <circle cx="20" cy="20" r="16" fill="white"/>
        <circle cx="20" cy="20" r="14" fill="${color}"/>
        <path d="M20 8 L26 20 L20 17 L14 20 Z" fill="white" opacity="0.9"/>
        ${isEmergency ? '<animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite"/>' : ''}
      </g>
    </svg>
  `;

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: { width: 40, height: 40 },
    anchor: { x: 20, y: 20 },
  };
};


// Vehicle Marker
function VehicleMarker({ vehicle }) {
  const [isOpen, setIsOpen] = useState(false);
  const icon = createCarIcon(vehicle.heading, vehicle.status);
  const position = { lat: vehicle.position.lat, lng: vehicle.position.lng };

  return (
    <>
      <Marker position={position} icon={icon} onClick={() => setIsOpen(true)} />
      {isOpen && (
        <InfoWindow position={position} onCloseClick={() => setIsOpen(false)}>
          <div className="p-3 min-w-[200px]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {vehicle.make} {vehicle.model}
                </h3>
                <p className="text-sm text-gray-500">{vehicle.licensePlate}</p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  vehicle.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : vehicle.status === 'parked'
                    ? 'bg-blue-100 text-blue-700'
                    : vehicle.status === 'emergency'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {vehicle.status}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              {vehicle.currentDriver && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Driver</span>
                  <span className="font-medium">{vehicle.currentDriver}</span>
                </div>
              )}
              {vehicle.destination && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Destination</span>
                  <span className="font-medium">{vehicle.destination}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Daily Mileage</span>
                <span className="font-medium">{vehicle.dailyMileage} km</span>
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

  return (
    <Polyline
      path={path}
      options={{
        strokeColor: isActive ? '#10b981' : '#3b82f6',
        strokeWeight: 3,
        strokeOpacity: 0.8,
      }}
    />
  );
}

// Main Map Component
export function ModernMap({ vehicles = [], showRoutes = true, filters = {} }) {
  const filteredVehicles = vehicles.filter((v) => {
    if (v.status === 'emergency') return true;
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

      {filteredVehicles.map((vehicle) => (
        <VehicleMarker key={vehicle.id} vehicle={vehicle} />
      ))}
    </GoogleMap>
  );
}

export default ModernMap;
