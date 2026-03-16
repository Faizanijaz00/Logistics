import { Polyline } from '@react-google-maps/api';

export function VehicleRoute({ route, color = '#3b82f6' }) {
  if (!route) return null;

  const path = [
    { lat: route.start.lat, lng: route.start.lng },
    { lat: route.end.lat, lng: route.end.lng },
  ];

  return (
    <Polyline
      path={path}
      options={{
        strokeColor: color,
        strokeWeight: 4,
        strokeOpacity: 0.7,
      }}
    />
  );
}
