import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fuel, ReceiptText, AlertTriangle, LogOut, RefreshCw, MapPin, Navigation, X, Car, ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { getCarImage } from '../../src/config/carImages';
import { useLayout } from '../../src/hooks/useLayout';
import { useEffect } from 'react';

function UKPlate({ registration, small }) {
  if (!registration) return null;
  return (
    <View style={[plateStyles.plate, small && plateStyles.plateSmall]}>
      <View style={[plateStyles.gbStrip, small && plateStyles.gbStripSmall]}>
        <Text style={[plateStyles.gbFlag, small && { fontSize: 7, lineHeight: 8 }]}>🇬🇧</Text>
        <Text style={[plateStyles.gbText, small && { fontSize: 5 }]}>GB</Text>
      </View>
      <Text style={[plateStyles.plateText, small && plateStyles.plateTextSmall]}>{registration}</Text>
    </View>
  );
}

const plateStyles = StyleSheet.create({
  plate: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  plateSmall: { borderWidth: 1.5 },
  gbStrip: {
    backgroundColor: '#003399',
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gbStripSmall: { paddingHorizontal: 3 },
  gbFlag: { fontSize: 9, lineHeight: 10 },
  gbText: { fontSize: 6, color: '#fff', fontWeight: '800', letterSpacing: 0.3 },
  plateText: {
    backgroundColor: '#fff',
    color: '#000',
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    alignSelf: 'center',
  },
  plateTextSmall: { fontSize: 11, paddingHorizontal: 6, letterSpacing: 1.5 },
});

function VehiclePickerRow({ vehicle, onSelect }) {
  const carImage = getCarImage(vehicle.imageId);
  const inUse = !!vehicle.currentDriver;
  return (
    <TouchableOpacity
      style={[pickerStyles.row, inUse && pickerStyles.rowInUse]}
      activeOpacity={0.6}
      onPress={() => onSelect(vehicle)}
    >
      <View style={pickerStyles.imageBox}>
        {carImage ? (
          <Image source={carImage} style={[pickerStyles.carImage, inUse && { opacity: 0.55 }]} resizeMode="contain" />
        ) : (
          <View style={pickerStyles.iconFallback}>
            <Car size={22} color="#888" />
          </View>
        )}
      </View>
      <View style={pickerStyles.details}>
        <Text style={pickerStyles.name}>{vehicle.make} {vehicle.model}</Text>
        <View style={pickerStyles.meta}>
          <UKPlate registration={vehicle.licensePlate} small />
          {vehicle.color ? <Text style={pickerStyles.color}>{vehicle.color}</Text> : null}
        </View>
        {inUse ? (
          <Text style={pickerStyles.driverBadge}>In use by {vehicle.currentDriver}</Text>
        ) : null}
      </View>
      <ChevronRight size={18} color="#ccc" />
    </TouchableOpacity>
  );
}

const pickerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  rowInUse: { backgroundColor: '#fafafa', borderColor: '#e2e2e2' },
  driverBadge: { fontSize: 11, color: '#dc2626', fontWeight: '600', marginTop: 4 },
  imageBox: { width: 90, height: 58, marginRight: 14 },
  carImage: { width: '100%', height: '100%' },
  iconFallback: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f5f5f5', borderRadius: 8,
  },
  details: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#000', marginBottom: 5 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  color: { fontSize: 12, color: '#888' },
});

export default function HomeScreen() {
  const { user, logout, selectedVehicleId, isDriving, selectVehicle, stopDriving, switchVehicle } = useAuthStore();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const [showPicker, setShowPicker] = useState(false);
  const { isUnfolded } = useLayout();

  useEffect(() => { fetchVehicles(); }, []);

  // Resolve the persisted vehicleId to the actual vehicle object
  const vehicle = selectedVehicleId
    ? vehicles.find(v => v.id === selectedVehicleId) || null
    : null;

  // If we just selected a vehicle but vehicles haven't loaded yet, retry
  useEffect(() => {
    if (isDriving && selectedVehicleId && !vehicle && vehicles.length === 0) {
      fetchVehicles();
    }
  }, [isDriving, selectedVehicleId, vehicle, vehicles.length]);

  function handleSelectVehicle(v) {
    selectVehicle(v.id);
    setShowPicker(false);
  }

  function handleStopDriving() {
    stopDriving();
  }

  function handleSwitchCar() {
    setShowPicker(true);
  }

  const availableVehicles = vehicles;
  const carImage = vehicle ? getCarImage(vehicle.imageId) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, isUnfolded && styles.contentUnfolded]} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, isUnfolded && styles.greetingUnfolded]}>Hello, {user?.name?.split(' ')[0] || user?.username}</Text>
            <Text style={styles.role}>{isDriving ? 'On a journey' : 'Ready to drive'}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <LogOut size={16} color="#c4001a" />
          </TouchableOpacity>
        </View>

        {isDriving && vehicle ? (
          isUnfolded ? (
            /* ── Unfolded driving layout: side-by-side ── */
            <>
              <View style={styles.unfoldedDrivingRow}>
                {/* Left half: hero car */}
                <View style={styles.unfoldedHeroCol}>
                  <View style={styles.heroBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>ACTIVE</Text>
                  </View>
                  <Text style={styles.heroNameUnfolded}>{vehicle.make} {vehicle.model}</Text>
                  <UKPlate registration={vehicle.licensePlate} />
                  {carImage ? (
                    <Image source={carImage} style={styles.heroImageUnfolded} resizeMode="contain" />
                  ) : (
                    <View style={styles.heroImageFallback}>
                      <Car size={48} color="#ccc" />
                    </View>
                  )}
                  <View style={styles.groundShadow} />
                </View>

                {/* Right half: stats + actions */}
                <View style={styles.unfoldedInfoCol}>
                  {/* Stats Row */}
                  <View style={styles.statsRowUnfolded}>
                    <View style={styles.statCard}>
                      <Navigation size={16} color="#018a16" />
                      <Text style={styles.statLabel}>Status</Text>
                      <Text style={styles.statValue}>Driving</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCard}>
                      <MapPin size={16} color="#3B82F6" />
                      <Text style={styles.statLabel}>Destination</Text>
                      <Text style={styles.statValue} numberOfLines={1}>{vehicle.destination || 'Not set'}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCard}>
                      <View style={[styles.fuelDot, { backgroundColor: (vehicle.fuel?.level ?? 0) > 50 ? '#018a16' : (vehicle.fuel?.level ?? 0) > 20 ? '#f97316' : '#c4001a' }]} />
                      <Text style={styles.statLabel}>Fuel</Text>
                      <Text style={styles.statValue}>{vehicle.fuel?.level != null ? `${vehicle.fuel.level}%` : '—'}</Text>
                    </View>
                  </View>

                  {/* Action Grid */}
                  <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.actionTile} activeOpacity={0.7}>
                      <View style={[styles.actionIcon, { backgroundColor: '#fff7ed' }]}>
                        <Fuel size={20} color="#f97316" />
                      </View>
                      <Text style={styles.actionLabel}>Fuel Up</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionTile} activeOpacity={0.7}>
                      <View style={[styles.actionIcon, { backgroundColor: '#faf5ff' }]}>
                        <ReceiptText size={20} color="#7c3aed" />
                      </View>
                      <Text style={styles.actionLabel}>Add Ticket</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionTile} activeOpacity={0.7}>
                      <View style={[styles.actionIcon, { backgroundColor: '#fef2f2' }]}>
                        <AlertTriangle size={20} color="#dc2626" />
                      </View>
                      <Text style={styles.actionLabel}>Report Issue</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionTile} activeOpacity={0.7} onPress={handleSwitchCar}>
                      <View style={[styles.actionIcon, { backgroundColor: '#f0f9ff' }]}>
                        <RefreshCw size={20} color="#0284c7" />
                      </View>
                      <Text style={styles.actionLabel}>Switch Car</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Stop Driving */}
                  <TouchableOpacity style={styles.stopBtn} activeOpacity={0.8} onPress={handleStopDriving}>
                    <LogOut size={18} color="#c4001a" />
                    <Text style={styles.stopBtnText}>Stop Driving — Park Vehicle</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            /* ── Phone driving layout (unchanged) ── */
            <>
              {/* Vehicle Hero — floating, no card bg */}
              <View style={styles.heroSection}>
                <View style={styles.heroBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>ACTIVE</Text>
                </View>

                <Text style={styles.heroName}>{vehicle.make} {vehicle.model}</Text>
                <UKPlate registration={vehicle.licensePlate} />

                {carImage ? (
                  <Image source={carImage} style={styles.heroImage} resizeMode="contain" />
                ) : (
                  <View style={styles.heroImageFallback}>
                    <Car size={48} color="#ccc" />
                  </View>
                )}
                <View style={styles.groundShadow} />
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Navigation size={16} color="#018a16" />
                  <Text style={styles.statLabel}>Status</Text>
                  <Text style={styles.statValue}>Driving</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCard}>
                  <MapPin size={16} color="#3B82F6" />
                  <Text style={styles.statLabel}>Destination</Text>
                  <Text style={styles.statValue} numberOfLines={1}>{vehicle.destination || 'Not set'}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCard}>
                  <View style={[styles.fuelDot, { backgroundColor: (vehicle.fuel?.level ?? 0) > 50 ? '#018a16' : (vehicle.fuel?.level ?? 0) > 20 ? '#f97316' : '#c4001a' }]} />
                  <Text style={styles.statLabel}>Fuel</Text>
                  <Text style={styles.statValue}>{vehicle.fuel?.level != null ? `${vehicle.fuel.level}%` : '—'}</Text>
                </View>
              </View>

              {/* Action Grid */}
              <View style={styles.actionGrid}>
                <TouchableOpacity style={styles.actionTile} activeOpacity={0.7}>
                  <View style={[styles.actionIcon, { backgroundColor: '#fff7ed' }]}>
                    <Fuel size={20} color="#f97316" />
                  </View>
                  <Text style={styles.actionLabel}>Fuel Up</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionTile} activeOpacity={0.7}>
                  <View style={[styles.actionIcon, { backgroundColor: '#faf5ff' }]}>
                    <ReceiptText size={20} color="#7c3aed" />
                  </View>
                  <Text style={styles.actionLabel}>Add Ticket</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionTile} activeOpacity={0.7}>
                  <View style={[styles.actionIcon, { backgroundColor: '#fef2f2' }]}>
                    <AlertTriangle size={20} color="#dc2626" />
                  </View>
                  <Text style={styles.actionLabel}>Report Issue</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionTile} activeOpacity={0.7} onPress={() => setShowPicker(true)}>
                  <View style={[styles.actionIcon, { backgroundColor: '#f0f9ff' }]}>
                    <RefreshCw size={20} color="#0284c7" />
                  </View>
                  <Text style={styles.actionLabel}>Switch Car</Text>
                </TouchableOpacity>
              </View>

              {/* Stop Driving */}
              <TouchableOpacity style={styles.stopBtn} activeOpacity={0.8} onPress={handleStopDriving}>
                <LogOut size={18} color="#c4001a" />
                <Text style={styles.stopBtnText}>Stop Driving — Park Vehicle</Text>
              </TouchableOpacity>
            </>
          )
        ) : (
          /* Not Driving */
          <View style={[styles.emptyState, isUnfolded && styles.emptyStateUnfolded]}>
            <View style={[styles.emptyCarBox, isUnfolded && styles.emptyCarBoxUnfolded]}>
              <Car size={isUnfolded ? 48 : 40} color="#d1d5db" />
            </View>
            <Text style={[styles.emptyTitle, isUnfolded && styles.emptyTitleUnfolded]}>No vehicle selected</Text>
            <Text style={[styles.emptySubtitle, isUnfolded && styles.emptySubtitleUnfolded]}>Choose a vehicle to begin your journey</Text>
            <TouchableOpacity style={[styles.selectBtn, isUnfolded && styles.selectBtnUnfolded]} activeOpacity={0.85} onPress={() => setShowPicker(true)}>
              <Navigation size={18} color="#fff" />
              <Text style={styles.selectBtnText}>Select Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Vehicle Picker Modal */}
      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPicker(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Select Vehicle</Text>
              <Text style={styles.modalSubtitle}>{availableVehicles.filter(v => !v.currentDriver).length} of {availableVehicles.length} available</Text>
            </View>
            <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.closeBtn}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalList}>
            {availableVehicles.length === 0 ? (
              <Text style={styles.noVehicles}>No vehicles available</Text>
            ) : (
              availableVehicles.map(v => (
                <VehiclePickerRow key={v.id} vehicle={v} onSelect={handleSelectVehicle} />
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  contentUnfolded: { padding: 28, paddingBottom: 48 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { fontSize: 24, fontWeight: '700', color: '#000' },
  greetingUnfolded: { fontSize: 28 },
  role: { fontSize: 13, color: '#888', marginTop: 2 },
  logoutBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#fecaca',
  },

  // Hero — floating, no card
  heroSection: {
    alignItems: 'center',
    marginBottom: 6,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#018a16' },
  liveText: { fontSize: 10, fontWeight: '700', color: '#018a16', letterSpacing: 1 },
  heroName: { fontSize: 28, fontWeight: '800', color: '#000', marginBottom: 8, textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase' },
  heroImage: { width: '110%', height: 260, marginTop: -10 },
  heroImageFallback: {
    width: '100%', height: 220, alignItems: 'center', justifyContent: 'center',
  },
  groundShadow: {
    width: 200,
    height: 10,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginTop: -4,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
    alignItems: 'center',
  },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: '#f0f0f0' },
  statLabel: { fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 13, fontWeight: '600', color: '#000' },
  fuelDot: { width: 16, height: 16, borderRadius: 8 },

  // Action grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  actionTile: {
    width: '47.5%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  actionIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#222' },

  // Stop
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  stopBtnText: { fontSize: 14, fontWeight: '600', color: '#c4001a' },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyStateUnfolded: { paddingTop: 90, paddingHorizontal: 40 },
  emptyCarBox: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, borderWidth: 1, borderColor: '#ebebeb',
  },
  emptyCarBoxUnfolded: { width: 110, height: 110, borderRadius: 55, marginBottom: 28 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 6 },
  emptyTitleUnfolded: { fontSize: 24 },
  emptySubtitle: { fontSize: 14, color: '#aaa', marginBottom: 28, textAlign: 'center' },
  emptySubtitleUnfolded: { fontSize: 16, marginBottom: 36 },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#000',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 15,
  },
  selectBtnUnfolded: { paddingHorizontal: 44, paddingVertical: 18, borderRadius: 16 },
  selectBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // ── Unfolded driving layout ──
  unfoldedDrivingRow: {
    flexDirection: 'row',
    gap: 20,
  },
  unfoldedHeroCol: {
    flex: 1,
    alignItems: 'center',
  },
  heroNameUnfolded: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroImageUnfolded: {
    width: '115%',
    height: 200,
    marginTop: -6,
  },
  unfoldedInfoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  statsRowUnfolded: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
    alignItems: 'center',
  },

  // Modal
  modalSafe: { flex: 1, backgroundColor: '#f5f5f5' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#000' },
  modalSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  modalList: { paddingHorizontal: 20, paddingBottom: 20 },
  noVehicles: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
});
