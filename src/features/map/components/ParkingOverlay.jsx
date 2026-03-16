import { Polygon, InfoWindow } from '@react-google-maps/api';
import { useState } from 'react';
import { useParkingStore } from '../../../store';

function ParkingZonePolygon({ zone, color }) {
  const [isOpen, setIsOpen] = useState(false);

  // Convert bounds from [[lat, lng], ...] to [{lat, lng}, ...]
  const paths = zone.bounds.map((coord) => ({
    lat: Array.isArray(coord) ? coord[0] : coord.lat,
    lng: Array.isArray(coord) ? coord[1] : coord.lng,
  }));

  // Calculate center for InfoWindow
  const center = paths.reduce(
    (acc, coord) => ({
      lat: acc.lat + coord.lat / paths.length,
      lng: acc.lng + coord.lng / paths.length,
    }),
    { lat: 0, lng: 0 }
  );

  return (
    <>
      <Polygon
        paths={paths}
        options={{
          strokeColor: color,
          strokeWeight: 2,
          fillColor: color,
          fillOpacity: 0.25,
        }}
        onClick={() => setIsOpen(true)}
      />
      {isOpen && (
        <InfoWindow position={center} onCloseClick={() => setIsOpen(false)}>
          <div className="min-w-48 p-1">
            <h3 className="font-bold text-lg">{zone.name}</h3>
            <p
              className={`text-sm font-medium ${
                zone.status === 'free'
                  ? 'text-green-600'
                  : zone.status === 'risky'
                  ? 'text-yellow-600'
                  : zone.status === 'high-risk'
                  ? 'text-orange-600'
                  : 'text-red-600'
              }`}
            >
              {zone.description}
            </p>

            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Available Spots:</span>
                <span className="font-bold">
                  {zone.capacity - zone.occupied} / {zone.capacity}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hours:</span>
                <span className="font-medium">{zone.hours}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Permit Required:</span>
                <span className="font-medium">
                  {zone.permitRequired ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {zone.restrictions && (
              <div className="mt-2 p-2 bg-orange-50 rounded text-xs text-orange-700">
                {zone.restrictions}
              </div>
            )}

            {/* Capacity bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    zone.occupied / zone.capacity > 0.8
                      ? 'bg-red-500'
                      : zone.occupied / zone.capacity > 0.5
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{
                    width: `${(zone.occupied / zone.capacity) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function ParkingOverlay({ zones }) {
  const { getZoneColor } = useParkingStore();

  return (
    <>
      {zones.map((zone) => {
        const color = getZoneColor(zone.status);
        return <ParkingZonePolygon key={zone.id} zone={zone} color={color} />;
      })}
    </>
  );
}
