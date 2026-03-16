import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';
import { ModernLayout } from './features/shared/components';
import { ModernMapPage } from './features/map';
import { ModernFleetPage } from './features/fleet';
import { JourneyPlannerPage } from './features/journeys/JourneyPlannerPage';
import { MyProfilePage } from './features/profile';
import { AdminOverviewPage } from './features/admin/AdminOverviewPage';
import { LoginPage } from './features/auth/LoginPage';
import { CarSelectPage } from './features/auth/CarSelectPage';
import { GOOGLE_MAPS_API_KEY, googleMapsLibraries } from './config/googleMaps';
import { useTracking } from './hooks/useTracking';
import { useVehicleStore, useAuthStore } from './store';

function App() {
  useTracking();
  const { token, user, fetchMe, carSelectReady } = useAuthStore();

  // Validate token on mount
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // One-time: move Land Rover to 17 New Wharf Rd, London N1 9RW
  useEffect(() => {
    const state = useVehicleStore.getState();
    const lr = state.vehicles.find(v => {
      const text = `${v.make} ${v.model}`.toLowerCase();
      return text.includes('land') || text.includes('rover') || text.includes('discovery');
    });
    if (lr) {
      state.updateVehicle(lr.id, { position: { lat: 51.5348, lng: -0.1198 } });
    }
  }, []);

  // Not logged in → show login page
  if (!token || !user) {
    return <LoginPage />;
  }

  // All users must pick a car or click "Not Driving"
  if (!user.selectedVehicleId || !carSelectReady) {
    return (
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={googleMapsLibraries}>
        <CarSelectPage />
      </LoadScript>
    );
  }

  // Authenticated + car selected → main app
  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={googleMapsLibraries}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ModernLayout />}>
            <Route index element={<MyProfilePage />} />
            <Route path="map" element={<ModernMapPage />} />
            <Route path="fleet" element={<ModernFleetPage />} />
            <Route path="admin" element={<AdminOverviewPage />} />
            <Route path="journeys" element={<JourneyPlannerPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LoadScript>
  );
}

export default App;
