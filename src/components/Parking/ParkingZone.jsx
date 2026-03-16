import { Polygon, InfoWindow } from '@react-google-maps/api';
import { useState } from 'react';

const getZoneColor = (status) => {
  switch (status) {
    case 'free':
      return '#22c55e';
    case 'risky':
      return '#eab308';
    case 'high-risk':
      return '#f97316';
    case 'private':
      return '#ef4444';
    default:
      return '#6b7280';
  }
};

export function ParkingZone({ zone }) {
  const [isOpen, setIsOpen] = useState(false);
  const color = getZoneColor(zone.status);

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
          fillOpacity: 0.3,
        }}
        onClick={() => setIsOpen(true)}
      />
      {isOpen && (
        <InfoWindow position={center} onCloseClick={() => setIsOpen(false)}>
          <div className="min-w-48">
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

            <div className="mt-2 space-y-1 text-sm">
              <p>
                <span className="font-medium">Capacity:</span> {zone.occupied}/{zone.capacity}
              </p>
              <p>
                <span className="font-medium">Hours:</span> {zone.hours}
              </p>
              <p>
                <span className="font-medium">Permit Required:</span>{' '}
                {zone.permitRequired ? 'Yes' : 'No'}
              </p>
              {zone.restrictions && (
                <p className="text-orange-600">
                  <span className="font-medium">Note:</span> {zone.restrictions}
                </p>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
