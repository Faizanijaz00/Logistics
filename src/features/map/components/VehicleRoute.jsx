import { Polyline, Marker } from '@react-google-maps/api';

const createDestinationIcon = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#c4001a" stroke="#fff" stroke-width="2.5"/>
      <circle cx="12" cy="12" r="4" fill="#fff"/>
    </svg>
  `;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: { width: 24, height: 24 },
    anchor: { x: 12, y: 12 },
  };
};

export function VehicleRoute({ route, vehicleId, isActive = true }) {
  if (!route) return null;

  // Handle both array format (from route service) and object format (legacy)
  let path;
  let endPos;

  if (Array.isArray(route)) {
    path = route.map((coord) => ({ lat: coord.lat, lng: coord.lng }));
    endPos = path[path.length - 1];
  } else if (route.start && route.end) {
    path = [
      { lat: route.start.lat, lng: route.start.lng },
      ...(route.waypoints?.map((wp) => ({ lat: wp.lat, lng: wp.lng })) || []),
      { lat: route.end.lat, lng: route.end.lng },
    ];
    endPos = { lat: route.end.lat, lng: route.end.lng };
  } else {
    return null;
  }

  if (path.length < 2) return null;

  return (
    <>
      {/* Route outline for contrast */}
      <Polyline
        path={path}
        options={{
          strokeColor: '#1a3a5c',
          strokeWeight: 6,
          strokeOpacity: 0.4,
        }}
      />

      {/* Main route line */}
      <Polyline
        path={path}
        options={{
          strokeColor: '#4285F4',
          strokeWeight: 4,
          strokeOpacity: 0.9,
        }}
      />

      {/* Destination marker */}
      <Marker
        position={endPos}
        icon={createDestinationIcon()}
      />
    </>
  );
}
