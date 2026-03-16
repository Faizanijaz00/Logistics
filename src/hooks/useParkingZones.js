import { useState, useEffect } from 'react';
import parkingZonesData from '../data/parkingZones.json';

export function useParkingZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setZones(parkingZonesData);
    setLoading(false);
  }, []);

  const getZoneById = (id) => zones.find(z => z.id === id);

  const getZonesByStatus = (status) => zones.filter(z => z.status === status);

  const getZoneColor = (status) => {
    const colors = {
      free: '#22c55e',
      risky: '#eab308',
      'high-risk': '#f97316',
      private: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  return {
    zones,
    loading,
    getZoneById,
    getZonesByStatus,
    getZoneColor,
  };
}
