import { useState, useEffect } from 'react';
import vehiclesData from '../data/vehicles.json';

export function useVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch
    setVehicles(vehiclesData);
    setLoading(false);
  }, []);

  const updateVehicle = (vehicleId, updates) => {
    setVehicles(prev =>
      prev.map(v => (v.id === vehicleId ? { ...v, ...updates } : v))
    );
  };

  const getVehicleById = (id) => vehicles.find(v => v.id === id);

  const getActiveVehicles = () => vehicles.filter(v => v.status === 'active');

  const getVehiclesByStatus = (status) => vehicles.filter(v => v.status === status);

  return {
    vehicles,
    loading,
    updateVehicle,
    getVehicleById,
    getActiveVehicles,
    getVehiclesByStatus,
  };
}
