import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useJsApiLoader } from '@react-google-maps/api';
import AppContent from './features/shared/components/AppContent';
import { LoginPage } from './features/auth/LoginPage';
import { CarSelectPage } from './features/auth/CarSelectPage';
import { GOOGLE_MAPS_API_KEY, googleMapsLibraries } from './config/googleMaps';
import { useTracking } from './hooks/useTracking';
import { useVehicleStore, useAuthStore } from './store';
import { useCarImageStore } from './store/carImageStore';
import { useActivityStore } from './store/activityStore';
import { useTicketStore } from './store/ticketStore';
import { useParkingStore } from './store/parkingStore';
import { useRequestStore } from './store/requestStore';
import { useNotificationStore } from './store/notificationStore';
import { useEmergencyStore } from './store/emergencyStore';
import { useSavedLocationStore } from './store/savedLocationStore';
import { useLogisticsStore } from './store/logisticsStore';

function App() {
  useTracking();
  useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: googleMapsLibraries });
  const { token, user, fetchMe, carSelectReady } = useAuthStore();

  // Validate token on mount
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Fetch all shared data from backend when authenticated
  useEffect(() => {
    if (token && user) {
      useVehicleStore.getState().fetchVehicles();
      useCarImageStore.getState().fetchImages();
      useActivityStore.getState().fetchActivities();
      useTicketStore.getState().fetchTickets();
      useParkingStore.getState().fetchZones();
      useRequestStore.getState().fetchRequests();
      useNotificationStore.getState().fetchNotifications();
      useEmergencyStore.getState().fetchEmergencies();
      useSavedLocationStore.getState().fetchLocations();
      useLogisticsStore.getState().fetchSession();
    }
  }, [token, user]);

  // Not logged in → show login page
  if (!token || !user) {
    return <LoginPage />;
  }

  // All users must pick a car or click "Not Driving"
  if (!user.selectedVehicleId || !carSelectReady) {
    return <CarSelectPage />;
  }

  // Authenticated + car selected → main app
  return (
    <BrowserRouter unstable_useTransitions={false}>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
