import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Car, ChevronRight, Navigation, Wrench } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { getCarImage } from '../../src/config/carImages';

function UKPlate({ registration }) {
  if (!registration) return null;
  return (
    <View style={plateStyles.plate}>
      <View style={plateStyles.gbStrip}>
        <Text style={plateStyles.gbFlag}>🇬🇧</Text>
        <Text style={plateStyles.gbText}>GB</Text>
      </View>
      <Text style={plateStyles.plateText}>{registration}</Text>
    </View>
  );
}

const plateStyles = StyleSheet.create({
  plate: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: '#1a1a1a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gbStrip: {
    backgroundColor: '#003399',
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  gbFlag: { fontSize: 9, lineHeight: 10 },
  gbText: { fontSize: 6, color: '#fff', fontWeight: '800', letterSpacing: 0.3 },
  plateText: {
    backgroundColor: '#fff',
    color: '#000',
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    alignSelf: 'center',
  },
});

function StatusBadge({ vehicle }) {
  const isMaintenance = vehicle.status === 'maintenance' || vehicle.status === 'out_of_order';
  const isActive = vehicle.currentDriver || vehicle.status === 'active';

  if (isMaintenance) return null; // handled by red border
  if (isActive) {
    return (
      <View style={badgeStyles.badge}>
        <Navigation size={10} color="#fff" fill="#fff" />
      </View>
    );
  }
  return (
    <View style={[badgeStyles.badge, { backgroundColor: '#1d4ed8' }]}>
      <Text style={badgeStyles.pText}>P</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#018a16',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  pText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});

function VehicleRow({ vehicle }) {
  const router = useRouter();
  const isMaintenance = vehicle.status === 'maintenance' || vehicle.status === 'out_of_order';
  const isActive = vehicle.currentDriver || vehicle.status === 'active';
  const carImage = getCarImage(vehicle.imageId);

  return (
    <TouchableOpacity
      style={[styles.vehicleRow, isMaintenance && styles.vehicleRowMaintenance]}
      activeOpacity={0.6}
      onPress={() => router.push(`/vehicle/${vehicle.id}`)}>
      <View style={styles.imageBox}>
        {carImage ? (
          <Image source={carImage} style={styles.carImage} resizeMode="contain" />
        ) : (
          <View style={[styles.iconFallback, { backgroundColor: isActive ? '#f0fdf4' : '#f5f5f5' }]}>
            {isMaintenance
              ? <Wrench size={22} color="#ef4444" />
              : <Car size={22} color={isActive ? '#018a16' : '#888'} />}
          </View>
        )}
        <StatusBadge vehicle={vehicle} />
      </View>
      <View style={styles.vehicleDetails}>
        <Text style={styles.vehicleName}>{vehicle.make} {vehicle.model}</Text>
        <View style={styles.vehicleMeta}>
          <UKPlate registration={vehicle.licensePlate} />
          {vehicle.color ? <Text style={styles.vehicleColor}>{vehicle.color}</Text> : null}
        </View>
      </View>
      <View style={styles.statusAndArrow}>
        <View style={[styles.statusDot, { backgroundColor: isMaintenance ? '#ef4444' : isActive ? '#018a16' : '#ccc' }]} />
        <ChevronRight size={18} color="#ccc" />
      </View>
    </TouchableOpacity>
  );
}

export default function FleetScreen() {
  const { vehicles, loading, fetchVehicles } = useVehicleStore();

  useEffect(() => {
    fetchVehicles();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Fleet</Text>
        <Text style={styles.count}>{vehicles.length} vehicles</Text>
      </View>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 20 }}>
          {vehicles.map(v => (
            <VehicleRow key={v.id} vehicle={v} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#000' },
  count: { fontSize: 13, color: '#888' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  vehicleRowMaintenance: {
    borderColor: '#ef4444',
    borderWidth: 1.5,
  },
  imageBox: {
    width: 90,
    height: 60,
    marginRight: 14,
    position: 'relative',
  },
  carImage: {
    width: '100%',
    height: '100%',
  },
  iconFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  vehicleDetails: { flex: 1 },
  vehicleName: { fontSize: 16, fontWeight: '800', color: '#000', marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  vehicleMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vehicleColor: { fontSize: 12, color: '#888', marginLeft: 6 },
  statusAndArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8, height: 8, borderRadius: 4,
  },
});
