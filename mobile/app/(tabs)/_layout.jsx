import { useState } from 'react';
import { View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { User, Map, Car, Clock, CalendarClock, Shield, Navigation, Menu, LogOut, Route } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import MenuDrawer from '../../src/components/MenuDrawer';

export default function TabLayout() {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const homeLabel = user?.role === 'admin' ? 'Home' : (user?.name || 'Drive');
  const isAdmin = user?.role === 'admin';

  // Secondary destinations live in the drawer to keep the bottom bar uncluttered.
  const drawerItems = [
    { label: 'Bookings', icon: CalendarClock, onPress: () => router.push('/(tabs)/bookings') },
    { label: 'Drives', icon: Clock, onPress: () => router.push('/(tabs)/drives') },
    { label: 'Journeys', icon: Route, onPress: () => router.push('/(tabs)/journeys') },
    ...(isAdmin ? [{ label: 'Admin', icon: Shield, onPress: () => router.push('/(tabs)/admin') }] : []),
    { label: 'Log out', icon: LogOut, danger: true, onPress: () => logout() },
  ];

  const tabBarStyle = { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', height: 88, paddingBottom: 28, paddingTop: 8 };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle,
          tabBarActiveTintColor: '#000',
          tabBarInactiveTintColor: '#999',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: homeLabel, tabBarIcon: ({ color, size }) => <User size={size} color={color} /> }} />
        <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: ({ color, size }) => <Map size={size} color={color} /> }} />
        <Tabs.Screen name="fleet" options={{ title: 'Fleet', tabBarIcon: ({ color, size }) => <Car size={size} color={color} /> }} />
        <Tabs.Screen name="rides" options={{ title: 'Rides', tabBarIcon: ({ color, size }) => <Navigation size={size} color={color} /> }} />
        <Tabs.Screen
          name="menu"
          options={{ title: 'Menu', tabBarIcon: ({ color, size }) => <Menu size={size} color={color} /> }}
          listeners={{ tabPress: (e) => { e.preventDefault(); setMenuOpen(true); } }}
        />

        {/* Moved into the drawer — hidden from the bottom bar */}
        <Tabs.Screen name="bookings" options={{ href: null }} />
        <Tabs.Screen name="drives" options={{ href: null }} />
        <Tabs.Screen name="admin" options={{ href: null }} />
        <Tabs.Screen name="journeys" options={{ href: null }} />
      </Tabs>

      <MenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Menu"
        subtitle={user?.name || ''}
        items={drawerItems}
      />
    </View>
  );
}
