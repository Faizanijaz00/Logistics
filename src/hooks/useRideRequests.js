import { useState, useEffect } from 'react';
import rideRequestsData from '../data/rideRequests.json';

export function useRideRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRequests(rideRequestsData);
    setLoading(false);
  }, []);

  const addRequest = (request) => {
    const newRequest = {
      ...request,
      id: `req-${Date.now()}`,
      status: 'pending',
      assignedVehicle: null,
      assignedDriver: null,
      createdAt: new Date().toISOString(),
    };
    setRequests(prev => [...prev, newRequest]);
    return newRequest;
  };

  const updateRequest = (requestId, updates) => {
    setRequests(prev =>
      prev.map(r => (r.id === requestId ? { ...r, ...updates } : r))
    );
  };

  const acceptRequest = (requestId, vehicleId, driverName) => {
    updateRequest(requestId, {
      status: 'accepted',
      assignedVehicle: vehicleId,
      assignedDriver: driverName,
    });
  };

  const rejectRequest = (requestId) => {
    updateRequest(requestId, { status: 'rejected' });
  };

  const getPendingRequests = () => requests.filter(r => r.status === 'pending');

  const getAcceptedRequests = () => requests.filter(r => r.status === 'accepted');

  return {
    requests,
    loading,
    addRequest,
    updateRequest,
    acceptRequest,
    rejectRequest,
    getPendingRequests,
    getAcceptedRequests,
  };
}
