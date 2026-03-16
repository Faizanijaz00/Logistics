import { useCallback, useRef, useState } from 'react';
import { GoogleMap, Marker, OverlayView } from '@react-google-maps/api';
import { VehicleMarker } from './VehicleMarker';
import { VehicleRoute } from './VehicleRoute';
import { useSavedLocationStore } from '../../../store';
import { defaultCenter, defaultMapOptions } from '../../../config/googleMaps';

// House SVG icon for saved locations
const houseMarkerIcon = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
    <!-- Drop shadow -->
    <ellipse cx="20" cy="46" rx="10" ry="2.5" fill="rgba(0,0,0,0.15)"/>
    <!-- Pin body -->
    <path d="M20 2 C10.6 2 3 9.6 3 19 C3 30.5 20 46 20 46 C20 46 37 30.5 37 19 C37 9.6 29.4 2 20 2 Z" fill="#1e293b" stroke="#fff" stroke-width="1.5"/>
    <!-- House shape -->
    <polygon points="20,9 10,17 12,17 12,27 17,27 17,22 23,22 23,27 28,27 28,17 30,17" fill="#fff"/>
    <!-- Door -->
    <rect x="17" y="22" width="6" height="5" rx="1" fill="#1e293b"/>
    <!-- Chimney -->
    <rect x="23" y="10" width="3" height="5" fill="#fff"/>
  </svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: { width: 40, height: 48 },
    anchor: { x: 20, y: 46 },
  };
})();

function LocationMarker({ location }) {
  const [open, setOpen] = useState(false);
  const position = { lat: location.position.lat, lng: location.position.lng };

  return (
    <>
      <Marker
        position={position}
        icon={houseMarkerIcon}
        onClick={() => setOpen(o => !o)}
        title={location.name}
      />
      {open && (
        <OverlayView
          position={position}
          mapPaneName={OverlayView.FLOAT_PANE}
          getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h + 52) })}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
              minWidth: '160px',
              maxWidth: '220px',
              overflow: 'hidden',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '13px' }}>🏠</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#111', lineHeight: 1.2 }}>{location.name}</div>
                  {location.address && <div style={{ fontSize: '10px', color: '#888', marginTop: '2px', lineHeight: 1.3 }}>{location.address}</div>}
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '16px', lineHeight: 1, padding: '0 0 0 4px', flexShrink: 0 }}>&times;</button>
            </div>
          </div>
          {/* Arrow */}
          <div style={{ width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid #fff', margin: '0 auto', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))' }} />
        </OverlayView>
      )}
    </>
  );
}

const containerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '600px',
};

export function LiveMap({
  vehicles = [],
  parkingZones = [],
  filters = {
    showActiveVehicles: true,
    showParkedVehicles: true,
    showRoutes: true,
    showParkingZones: true,
    selectedZoneStatus: 'all',
  },
}) {
  const { locations } = useSavedLocationStore();
  const mapRef = useRef(null);

  // Filter vehicles based on filters
  const filteredVehicles = vehicles.filter((v) => {
    if (v.status === 'active' && !filters.showActiveVehicles) return false;
    if (v.status === 'parked' && !filters.showParkedVehicles) return false;
    if (v.status === 'emergency') return true;
    return true;
  });

  // Fit map bounds to show all vehicles and saved locations
  const handleMapLoad = useCallback((map) => {
    mapRef.current = map;

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    vehicles.forEach((v) => {
      if (v.position?.lat && v.position?.lng) {
        bounds.extend({ lat: v.position.lat, lng: v.position.lng });
        hasPoints = true;
      }
    });

    locations.forEach((loc) => {
      if (loc.position?.lat && loc.position?.lng) {
        bounds.extend({ lat: loc.position.lat, lng: loc.position.lng });
        hasPoints = true;
      }
    });

    if (hasPoints) {
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    }
  }, [vehicles, locations]);

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={14}
      options={defaultMapOptions}
      onLoad={handleMapLoad}
    >
      {/* Vehicle Routes Layer */}
      {filters.showRoutes &&
        filteredVehicles
          .filter((v) => v.route)
          .map((vehicle) => (
            <VehicleRoute
              key={`route-${vehicle.id}`}
              route={vehicle.route}
              vehicleId={vehicle.id}
              isActive={vehicle.status === 'active'}
            />
          ))}

      {/* Vehicle Markers Layer */}
      {filteredVehicles.map((vehicle) => (
        <VehicleMarker key={vehicle.id} vehicle={vehicle} />
      ))}

      {/* Saved Location Markers */}
      {locations.map((loc) => (
        <LocationMarker key={loc.id} location={loc} />
      ))}
    </GoogleMap>
  );
}
