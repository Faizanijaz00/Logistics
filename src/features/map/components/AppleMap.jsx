import { useEffect, useRef, useState } from 'react';
import { useParkingStore } from '../../../store';

const defaultCenter = { lat: 51.507, lng: -0.09 };

// Status colors
const statusColors = {
  active: '#018a16',
  parked: '#0061bd',
  maintenance: '#cc7700',
  emergency: '#c4001a',
};

export function AppleMap({ vehicles = [], showRoutes = true, showParkingZones = true, filters = {} }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const overlaysRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const { zones } = useParkingStore();

  // Initialize MapKit
  useEffect(() => {
    if (!window.mapkit || mapInstanceRef.current) return;

    try {
      // Initialize MapKit with a demo token
      // In production, you would use your own Apple Developer token
      window.mapkit.init({
        authorizationCallback: (done) => {
          // This is a placeholder - Apple Maps requires a valid JWT token
          // For demo purposes, the map will show but may have limited functionality
          done('eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkRFTU8ifQ.eyJpc3MiOiJERU1PIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.demo');
        },
      });

      // Create the map
      const map = new window.mapkit.Map(mapRef.current, {
        center: new window.mapkit.Coordinate(defaultCenter.lat, defaultCenter.lng),
        mapType: window.mapkit.Map.MapTypes.Standard,
        showsCompass: window.mapkit.FeatureVisibility.Hidden,
        showsZoomControl: true,
        showsMapTypeControl: false,
        isRotationEnabled: false,
        colorScheme: window.mapkit.Map.ColorSchemes.Light,
      });

      // Set initial region
      map.region = new window.mapkit.CoordinateRegion(
        new window.mapkit.Coordinate(defaultCenter.lat, defaultCenter.lng),
        new window.mapkit.CoordinateSpan(0.02, 0.02)
      );

      mapInstanceRef.current = map;
      setMapReady(true);
    } catch (error) {
      console.error('Error initializing Apple Maps:', error);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when vehicles change
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Remove old markers
    markersRef.current.forEach((marker) => map.removeAnnotation(marker));
    markersRef.current = [];

    // Filter vehicles
    const filteredVehicles = vehicles.filter((v) => {
      if (v.status === 'emergency') return true;
      if (filters.showActiveVehicles === false && v.status === 'active') return false;
      if (filters.showParkedVehicles === false && v.status === 'parked') return false;
      return true;
    });

    // Add new markers
    filteredVehicles.forEach((vehicle) => {
      const color = statusColors[vehicle.status] || statusColors.active;

      const annotation = new window.mapkit.MarkerAnnotation(
        new window.mapkit.Coordinate(vehicle.position.lat, vehicle.position.lng),
        {
          color: color,
          title: `${vehicle.make} ${vehicle.model}`,
          subtitle: vehicle.licensePlate,
          glyphText: vehicle.status === 'active' ? '→' : vehicle.status === 'parked' ? 'P' : '!',
        }
      );

      map.addAnnotation(annotation);
      markersRef.current.push(annotation);
    });
  }, [vehicles, filters, mapReady]);

  // Update overlays when zones change
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !showParkingZones) return;

    const map = mapInstanceRef.current;

    // Remove old overlays
    overlaysRef.current.forEach((overlay) => map.removeOverlay(overlay));
    overlaysRef.current = [];

    // Filter zones
    const filteredZones = zones.filter((z) => {
      if (filters.selectedZoneStatus && filters.selectedZoneStatus !== 'all') {
        return z.status === filters.selectedZoneStatus;
      }
      return true;
    });

    // Add zone overlays
    filteredZones.forEach((zone) => {
      const zoneColors = {
        free: { stroke: '#018a16', fill: 'rgba(1, 138, 22, 0.15)' },
        risky: { stroke: '#cc7700', fill: 'rgba(204, 119, 0, 0.15)' },
        'high-risk': { stroke: '#c4001a', fill: 'rgba(196, 0, 26, 0.15)' },
        private: { stroke: '#c4001a', fill: 'rgba(196, 0, 26, 0.1)' },
      };

      const colors = zoneColors[zone.status] || zoneColors.free;

      const coordinates = zone.bounds.map(
        ([lat, lng]) => new window.mapkit.Coordinate(lat, lng)
      );

      const polygon = new window.mapkit.PolygonOverlay(coordinates, {
        style: new window.mapkit.Style({
          strokeColor: colors.stroke,
          strokeOpacity: 1,
          lineWidth: 2,
          fillColor: colors.fill,
          fillOpacity: 1,
        }),
      });

      map.addOverlay(polygon);
      overlaysRef.current.push(polygon);
    });
  }, [zones, filters, showParkingZones, mapReady]);

  // Update routes when vehicles change
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !showRoutes) return;

    // Routes would be drawn as polylines here
    // For simplicity, we're focusing on markers and zones
  }, [vehicles, showRoutes, mapReady]);

  return (
    <div
      ref={mapRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '500px',
        background: '#e8e8e8',
      }}
    />
  );
}

export default AppleMap;
