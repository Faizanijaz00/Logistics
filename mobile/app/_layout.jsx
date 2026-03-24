import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { useVehicleStore } from '../src/store/vehicleStore';

function AuthGate({ children }) {
  const { token, user, fetchMe } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    const inAuth = segments[0] === 'login';
    if (!token && !inAuth) {
      router.replace('/login');
    } else if (token && inAuth) {
      router.replace('/(tabs)');
    }
  }, [token, segments]);

  // Fetch vehicles from backend whenever authenticated
  useEffect(() => {
    if (token) {
      useVehicleStore.getState().fetchVehicles();
    }
  }, [token]);

  return children;
}

export default function RootLayout() {
  return (
    <AuthGate>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthGate>
  );
}
