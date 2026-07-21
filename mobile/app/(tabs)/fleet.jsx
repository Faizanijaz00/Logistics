import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Car, ChevronRight, Navigation, Wrench } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { getCarImage } from '../../src/config/carImages';
import { useLayout } from '../../src/hooks/useLayout';
import { useTheme } from '../../src/store/themeStore';

function UKPlate({ registration, small }) {
  if (!registration) return null;
  return (
    <View style={plateStyles.plate}>
      <View style={plateStyles.gbStrip}>
        <Text style={[plateStyles.gbFlag, small && { fontSize: 7 }]}>🇬🇧</Text>
        <Text style={[plateStyles.gbText, small && { fontSize: 5 }]}>GB</Text>
      </View>
      <Text style={[plateStyles.plateText, small && { fontSize: 10, paddingHorizontal: 6, paddingVertical: 1 }]}>{registration}</Text>
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

/* ── Phone layout row (unchanged) ── */
function VehicleRow({ vehicle }) {
  const router = useRouter();
  const t = useTheme();
  const isMaintenance = vehicle.status === 'maintenance' || vehicle.status === 'out_of_order';
  const isActive = vehicle.currentDriver || vehicle.status === 'active';
  const carImage = getCarImage(vehicle.imageId);

  return (
    <TouchableOpacity
      style={[
        styles.vehicleRow,
        { backgroundColor: t.card, borderColor: t.border },
        isMaintenance && styles.vehicleRowMaintenance,
      ]}
      activeOpacity={0.6}
      onPress={() => router.push(`/vehicle/${vehicle.id}`)}>
      <View style={styles.imageBox}>
        {carImage ? (
          <Image source={carImage} style={styles.carImage} resizeMode="contain" />
        ) : (
          <View style={[styles.iconFallback, { backgroundColor: isActive ? '#f0fdf4' : t.inputBg }]}>
            {isMaintenance
              ? <Wrench size={22} color="#ef4444" />
              : <Car size={22} color={isActive ? '#018a16' : t.subtext} />}
          </View>
        )}
        <StatusBadge vehicle={vehicle} />
      </View>
      <View style={styles.vehicleDetails}>
        <Text style={[styles.vehicleName, { color: t.text }]}>{vehicle.make} {vehicle.model}</Text>
        <View style={styles.vehicleMeta}>
          <UKPlate registration={vehicle.licensePlate} />
          {vehicle.fuel?.level != null ? <Text style={[styles.vehicleFuel, { color: t.subtext }]}>{Math.round(vehicle.fuel.level)}%</Text> : null}
        </View>
      </View>
      <View style={styles.statusAndArrow}>
        <View style={[styles.statusDot, { backgroundColor: isMaintenance ? '#ef4444' : isActive ? '#018a16' : '#ccc' }]} />
        <ChevronRight size={18} color={t.subtext} />
      </View>
    </TouchableOpacity>
  );
}

/* ── Unfolded floating card ── */
function FloatingCarCard({ vehicle }) {
  const router = useRouter();
  const t = useTheme();
  const isMaintenance = vehicle.status === 'maintenance' || vehicle.status === 'out_of_order';
  const isActive = vehicle.currentDriver || vehicle.status === 'active';
  const carImage = getCarImage(vehicle.imageId);

  const statusColor = isMaintenance ? '#ef4444' : isActive ? '#018a16' : '#ccc';

  return (
    <TouchableOpacity
      style={[floatStyles.card, { backgroundColor: t.card, borderColor: t.border }]}
      activeOpacity={0.7}
      onPress={() => router.push(`/vehicle/${vehicle.id}`)}
    >
      {/* Floating car image area - no background */}
      <View style={floatStyles.imageArea}>
        {carImage ? (
          <Image source={carImage} style={floatStyles.carImage} resizeMode="contain" />
        ) : (
          <View style={[floatStyles.iconFallback, { backgroundColor: t.inputBg }]}>
            {isMaintenance
              ? <Wrench size={28} color="#ef4444" />
              : <Car size={28} color={isActive ? '#018a16' : t.subtext} />}
          </View>
        )}
        {/* Ground shadow under the car */}
        <View style={floatStyles.groundShadow} />
      </View>

      {/* Card info section */}
      <View style={floatStyles.infoSection}>
        <Text style={[floatStyles.carName, { color: t.text }]} numberOfLines={1}>
          {vehicle.make} {vehicle.model}
        </Text>
        <View style={floatStyles.plateRow}>
          <UKPlate registration={vehicle.licensePlate} small />
        </View>
        <View style={floatStyles.statusRow}>
          <View style={[floatStyles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[floatStyles.statusLabel, { color: statusColor === '#ccc' ? '#999' : statusColor }]}>
            {isMaintenance ? 'Maintenance' : isActive ? 'Active' : 'Parked'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const floatStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
    overflow: 'visible',
    alignItems: 'center',
  },
  imageArea: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    overflow: 'visible',
  },
  carImage: {
    width: '88%',
    height: 85,
    zIndex: 2,
  },
  iconFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  groundShadow: {
    position: 'absolute',
    bottom: 0,
    width: '70%',
    height: 10,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.08)',
    zIndex: 1,
  },
  infoSection: {
    width: '100%',
    paddingHorizontal: 12,
    paddingBottom: 14,
    paddingTop: 4,
    alignItems: 'center',
    gap: 5,
  },
  carName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  plateRow: {
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default function FleetScreen() {
  const { vehicles, loading, fetchVehicles } = useVehicleStore();
  const { isUnfolded } = useLayout();
  const t = useTheme();

  useEffect(() => {
    fetchVehicles();
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <View style={[styles.header, isUnfolded && styles.headerUnfolded]}>
        <Text style={[styles.title, isUnfolded && styles.titleUnfolded, { color: t.text }]}>Fleet</Text>
        <Text style={[styles.count, { color: t.subtext }]}>{vehicles.length} vehicles</Text>
      </View>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={t.text} />
        </View>
      ) : isUnfolded ? (
        /* ── Unfolded: 3-column floating card grid ── */
        <ScrollView style={styles.scrollUnfolded} contentContainerStyle={styles.floatGrid}>
          {vehicles.map(v => (
            <View key={v.id} style={styles.floatGridItem}>
              <FloatingCarCard vehicle={v} />
            </View>
          ))}
        </ScrollView>
      ) : (
        /* ── Phone: original row list ── */
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
  headerUnfolded: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#000' },
  titleUnfolded: { fontSize: 32 },
  count: { fontSize: 13, color: '#888' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  scrollUnfolded: { flex: 1, paddingHorizontal: 28 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* ── Unfolded 3-column floating grid ── */
  floatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingBottom: 20,
  },
  floatGridItem: {
    width: '31.5%',
  },

  /* ── Phone row styles ── */
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
  vehicleFuel: { fontSize: 12, color: '#888', marginLeft: 6 },
  statusAndArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8, height: 8, borderRadius: 4,
  },
});
