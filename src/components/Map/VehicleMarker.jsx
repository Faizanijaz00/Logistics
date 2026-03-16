import { Marker, InfoWindow } from '@react-google-maps/api';
import { useState } from 'react';

const getStatusColor = (status) => {
  switch (status) {
    case 'active':
      return '#22c55e';
    case 'parked':
      return '#3b82f6';
    case 'maintenance':
      return '#f97316';
    default:
      return '#6b7280';
  }
};

const createVehicleIcon = (heading, status) => {
  const color = getStatusColor(status);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <g transform="rotate(${heading}, 12, 12)">
        <path fill="${color}" stroke="#fff" stroke-width="1"
              d="M12 2L19 21L12 17L5 21L12 2Z"/>
      </g>
    </svg>
  `;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: { width: 32, height: 32 },
    anchor: { x: 16, y: 16 },
  };
};

export function VehicleMarker({ vehicle }) {
  const [isOpen, setIsOpen] = useState(false);
  const icon = createVehicleIcon(vehicle.heading, vehicle.status);
  const position = { lat: vehicle.position.lat, lng: vehicle.position.lng };

  return (
    <>
      <Marker position={position} icon={icon} onClick={() => setIsOpen(true)} />
      {isOpen && (
        <InfoWindow position={position} onCloseClick={() => setIsOpen(false)}>
          <div className="min-w-48">
            <h3 className="font-bold text-lg">
              {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-sm text-gray-500">{vehicle.licensePlate}</p>

            <div className="mt-2 space-y-1 text-sm">
              <p>
                <span className="font-medium">Status:</span>{' '}
                <span
                  className={`px-2 py-0.5 rounded text-white text-xs ${
                    vehicle.status === 'active'
                      ? 'bg-green-500'
                      : vehicle.status === 'parked'
                      ? 'bg-blue-500'
                      : 'bg-orange-500'
                  }`}
                >
                  {vehicle.status}
                </span>
              </p>

              {vehicle.currentDriver && (
                <p>
                  <span className="font-medium">Driver:</span> {vehicle.currentDriver}
                </p>
              )}

              {vehicle.destination && (
                <p>
                  <span className="font-medium">Destination:</span> {vehicle.destination}
                </p>
              )}

              <p>
                <span className="font-medium">Daily Mileage:</span> {vehicle.dailyMileage} km
              </p>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
