import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, Modal, TextInput, Switch, ActivityIndicator, Alert, KeyboardAvoidingView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fuel, ReceiptText, AlertTriangle, LogOut, RefreshCw, MapPin, Navigation, X, Car, ChevronRight, ChevronDown, ChevronUp, Users, Route, Plus, Trash2, CheckCircle2, Clock, Coins } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { getCarImage } from '../../src/config/carImages';
import { useLayout } from '../../src/hooks/useLayout';
import { SERVER_URL } from '../../src/config/api';
import ReceiptPicker from '../../src/components/ReceiptPicker';
import ReceiptViewer from '../../src/components/ReceiptViewer';
import DateField from '../../src/components/DateField';
import UpdateBanner from '../../src/components/UpdateBanner';
import { captureReceiptPhoto, pickReceiptFromLibrary } from '../../src/lib/receipts';

// Same Mapbox token the map uses — powers destination address autocomplete.
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

// Time-of-day greeting based on the device's local clock.
function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Appeal/paid state lives in `status`; deadlines ride inside plan_for_contesting
// as JSON. Accept legacy camelCase/snake fields too so older tickets still read.
function parseTicketMeta(t) {
  let meta = {};
  const raw = t?.plan_for_contesting;
  if (raw && typeof raw === 'string' && raw.trim().startsWith('{')) {
    try { meta = JSON.parse(raw); } catch {}
  }
  const appealing = t?.appealing || meta.appealing || (t?.status === 'Appealing' ? 'yes' : 'undecided');
  const appealDeadline = t?.appeal_deadline || t?.appealDeadline || meta.appeal_deadline || '';
  const paymentDeadline = t?.payment_deadline || t?.paymentDeadline || meta.payment_deadline || '';
  const paid = !!t?.paid || t?.status === 'Paid';
  const receiptPath = t?.receipt_path || meta.receipt_path || null;
  return { appealing, appealDeadline, paymentDeadline, paid, receiptPath };
}

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

function VehiclePickerRow({ vehicle, onSelect, currentUser }) {
  const carImage = getCarImage(vehicle.imageId);
  const driverId = vehicle.currentDriverId || vehicle.current_driver_id;
  const isMine = driverId && currentUser?.id && driverId === currentUser.id;
  const inUse = !!vehicle.currentDriver && !isMine;
  return (
    <TouchableOpacity
      style={[pickerStyles.row, inUse && pickerStyles.rowInUse, isMine && pickerStyles.rowMine]}
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
        {isMine ? (
          <Text style={pickerStyles.mineBadge}>Currently driving</Text>
        ) : inUse ? (
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
  rowMine: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  driverBadge: { fontSize: 11, color: '#dc2626', fontWeight: '600', marginTop: 4 },
  mineBadge: { fontSize: 11, color: '#018a16', fontWeight: '700', marginTop: 4 },
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
  const role = useAuthStore(s => s.user?.role);
  if (role === 'admin') return <AdminHomeScreen />;
  return <DriverHomeScreen />;
}

function DriverHomeScreen() {
  const { user, token, logout, selectedVehicleId, isDriving, selectVehicle, stopDriving, switchVehicle, resumeDriving, reconcileFromVehicles } = useAuthStore();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const [showPicker, setShowPicker] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showDestModal, setShowDestModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const { isUnfolded } = useLayout();

  // If a drive was in progress when the app was last closed, re-arm live tracking.
  useEffect(() => { resumeDriving(); }, []);

  // Keep the vehicle list (and therefore "who's driving which car") fresh while
  // this tab is focused, so every device shows the same, current assignments.
  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
      const id = setInterval(fetchVehicles, 6000);
      return () => clearInterval(id);
    }, [fetchVehicles])
  );

  // Reconcile local driving state against the shared server truth.
  useEffect(() => { reconcileFromVehicles(vehicles); }, [vehicles, reconcileFromVehicles]);

  // Fetch drivers list once (used by the Add Ticket modal)
  useEffect(() => {
    if (!token) return;
    fetch(`${SERVER_URL}/api/auth/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        const filtered = (Array.isArray(list) ? list : []).filter(
          u => u.role === 'driver' || u.role === 'admin'
        );
        setDrivers(filtered);
      })
      .catch(() => {});
  }, [token]);

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
    selectVehicle(v.id, `${v.make} ${v.model}`);
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
            <Text style={[styles.greeting, isUnfolded && styles.greetingUnfolded]}>{timeGreeting()}, {user?.name?.split(' ')[0] || user?.username}</Text>
            <Text style={styles.role}>{isDriving ? 'On a journey' : 'Ready to drive'}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <LogOut size={16} color="#c4001a" />
          </TouchableOpacity>
        </View>

        <UpdateBanner />

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
                    <TouchableOpacity style={styles.statCard} activeOpacity={0.6} onPress={() => setShowDestModal(true)}>
                      <MapPin size={16} color="#3B82F6" />
                      <Text style={styles.statLabel}>Destination</Text>
                      <Text style={styles.statValue} numberOfLines={1}>{vehicle.destination || 'Tap to set'}</Text>
                    </TouchableOpacity>
                    <View style={styles.statDivider} />
                    <View style={styles.statCard}>
                      <View style={[styles.fuelDot, { backgroundColor: (vehicle.fuel?.level ?? 0) > 50 ? '#018a16' : (vehicle.fuel?.level ?? 0) > 20 ? '#f97316' : '#c4001a' }]} />
                      <Text style={styles.statLabel}>Fuel</Text>
                      <Text style={styles.statValue}>{vehicle.fuel?.level != null ? `${Math.round(vehicle.fuel.level)}%` : '—'}</Text>
                    </View>
                  </View>

                  {/* Action Grid */}
                  <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.actionTile} activeOpacity={0.7} onPress={() => setShowFuelModal(true)}>
                      <View style={[styles.actionIcon, { backgroundColor: '#fff7ed' }]}>
                        <Fuel size={20} color="#f97316" />
                      </View>
                      <Text style={styles.actionLabel}>Fuel Up</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionTile} activeOpacity={0.7} onPress={() => setShowTicketModal(true)}>
                      <View style={[styles.actionIcon, { backgroundColor: '#faf5ff' }]}>
                        <ReceiptText size={20} color="#7c3aed" />
                      </View>
                      <Text style={styles.actionLabel}>Add Ticket</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionTile} activeOpacity={0.7} onPress={() => setShowIssueModal(true)}>
                      <View style={[styles.actionIcon, { backgroundColor: '#fef2f2' }]}>
                        <AlertTriangle size={20} color="#dc2626" />
                      </View>
                      <Text style={styles.actionLabel}>Report Issue</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionTile} activeOpacity={0.7} onPress={() => setShowChargeModal(true)}>
                      <View style={[styles.actionIcon, { backgroundColor: '#f0fdf4' }]}>
                        <Coins size={20} color="#018a16" />
                      </View>
                      <Text style={styles.actionLabel}>Pay for Toll</Text>
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
                <TouchableOpacity style={styles.statCard} activeOpacity={0.6} onPress={() => setShowDestModal(true)}>
                  <MapPin size={16} color="#3B82F6" />
                  <Text style={styles.statLabel}>Destination</Text>
                  <Text style={styles.statValue} numberOfLines={1}>{vehicle.destination || 'Tap to set'}</Text>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <View style={styles.statCard}>
                  <View style={[styles.fuelDot, { backgroundColor: (vehicle.fuel?.level ?? 0) > 50 ? '#018a16' : (vehicle.fuel?.level ?? 0) > 20 ? '#f97316' : '#c4001a' }]} />
                  <Text style={styles.statLabel}>Fuel</Text>
                  <Text style={styles.statValue}>{vehicle.fuel?.level != null ? `${Math.round(vehicle.fuel.level)}%` : '—'}</Text>
                </View>
              </View>

              {/* Action Grid */}
              <View style={styles.actionGrid}>
                <TouchableOpacity style={styles.actionTile} activeOpacity={0.7} onPress={() => setShowFuelModal(true)}>
                  <View style={[styles.actionIcon, { backgroundColor: '#fff7ed' }]}>
                    <Fuel size={20} color="#f97316" />
                  </View>
                  <Text style={styles.actionLabel}>Fuel Up</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionTile} activeOpacity={0.7} onPress={() => setShowTicketModal(true)}>
                  <View style={[styles.actionIcon, { backgroundColor: '#faf5ff' }]}>
                    <ReceiptText size={20} color="#7c3aed" />
                  </View>
                  <Text style={styles.actionLabel}>Add Ticket</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionTile} activeOpacity={0.7} onPress={() => setShowIssueModal(true)}>
                  <View style={[styles.actionIcon, { backgroundColor: '#fef2f2' }]}>
                    <AlertTriangle size={20} color="#dc2626" />
                  </View>
                  <Text style={styles.actionLabel}>Report Issue</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionTile} activeOpacity={0.7} onPress={() => setShowChargeModal(true)}>
                  <View style={[styles.actionIcon, { backgroundColor: '#f0fdf4' }]}>
                    <Coins size={20} color="#018a16" />
                  </View>
                  <Text style={styles.actionLabel}>Pay for Toll</Text>
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
                <VehiclePickerRow key={v.id} vehicle={v} onSelect={handleSelectVehicle} currentUser={user} />
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Fuel Up Modal */}
      <FuelUpModal
        visible={showFuelModal}
        onClose={() => setShowFuelModal(false)}
        vehicle={vehicle}
        user={user}
        token={token}
      />

      {/* Add Ticket Modal */}
      <AddTicketModal
        visible={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        vehicle={vehicle}
        user={user}
        token={token}
        drivers={drivers}
      />

      {/* Report Issue Modal */}
      <ReportIssueModal
        visible={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        vehicle={vehicle}
        user={user}
        token={token}
      />

      {/* Destination Modal */}
      <DestinationModal
        visible={showDestModal}
        onClose={() => setShowDestModal(false)}
        vehicle={vehicle}
        token={token}
        onSaved={() => fetchVehicles()}
      />

      {/* Pay for Toll / Charge Modal */}
      <ChargeModal
        visible={showChargeModal}
        onClose={() => setShowChargeModal(false)}
        vehicle={vehicle}
        user={user}
        token={token}
      />
    </SafeAreaView>
  );
}

// ── Fuel Up Modal ──────────────────────────────────────────────────────────────
function FuelUpModal({ visible, onClose, vehicle, user, token }) {
  const [amount, setAmount] = useState('');
  const [usedFuelCard, setUsedFuelCard] = useState(false);
  const [receiptPath, setReceiptPath] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isMercedesGLE = vehicle?.id === 'v1';

  useEffect(() => {
    if (visible) {
      setAmount('');
      setUsedFuelCard(false);
      setReceiptPath(null);
    }
  }, [visible]);

  async function handleSubmit() {
    if (!vehicle) return;
    const numeric = parseFloat(amount);
    if (isNaN(numeric) || numeric <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        vehicleId: vehicle.id,
        amount: numeric,
        paidBy: user?.name || user?.username || '',
        receiptPath,
      };
      if (isMercedesGLE) body.usedFuelCard = usedFuelCard;

      const resp = await fetch(`${SERVER_URL}/api/fuel-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save fuel record');
      }
      onClose();
      Alert.alert('Saved', `Fuel record of £${numeric.toFixed(2)} added.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Fuel Up</Text>
              <Text style={styles.modalSubtitle}>{vehicle?.make} {vehicle?.model}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Amount paid</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>£</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#bbb"
                autoFocus
              />
            </View>

            {isMercedesGLE && (
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Used fuel card</Text>
                  <Text style={styles.toggleHint}>Mercedes GLE only</Text>
                </View>
                <Switch
                  value={usedFuelCard}
                  onValueChange={setUsedFuelCard}
                  trackColor={{ false: '#ddd', true: '#018a16' }}
                />
              </View>
            )}

            <Text style={styles.fieldLabel}>Receipt</Text>
            <ReceiptPicker kind="fuel" token={token} onChange={setReceiptPath} label="Attach fuel receipt" />

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }, { marginTop: 16 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Fuel Record</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Add Ticket Modal ───────────────────────────────────────────────────────────
// Deliberately minimal: the driver just snaps a photo of the ticket. It's logged
// against their current vehicle (or a passed-in one); an admin fills in the
// reference / amount / appeal / deadlines later by tapping the ticket.
export function AddTicketModal({ visible, onClose, vehicle, user, token, vehicles = [], onSaved }) {
  const selectedVehicleId = useAuthStore(s => s.selectedVehicleId);
  const [receiptPath, setReceiptPath] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) setReceiptPath(null);
  }, [visible]);

  // Auto-use the driver's current vehicle; fall back to a passed-in vehicle.
  const effectiveVehicle = vehicle || vehicles.find(v => v.id === selectedVehicleId) || null;

  async function handleSubmit() {
    if (!receiptPath) {
      Alert.alert('Add a photo', 'Attach a photo of the ticket first.');
      return;
    }
    setSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const body = {
        id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        vehicle_id: effectiveVehicle?.id || null,
        driver_id: user?.id || null,
        date: nowIso.slice(0, 10),
        status: 'Issued',
        plan_for_contesting: JSON.stringify({ receipt_path: receiptPath }),
        created_at: nowIso,
        updated_at: nowIso,
      };
      const resp = await fetch(`${SERVER_URL}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save ticket');
      }
      onSaved?.();
      onClose();
      Alert.alert('Saved', 'Ticket photo added — an admin can fill in the details.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>Add Ticket</Text>
            <Text style={styles.modalSubtitle}>
              {effectiveVehicle ? `${effectiveVehicle.make} ${effectiveVehicle.model}` : 'Snap the ticket'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={18} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalList}>
          <Text style={styles.fieldLabel}>Ticket photo</Text>
          <ReceiptPicker kind="ticket" token={token} onChange={setReceiptPath} label="Attach ticket photo" />

          <TouchableOpacity
            style={[styles.primaryBtn, (submitting || !receiptPath) && { opacity: 0.6 }, { marginTop: 16 }]}
            onPress={handleSubmit}
            disabled={submitting || !receiptPath}
            activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Ticket</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Pay for Toll / Charge Modal ────────────────────────────────────────────────
// Logs a toll / airport charge / airport parking as a ticket-category record so
// it lands in the Tickets tab alongside PCNs (with a `type` + amount + receipt).
function ChargeModal({ visible, onClose, vehicle, user, token, vehicles = [], onSaved }) {
  const selectedVehicleId = useAuthStore(s => s.selectedVehicleId);
  const [type, setType] = useState('Toll');
  const [amount, setAmount] = useState('');
  const [receiptPath, setReceiptPath] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const CHARGE_TYPES = ['Toll', 'Airport Charge', 'Airport Parking'];

  useEffect(() => {
    if (visible) { setType('Toll'); setAmount(''); setReceiptPath(null); }
  }, [visible]);

  const effectiveVehicle = vehicle || vehicles.find(v => v.id === selectedVehicleId) || null;

  async function handleSubmit() {
    const numeric = parseFloat(amount);
    if (isNaN(numeric) || numeric <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid amount.');
      return;
    }
    setSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const meta = { kind: 'charge' };
      if (receiptPath) meta.receipt_path = receiptPath;
      const body = {
        id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        vehicle_id: effectiveVehicle?.id || null,
        driver_id: user?.id || null,
        type,
        outstanding: numeric,
        date: nowIso.slice(0, 10),
        notes: type,
        status: 'Paid',
        paid: true,
        plan_for_contesting: JSON.stringify(meta),
        created_at: nowIso,
        updated_at: nowIso,
      };
      const resp = await fetch(`${SERVER_URL}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save charge');
      }
      onSaved?.();
      onClose();
      Alert.alert('Saved', `${type} of £${numeric.toFixed(2)} logged.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Pay for Toll</Text>
              <Text style={styles.modalSubtitle}>
                {effectiveVehicle ? `${effectiveVehicle.make} ${effectiveVehicle.model}` : 'Log a charge'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Charge type</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {CHARGE_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.severityChip, type === t && styles.severityChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.severityChipText, type === t && styles.severityChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Amount paid</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>£</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#bbb"
                autoFocus
              />
            </View>

            <Text style={styles.fieldLabel}>Receipt (optional)</Text>
            <ReceiptPicker kind="ticket" token={token} onChange={setReceiptPath} label="Attach receipt photo" />

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }, { marginTop: 16 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Charge</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Report Issue Modal ─────────────────────────────────────────────────────────
function ReportIssueModal({ visible, onClose, vehicle, user, token }) {
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('low');
  const [photoPath, setPhotoPath] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setDescription('');
      setSeverity('low');
      setPhotoPath(null);
    }
  }, [visible]);

  async function handleSubmit() {
    if (!vehicle) return;
    if (!description.trim()) {
      Alert.alert('Missing description', 'Please describe the issue.');
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        vehicleId: vehicle.id,
        reportedBy: user?.name || user?.username || '',
        description: description.trim(),
        severity,
        photoPath,
        createdAt: new Date().toISOString(),
      };
      const resp = await fetch(`${SERVER_URL}/api/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to report issue');
      }
      onClose();
      Alert.alert('Reported', 'Issue submitted.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const SEVERITIES = [
    { key: 'low', label: 'Low', color: '#018a16', bg: '#f0fdf4' },
    { key: 'medium', label: 'Medium', color: '#d97706', bg: '#fffbeb' },
    { key: 'high', label: 'High', color: '#c4001a', bg: '#fef2f2' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Report Issue</Text>
              <Text style={styles.modalSubtitle}>{vehicle?.make} {vehicle?.model}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.multilineTall]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the issue..."
              placeholderTextColor="#bbb"
              multiline
              autoFocus
            />

            <Text style={styles.fieldLabel}>Severity</Text>
            <View style={styles.severityRow}>
              {SEVERITIES.map(s => {
                const selected = severity === s.key;
                return (
                  <TouchableOpacity
                    key={s.key}
                    style={[
                      styles.severityChip,
                      selected && { backgroundColor: s.bg, borderColor: s.color },
                    ]}
                    onPress={() => setSeverity(s.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.severityChipText, selected && { color: s.color, fontWeight: '700' }]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Photo</Text>
            <ReceiptPicker kind="issue" token={token} onChange={setPhotoPath} label="Attach issue photo" />

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }, { marginTop: 16 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Report Issue</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Destination Modal ─────────────────────────────────────────────────────────
function DestinationModal({ visible, onClose, vehicle, token, onSaved }) {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Skip the autocomplete lookup right after we programmatically set the text
  // (prefill on open, or picking a suggestion) so it doesn't re-search itself.
  const skipSearch = useRef(false);

  useEffect(() => {
    if (visible) {
      setText(vehicle?.destination || '');
      setSuggestions([]);
      setSearched(false);
      skipSearch.current = true;
    }
  }, [visible, vehicle?.destination]);

  // Debounced Mapbox address autocomplete.
  useEffect(() => {
    if (skipSearch.current) { skipSearch.current = false; return; }
    const q = text.trim();
    if (q.length < 3 || !MAPBOX_TOKEN) { setSuggestions([]); setSearching(false); setSearched(false); return; }
    let alive = true;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
          + `?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&types=poi,address,place,locality,neighborhood`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (alive) setSuggestions(Array.isArray(data.features) ? data.features : []);
      } catch {
        if (alive) setSuggestions([]);
      } finally {
        if (alive) { setSearching(false); setSearched(true); }
      }
    }, 300);
    return () => { alive = false; clearTimeout(timer); };
  }, [text]);

  function pickSuggestion(feature) {
    skipSearch.current = true;
    setText(feature.place_name);
    setSuggestions([]);
    save(feature.place_name);
  }

  async function save(dest) {
    if (!vehicle) return;
    setSubmitting(true);
    try {
      const resp = await fetch(`${SERVER_URL}/api/vehicles/${vehicle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ destination: dest }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update destination');
      }
      onSaved?.();
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Set Destination</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 18 }}>
            <Text style={styles.fieldLabel}>Where are you heading?</Text>
            <View style={destStyles.inputWrap}>
              <TextInput
                style={styles.textInput}
                value={text}
                onChangeText={setText}
                placeholder="Search an address or place…"
                placeholderTextColor="#aaa"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searching ? (
                <ActivityIndicator size="small" color="#888" style={destStyles.inputSpinner} />
              ) : null}
            </View>

            {suggestions.length > 0 ? (
              <View style={destStyles.suggestions}>
                {suggestions.map(f => (
                  <TouchableOpacity
                    key={f.id}
                    style={destStyles.suggestionRow}
                    onPress={() => pickSuggestion(f)}
                    activeOpacity={0.6}
                  >
                    <MapPin size={16} color="#0061bd" />
                    <View style={{ flex: 1 }}>
                      <Text style={destStyles.suggestionTitle} numberOfLines={1}>{f.text || f.place_name}</Text>
                      <Text style={destStyles.suggestionSub} numberOfLines={1}>{f.place_name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : searched && !searching && text.trim().length >= 3 ? (
              <View style={destStyles.noMatch}>
                <Text style={destStyles.noMatchText}>No matches — you can still save what you typed.</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
              onPress={() => save(text.trim())}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save destination</Text>}
            </TouchableOpacity>
            {vehicle?.destination ? (
              <TouchableOpacity
                style={[styles.secondaryBtn, submitting && { opacity: 0.6 }]}
                onPress={() => save('')}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>Clear destination</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const destStyles = StyleSheet.create({
  inputWrap: { position: 'relative', justifyContent: 'center' },
  inputSpinner: { position: 'absolute', right: 14 },
  suggestions: { marginTop: 6, borderWidth: 1, borderColor: '#eee', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  suggestionTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  suggestionSub: { fontSize: 12, color: '#888', marginTop: 1 },
  noMatch: { marginTop: 6, paddingHorizontal: 4 },
  noMatchText: { fontSize: 12, color: '#999' },
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN HOME SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

function AdminHomeScreen() {
  const { user, token, logout } = useAuthStore();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const { isUnfolded } = useLayout();

  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [trips, setTrips] = useState([]);
  const [issues, setIssues] = useState([]);
  const [fuelRecords, setFuelRecords] = useState([]);
  const [drives, setDrives] = useState([]);

  const [open, setOpen] = useState({
    fleet: true,
    users: false,
    tickets: false,
    trips: false,
    drives: false,
    issues: false,
    fuel: false,
  });

  const authedFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(`${SERVER_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed (${res.status})`);
    }
    if (res.status === 204) return null;
    return res.json().catch(() => null);
  }, [token]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await authedFetch('/api/auth/users');
      setUsers(Array.isArray(data) ? data : (data?.users || []));
    } catch {}
  }, [authedFetch]);

  const loadTickets = useCallback(async () => {
    try {
      const data = await authedFetch('/api/tickets');
      setTickets(Array.isArray(data) ? data : (data?.tickets || []));
    } catch {}
  }, [authedFetch]);

  const loadTrips = useCallback(async () => {
    try {
      const data = await authedFetch('/api/trips');
      setTrips(Array.isArray(data) ? data : (data?.trips || []));
    } catch {}
  }, [authedFetch]);

  const loadIssues = useCallback(async () => {
    try {
      const data = await authedFetch('/api/issues');
      setIssues(Array.isArray(data) ? data : (data?.issues || []));
    } catch {}
  }, [authedFetch]);

  const loadFuelRecords = useCallback(async () => {
    try {
      const data = await authedFetch('/api/fuel-records');
      setFuelRecords(Array.isArray(data) ? data : (data?.records || []));
    } catch {}
  }, [authedFetch]);

  const loadDrives = useCallback(async () => {
    try {
      const data = await authedFetch('/api/drives');
      setDrives(Array.isArray(data) ? data : (data?.drives || []));
    } catch {}
  }, [authedFetch]);

  useEffect(() => {
    if (!token) return;
    fetchVehicles();
    loadUsers();
    loadTickets();
    loadTrips();
    loadIssues();
    loadFuelRecords();
    loadDrives();
  }, [token, fetchVehicles, loadUsers, loadTickets, loadTrips, loadIssues, loadFuelRecords, loadDrives]);

  const toggle = (key) => setOpen(o => ({ ...o, [key]: !o[key] }));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, isUnfolded && styles.contentUnfolded]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, isUnfolded && styles.greetingUnfolded]}>{timeGreeting()}, {user?.name?.split(' ')[0] || user?.username}</Text>
            <Text style={styles.role}>Admin dashboard</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <LogOut size={16} color="#c4001a" />
          </TouchableOpacity>
        </View>

        <UpdateBanner />

        <AdminSection
          title="Fleet Management"
          subtitle={`${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'}`}
          icon={<Car size={20} color="#0284c7" />}
          iconBg="#f0f9ff"
          open={open.fleet}
          onToggle={() => toggle('fleet')}
        >
          <FleetSection
            vehicles={vehicles}
            authedFetch={authedFetch}
            onChanged={fetchVehicles}
          />
        </AdminSection>

        <AdminSection
          title="Driver / User Management"
          subtitle={`${users.length} user${users.length === 1 ? '' : 's'}`}
          icon={<Users size={20} color="#7c3aed" />}
          iconBg="#faf5ff"
          open={open.users}
          onToggle={() => toggle('users')}
        >
          <UsersSection
            users={users}
            currentUserId={user?.id}
            authedFetch={authedFetch}
            onChanged={loadUsers}
          />
        </AdminSection>

        <AdminSection
          title="Tickets"
          subtitle={`${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`}
          icon={<ReceiptText size={20} color="#7c3aed" />}
          iconBg="#faf5ff"
          open={open.tickets}
          onToggle={() => toggle('tickets')}
        >
          <TicketsSection
            tickets={tickets}
            vehicles={vehicles}
            users={users}
            currentUser={user}
            token={token}
            authedFetch={authedFetch}
            onChanged={loadTickets}
          />
        </AdminSection>

        <AdminSection
          title="Journeys"
          subtitle={`${trips.length} trip${trips.length === 1 ? '' : 's'}`}
          icon={<Route size={20} color="#018a16" />}
          iconBg="#f0fdf4"
          open={open.trips}
          onToggle={() => toggle('trips')}
        >
          <TripsSection
            trips={trips}
            authedFetch={authedFetch}
            onChanged={loadTrips}
          />
        </AdminSection>

        <AdminSection
          title="Drives"
          subtitle={`${drives.length} drive${drives.length === 1 ? '' : 's'} · ${drives.filter(d => !d.endedAt).length} ongoing`}
          icon={<Clock size={20} color="#0061bd" />}
          iconBg="#eff6ff"
          open={open.drives}
          onToggle={() => toggle('drives')}
        >
          <DrivesSection
            drives={drives}
            vehicles={vehicles}
            users={users}
            authedFetch={authedFetch}
            onChanged={loadDrives}
          />
        </AdminSection>

        <AdminSection
          title="Issues"
          subtitle={`${issues.filter(i => !i.resolved).length} open`}
          icon={<AlertTriangle size={20} color="#dc2626" />}
          iconBg="#fef2f2"
          open={open.issues}
          onToggle={() => toggle('issues')}
        >
          <IssuesSection
            issues={issues}
            vehicles={vehicles}
            token={token}
            authedFetch={authedFetch}
            onChanged={loadIssues}
          />
        </AdminSection>

        <AdminSection
          title="Fuel Records"
          subtitle={`${fuelRecords.length} record${fuelRecords.length === 1 ? '' : 's'}`}
          icon={<Fuel size={20} color="#f97316" />}
          iconBg="#fff7ed"
          open={open.fuel}
          onToggle={() => toggle('fuel')}
        >
          <FuelRecordsSection
            records={fuelRecords}
            vehicles={vehicles}
            users={users}
            token={token}
            onChange={loadFuelRecords}
          />
        </AdminSection>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Collapsible section shell ──────────────────────────────────────────────────
function AdminSection({ title, subtitle, icon, iconBg, open, onToggle, children }) {
  return (
    <View style={adminStyles.section}>
      <TouchableOpacity style={adminStyles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={[adminStyles.sectionIcon, { backgroundColor: iconBg || '#f5f5f5' }]}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={adminStyles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={adminStyles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {open ? <ChevronUp size={20} color="#888" /> : <ChevronDown size={20} color="#888" />}
      </TouchableOpacity>
      {open ? <View style={adminStyles.sectionBody}>{children}</View> : null}
    </View>
  );
}

// ── Inline error banner ────────────────────────────────────────────────────────
function InlineError({ message }) {
  if (!message) return null;
  return (
    <View style={adminStyles.errorBanner}>
      <Text style={adminStyles.errorText}>{message}</Text>
    </View>
  );
}

// ── Confirm helper ─────────────────────────────────────────────────────────────
function confirmDelete(label, onConfirm) {
  Alert.alert('Delete', `Delete ${label}? This cannot be undone.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

// ── Fleet ──────────────────────────────────────────────────────────────────────
function FleetSection({ vehicles, authedFetch, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function handleDelete(v) {
    confirmDelete(`${v.make} ${v.model}`, async () => {
      setBusyId(v.id);
      setError('');
      try {
        await authedFetch(`/api/vehicles/${v.id}`, { method: 'DELETE' });
        await onChanged();
      } catch (e) {
        setError(e.message);
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <>
      <View style={adminStyles.actionRow}>
        <TouchableOpacity style={adminStyles.addBtn} onPress={() => setAdding(true)} activeOpacity={0.8}>
          <Plus size={16} color="#fff" />
          <Text style={adminStyles.addBtnText}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>
      <InlineError message={error} />
      {vehicles.length === 0 ? (
        <Text style={adminStyles.emptyText}>No vehicles yet.</Text>
      ) : (
        vehicles.map(v => {
          const carImage = getCarImage(v.imageId);
          return (
            <View key={v.id} style={adminStyles.row}>
              <TouchableOpacity
                style={adminStyles.rowMain}
                activeOpacity={0.7}
                onPress={() => setEditing(v)}
              >
                <View style={adminStyles.vehicleImage}>
                  {carImage ? (
                    <Image source={carImage} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                  ) : (
                    <Car size={22} color="#888" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={adminStyles.rowTitle}>{v.make} {v.model}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <UKPlate registration={v.licensePlate} small />
                    {v.color ? <Text style={adminStyles.rowMeta}>{v.color}</Text> : null}
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={adminStyles.iconBtn}
                onPress={() => handleDelete(v)}
                disabled={busyId === v.id}
              >
                {busyId === v.id ? <ActivityIndicator size="small" color="#c4001a" /> : <Trash2 size={16} color="#c4001a" />}
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {editing && (
        <VehicleEditModal
          visible
          vehicle={editing}
          authedFetch={authedFetch}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await onChanged(); }}
        />
      )}
      {adding && (
        <VehicleEditModal
          visible
          vehicle={null}
          authedFetch={authedFetch}
          onClose={() => setAdding(false)}
          onSaved={async () => { setAdding(false); await onChanged(); }}
        />
      )}
    </>
  );
}

const vehiclePhotoStyles = StyleSheet.create({
  photoBox: {
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center', gap: 6 },
  photoHint: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  removePhoto: { fontSize: 13, color: '#c4001a', fontWeight: '600', marginBottom: 10 },
});

function VehicleEditModal({ visible, vehicle, authedFetch, onClose, onSaved }) {
  const isNew = !vehicle;
  const [form, setForm] = useState({
    licensePlate: vehicle?.licensePlate || '',
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    year: vehicle?.year ? String(vehicle.year) : '',
    color: vehicle?.color || '',
    capacity: vehicle?.capacity ? String(vehicle.capacity) : '',
    fuelType: vehicle?.fuelType || '',
    insuranceExpiry: vehicle?.insurance?.expiry || '',
    taxExpiry: vehicle?.tax?.expiry || '',
    motExpiry: vehicle?.mot?.expiry || '',
    imageId: vehicle?.imageId || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [looking, setLooking] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Pick/take a vehicle photo, upload it to the PUBLIC vehicle-photos bucket,
  // and store the returned public URL as the vehicle's imageId. Public (not
  // signed) so the map WebView and web can load it by plain URL.
  function pickPhoto() {
    Alert.alert('Vehicle photo', 'Add a photo of the vehicle', [
      { text: 'Take Photo', onPress: () => runPhoto(captureReceiptPhoto) },
      { text: 'Choose from Library', onPress: () => runPhoto(pickReceiptFromLibrary) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function runPhoto(getPhoto) {
    try {
      const dataUri = await getPhoto();
      if (!dataUri) return;
      setUploadingPhoto(true);
      setError('');
      const { url } = await authedFetch('/api/upload-vehicle-photo', {
        method: 'POST',
        body: JSON.stringify({ imageData: dataUri }),
      });
      set('imageId', url);
    } catch (e) {
      setError(e.message || 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  }

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  // Auto-fill make/colour/year/fuel + tax & MOT expiry from the DVLA vehicle
  // enquiry (one call returns tax + MOT status and dates).
  async function lookupPlate() {
    const reg = form.licensePlate.trim();
    if (!reg) { setError('Enter a license plate first.'); return; }
    setLooking(true);
    setError('');
    try {
      const d = await authedFetch('/api/vehicle-lookup', {
        method: 'POST',
        body: JSON.stringify({ registration: reg.replace(/\s/g, '') }),
      });
      setForm(f => ({
        ...f,
        make: d.make || f.make,
        year: d.yearOfManufacture ? String(d.yearOfManufacture) : f.year,
        color: d.colour || f.color,
        fuelType: d.fuelType ? (d.fuelType.charAt(0) + d.fuelType.slice(1).toLowerCase()) : f.fuelType,
        taxExpiry: d.taxDueDate || f.taxExpiry,
        motExpiry: d.motExpiryDate || f.motExpiry,
      }));
    } catch (e) {
      setError(e.message || 'Lookup failed');
    } finally {
      setLooking(false);
    }
  }

  async function handleSave() {
    // Required by the DB (NOT NULL). DVLA fills make but not model, so guide
    // the user to enter it rather than surfacing a raw Supabase error.
    if (!form.licensePlate.trim()) { setError('License plate is required.'); return; }
    if (!form.make.trim()) { setError('Make is required.'); return; }
    if (!form.model.trim()) { setError('Model is required — DVLA doesn’t provide it, so enter it manually.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const body = {
        licensePlate: form.licensePlate.trim(),
        make: form.make.trim(),
        model: form.model.trim(),
        year: form.year ? Number(form.year) : null,
        color: form.color.trim() || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        fuelType: form.fuelType.trim() || null,
        insurance: { ...(vehicle?.insurance || {}), expiry: form.insuranceExpiry.trim() || null },
        tax: { ...(vehicle?.tax || {}), expiry: form.taxExpiry.trim() || null },
        mot: { ...(vehicle?.mot || {}), expiry: form.motExpiry.trim() || null },
        imageId: form.imageId || null,
      };
      if (isNew) {
        await authedFetch('/api/vehicles', { method: 'POST', body: JSON.stringify(body) });
      } else {
        await authedFetch(`/api/vehicles/${vehicle.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      }
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{isNew ? 'Add Vehicle' : 'Edit Vehicle'}</Text>
              <Text style={styles.modalSubtitle}>{vehicle ? `${vehicle.make} ${vehicle.model}` : 'New vehicle'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
            <InlineError message={error} />

            <FormField label="License plate" value={form.licensePlate} onChange={v => set('licensePlate', v)} autoCapitalize="characters" />
            <TouchableOpacity
              style={[adminStyles.lookupBtn, looking && { opacity: 0.6 }]}
              onPress={lookupPlate}
              disabled={looking}
              activeOpacity={0.8}
            >
              {looking ? <ActivityIndicator size="small" color="#0061bd" /> : <Text style={adminStyles.lookupBtnText}>⟳ Auto-fill from DVLA (tax + MOT)</Text>}
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Vehicle photo</Text>
            <TouchableOpacity
              style={vehiclePhotoStyles.photoBox}
              onPress={pickPhoto}
              disabled={uploadingPhoto}
              activeOpacity={0.8}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color="#0061bd" />
              ) : form.imageId ? (
                <Image source={{ uri: form.imageId }} style={vehiclePhotoStyles.photo} resizeMode="cover" />
              ) : (
                <View style={vehiclePhotoStyles.photoPlaceholder}>
                  <Car size={28} color="#9ca3af" />
                  <Text style={vehiclePhotoStyles.photoHint}>Tap to add a photo</Text>
                </View>
              )}
            </TouchableOpacity>
            {form.imageId && !uploadingPhoto && (
              <TouchableOpacity onPress={() => set('imageId', '')} activeOpacity={0.7}>
                <Text style={vehiclePhotoStyles.removePhoto}>Remove photo</Text>
              </TouchableOpacity>
            )}

            <FormField label="Make" value={form.make} onChange={v => set('make', v)} />
            <FormField label="Model" value={form.model} onChange={v => set('model', v)} />
            <FormField label="Year" value={form.year} onChange={v => set('year', v)} keyboardType="number-pad" />
            <FormField label="Color" value={form.color} onChange={v => set('color', v)} />
            <FormField label="Capacity (seats)" value={form.capacity} onChange={v => set('capacity', v)} keyboardType="number-pad" />
            <FormField label="Fuel type" value={form.fuelType} onChange={v => set('fuelType', v)} placeholder="Petrol / Diesel / EV" />
            <DateField label="Insurance expiry" value={form.insuranceExpiry} onChange={v => set('insuranceExpiry', v)} />
            <DateField label="Tax expiry" value={form.taxExpiry} onChange={v => set('taxExpiry', v)} />
            <DateField label="MOT expiry" value={form.motExpiry} onChange={v => set('motExpiry', v)} />

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{isNew ? 'Create Vehicle' : 'Save Changes'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Users ──────────────────────────────────────────────────────────────────────
function UsersSection({ users, currentUserId, authedFetch, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function handleDelete(u) {
    if (u.id === currentUserId) {
      Alert.alert('Cannot delete', 'You cannot delete yourself.');
      return;
    }
    confirmDelete(u.name || u.username, async () => {
      setBusyId(u.id);
      setError('');
      try {
        await authedFetch(`/api/auth/users/${u.id}`, { method: 'DELETE' });
        await onChanged();
      } catch (e) {
        setError(e.message);
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <>
      <View style={adminStyles.actionRow}>
        <TouchableOpacity style={adminStyles.addBtn} onPress={() => setAdding(true)} activeOpacity={0.8}>
          <Plus size={16} color="#fff" />
          <Text style={adminStyles.addBtnText}>Add Driver</Text>
        </TouchableOpacity>
      </View>
      <InlineError message={error} />
      {users.length === 0 ? (
        <Text style={adminStyles.emptyText}>No users yet.</Text>
      ) : (
        users.map(u => (
          <View key={u.id} style={adminStyles.row}>
            <TouchableOpacity style={adminStyles.rowMain} activeOpacity={0.7} onPress={() => setEditing(u)}>
              <View style={[adminStyles.avatar, { backgroundColor: u.role === 'admin' ? '#fef2f2' : '#f0f9ff' }]}>
                <Text style={[adminStyles.avatarText, { color: u.role === 'admin' ? '#c4001a' : '#0284c7' }]}>
                  {(u.name || u.username || '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={adminStyles.rowTitle}>{u.name || u.username}</Text>
                <Text style={adminStyles.rowMeta}>{u.username} · {u.role}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={adminStyles.iconBtn}
              onPress={() => handleDelete(u)}
              disabled={busyId === u.id}
            >
              {busyId === u.id ? <ActivityIndicator size="small" color="#c4001a" /> : <Trash2 size={16} color="#c4001a" />}
            </TouchableOpacity>
          </View>
        ))
      )}

      {editing && (
        <UserEditModal
          visible
          user={editing}
          authedFetch={authedFetch}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await onChanged(); }}
        />
      )}
      {adding && (
        <UserCreateModal
          visible
          authedFetch={authedFetch}
          onClose={() => setAdding(false)}
          onSaved={async () => { setAdding(false); await onChanged(); }}
        />
      )}
    </>
  );
}

const TAB_OPTIONS = [
  { value: '/', label: 'Home' },
  { value: '/fleet', label: 'Fleet' },
  { value: '/journeys', label: 'Journeys' },
  { value: '/admin', label: 'Admin' },
  { value: '/map', label: 'Map' },
];

function UserEditModal({ visible, user, authedFetch, onClose, onSaved }) {
  const [name, setName] = useState(user.name || '');
  const [role, setRole] = useState(user.role || 'driver');
  const [disabledTabs, setDisabledTabs] = useState(user.disabledTabs || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function toggleTab(value) {
    setDisabledTabs(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  }

  async function handleSave() {
    setSubmitting(true);
    setError('');
    try {
      await authedFetch(`/api/auth/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), role }),
      });
      await authedFetch(`/api/auth/users/${user.id}/tabs`, {
        method: 'PATCH',
        body: JSON.stringify({ disabledTabs }),
      });
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Edit User</Text>
              <Text style={styles.modalSubtitle}>{user.username}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
            <InlineError message={error} />
            <FormField label="Name" value={name} onChange={setName} />

            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.severityRow}>
              {['driver', 'admin'].map(r => {
                const selected = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.severityChip, selected && { backgroundColor: '#f0f9ff', borderColor: '#0284c7' }]}
                    onPress={() => setRole(r)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.severityChipText, selected && { color: '#0284c7', fontWeight: '700' }]}>
                      {r === 'admin' ? 'Admin' : 'Driver'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Tab access</Text>
            <Text style={adminStyles.tabHint}>Tap to disable a tab for this user.</Text>
            {TAB_OPTIONS.map(t => {
              const disabled = disabledTabs.includes(t.value);
              return (
                <TouchableOpacity
                  key={t.value}
                  style={[adminStyles.tabRow, disabled && adminStyles.tabRowDisabled]}
                  onPress={() => toggleTab(t.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[adminStyles.tabRowLabel, disabled && { color: '#c4001a' }]}>{t.label}</Text>
                  <Text style={[adminStyles.tabRowState, disabled && { color: '#c4001a' }]}>
                    {disabled ? 'Disabled' : 'Enabled'}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function UserCreateModal({ visible, authedFetch, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('driver');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim() || !username.trim() || !password.trim()) {
      setError('Name, username, and password are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await authedFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          password,
          role,
        }),
      });
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Add Driver</Text>
              <Text style={styles.modalSubtitle}>New user account</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
            <InlineError message={error} />
            <FormField label="Full name" value={name} onChange={setName} />
            <FormField label="Username" value={username} onChange={setUsername} autoCapitalize="none" />
            <FormField label="Password" value={password} onChange={setPassword} secureTextEntry />

            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.severityRow}>
              {['driver', 'admin'].map(r => {
                const selected = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.severityChip, selected && { backgroundColor: '#f0f9ff', borderColor: '#0284c7' }]}
                    onPress={() => setRole(r)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.severityChipText, selected && { color: '#0284c7', fontWeight: '700' }]}>
                      {r === 'admin' ? 'Admin' : 'Driver'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create User</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Tickets ────────────────────────────────────────────────────────────────────
function TicketsSection({ tickets, vehicles, users, currentUser, token, authedFetch, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function handleDelete(t) {
    confirmDelete(`ticket ${t.reference || t.pcn || t.id}`, async () => {
      setBusyId(t.id);
      setError('');
      try {
        await authedFetch(`/api/tickets/${t.id}`, { method: 'DELETE' });
        await onChanged();
      } catch (e) {
        setError(e.message);
      } finally {
        setBusyId(null);
      }
    });
  }

  function vehicleLabel(t) {
    const id = t.vehicleId || t.vehicle_id;
    if (!id) return 'Unknown vehicle';
    const v = vehicles.find(x => x.id === id);
    return v ? `${v.make} ${v.model}` : id;
  }

  function driverLabel(t) {
    if (t.driverName) return t.driverName;
    const id = t.driverId || t.driver_id;
    if (!id) return 'Unknown';
    const u = users.find(x => x.id === id);
    return u?.name || u?.username || id;
  }

  function ticketAmount(t) {
    const v = t.amount ?? t.outstanding ?? 0;
    return Number(v).toFixed(2);
  }

  function ticketRef(t) {
    return t.reference || t.pcn || t.id;
  }

  return (
    <>
      <View style={adminStyles.actionRow}>
        <TouchableOpacity style={adminStyles.addBtn} onPress={() => setAdding(true)} activeOpacity={0.8}>
          <Plus size={16} color="#fff" />
          <Text style={adminStyles.addBtnText}>Add Ticket</Text>
        </TouchableOpacity>
      </View>
      <InlineError message={error} />
      {tickets.length === 0 ? (
        <Text style={adminStyles.emptyText}>No tickets yet.</Text>
      ) : (
        tickets.map(t => (
          <View key={t.id} style={adminStyles.row}>
            <TouchableOpacity style={adminStyles.rowMain} activeOpacity={0.7} onPress={() => setEditing(t)}>
              <View style={[adminStyles.avatar, { backgroundColor: '#faf5ff' }]}>
                <ReceiptText size={18} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={adminStyles.rowTitle}>{ticketRef(t)} · £{ticketAmount(t)}</Text>
                <Text style={adminStyles.rowMeta}>{vehicleLabel(t)} · {driverLabel(t)} · {t.date || '—'}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={adminStyles.iconBtn}
              onPress={() => handleDelete(t)}
              disabled={busyId === t.id}
            >
              {busyId === t.id ? <ActivityIndicator size="small" color="#c4001a" /> : <Trash2 size={16} color="#c4001a" />}
            </TouchableOpacity>
          </View>
        ))
      )}

      {editing && (
        <TicketEditModal
          visible
          ticket={editing}
          vehicles={vehicles}
          token={token}
          authedFetch={authedFetch}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await onChanged(); }}
        />
      )}
      {adding && (
        <TicketEditModal
          visible
          ticket={null}
          vehicles={vehicles}
          currentUser={currentUser}
          authedFetch={authedFetch}
          onClose={() => setAdding(false)}
          onSaved={async () => { setAdding(false); await onChanged(); }}
        />
      )}
    </>
  );
}

export function TicketEditModal({ visible, ticket, vehicles, drivers = [], currentUser, token, authedFetch, onClose, onSaved, onDeleted }) {
  const isNew = !ticket;
  const isAdmin = currentUser?.role === 'admin';
  const [driverId, setDriverId] = useState(ticket?.driverId || ticket?.driver_id || currentUser?.id || '');
  const [reference, setReference] = useState(ticket?.reference || ticket?.pcn || '');
  const [amount, setAmount] = useState(
    ticket?.amount != null ? String(ticket.amount) :
    ticket?.outstanding != null ? String(ticket.outstanding) : ''
  );
  const [date, setDate] = useState(ticket?.date || new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState(ticket?.reason || ticket?.notes || '');
  const [vehicleId, setVehicleId] = useState(ticket?.vehicleId || ticket?.vehicle_id || vehicles[0]?.id || '');
  const _meta = parseTicketMeta(ticket);
  const [appealing, setAppealing] = useState(_meta.appealing);
  const [appealDeadline, setAppealDeadline] = useState(_meta.appealDeadline);
  const [paymentDeadline, setPaymentDeadline] = useState(_meta.paymentDeadline);
  const [paid, setPaid] = useState(_meta.paid);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!reference.trim()) { setError('Reference required.'); return; }
    const num = parseFloat(amount);
    if (isNaN(num) || num < 0) { setError('Valid amount required.'); return; }

    setSubmitting(true);
    setError('');
    try {
      // Map onto the real Supabase `tickets` columns (see AddTicketModal note).
      const meta = {};
      if (appealing && appealing !== 'undecided') meta.appealing = appealing;
      if (appealDeadline) meta.appeal_deadline = appealDeadline;
      if (paymentDeadline) meta.payment_deadline = paymentDeadline;
      if (_meta.receiptPath) meta.receipt_path = _meta.receiptPath; // keep the attached photo on edit
      const status = paid ? 'Paid' : (appealing === 'yes' ? 'Appealing' : 'Issued');
      const nowIso = new Date().toISOString();
      const common = {
        vehicle_id: vehicleId,
        driver_id: driverId || null,
        pcn: reference.trim(),
        outstanding: num,
        date,
        notes: reason.trim(),
        status,
        action_taken: appealing === 'yes',
        plan_for_contesting: Object.keys(meta).length ? JSON.stringify(meta) : '',
        updated_at: nowIso,
      };
      if (isNew) {
        const body = {
          id: `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          created_at: nowIso,
          ...common,
        };
        await authedFetch('/api/tickets', { method: 'POST', body: JSON.stringify(body) });
      } else {
        await authedFetch(`/api/tickets/${ticket.id}`, { method: 'PATCH', body: JSON.stringify(common) });
      }
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete() {
    if (isNew || !ticket) return;
    confirmDelete(reference || ticket.id, async () => {
      setSubmitting(true);
      setError('');
      try {
        await authedFetch(`/api/tickets/${ticket.id}`, { method: 'DELETE' });
        await (onDeleted ? onDeleted() : onSaved());
      } catch (e) {
        setError(e.message);
      } finally {
        setSubmitting(false);
      }
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{isNew ? 'Add Ticket' : 'Edit Ticket'}</Text>
              <Text style={styles.modalSubtitle}>{isNew ? 'New ticket' : reference || ticket.id}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
            <InlineError message={error} />
            <FormField label="Reference" value={reference} onChange={setReference} autoCapitalize="characters" />
            <FormField label="Amount (£)" value={amount} onChange={setAmount} keyboardType="decimal-pad" />
            <DateField label="Date" value={date} onChange={setDate} clearable={false} />
            <FormField label="Reason" value={reason} onChange={setReason} multiline />

            <Text style={styles.fieldLabel}>Vehicle</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
              {vehicles.map(v => {
                const selected = v.id === vehicleId;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[adminStyles.chip, selected && adminStyles.chipSelected]}
                    onPress={() => setVehicleId(v.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[adminStyles.chipText, selected && adminStyles.chipTextSelected]}>
                      {v.make} {v.model}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {isAdmin && drivers.length > 0 ? (
              <>
                <Text style={styles.fieldLabel}>Driver (who got it)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4, marginBottom: 14 }}>
                  {drivers.map(d => {
                    const selected = d.id === driverId;
                    return (
                      <TouchableOpacity
                        key={d.id}
                        style={[adminStyles.chip, selected && adminStyles.chipSelected]}
                        onPress={() => setDriverId(d.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[adminStyles.chipText, selected && adminStyles.chipTextSelected]}>
                          {d.name || d.username}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Appealing?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {['yes', 'no', 'undecided'].map(opt => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setAppealing(opt)}
                  style={[styles.severityChip, appealing === opt && styles.severityChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.severityChipText, appealing === opt && styles.severityChipTextActive]}>
                    {opt === 'yes' ? 'Yes' : opt === 'no' ? 'No' : 'Undecided'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {appealing !== 'no' ? (
              <DateField label="Appeal deadline" value={appealDeadline} onChange={setAppealDeadline} />
            ) : null}
            {appealing !== 'yes' ? (
              <DateField label="Payment deadline" value={paymentDeadline} onChange={setPaymentDeadline} />
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={styles.fieldLabel}>Paid</Text>
              <Switch value={paid} onValueChange={setPaid} />
            </View>

            {_meta.receiptPath ? <ReceiptViewer path={_meta.receiptPath} token={token} label="Ticket photo" /> : null}

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{isNew ? 'Create Ticket' : 'Save Changes'}</Text>}
            </TouchableOpacity>

            {!isNew ? (
              <TouchableOpacity
                style={[styles.secondaryBtn, submitting && { opacity: 0.6 }]}
                onPress={handleDelete}
                disabled={submitting}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>Delete ticket</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Trips ──────────────────────────────────────────────────────────────────────
function TripsSection({ trips, authedFetch, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function handleDelete(t) {
    confirmDelete(t.name, async () => {
      setBusyId(t.id);
      setError('');
      try {
        await authedFetch(`/api/trips/${t.id}`, { method: 'DELETE' });
        await onChanged();
      } catch (e) {
        setError(e.message);
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <>
      <View style={adminStyles.actionRow}>
        <TouchableOpacity style={adminStyles.addBtn} onPress={() => setAdding(true)} activeOpacity={0.8}>
          <Plus size={16} color="#fff" />
          <Text style={adminStyles.addBtnText}>Add Trip</Text>
        </TouchableOpacity>
      </View>
      <InlineError message={error} />
      {trips.length === 0 ? (
        <Text style={adminStyles.emptyText}>No trips yet.</Text>
      ) : (
        trips.map(t => (
          <View key={t.id} style={adminStyles.row}>
            <TouchableOpacity style={adminStyles.rowMain} activeOpacity={0.7} onPress={() => setEditing(t)}>
              <View style={[adminStyles.avatar, { backgroundColor: '#f0fdf4' }]}>
                <Route size={18} color="#018a16" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={adminStyles.rowTitle}>{t.name}</Text>
                <Text style={adminStyles.rowMeta}>
                  {t.date || 'No date'} · {(t.vehicles || []).length} vehicle{(t.vehicles || []).length === 1 ? '' : 's'}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={adminStyles.iconBtn}
              onPress={() => handleDelete(t)}
              disabled={busyId === t.id}
            >
              {busyId === t.id ? <ActivityIndicator size="small" color="#c4001a" /> : <Trash2 size={16} color="#c4001a" />}
            </TouchableOpacity>
          </View>
        ))
      )}

      {editing && (
        <TripEditModal
          visible
          trip={editing}
          authedFetch={authedFetch}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await onChanged(); }}
        />
      )}
      {adding && (
        <TripEditModal
          visible
          trip={null}
          authedFetch={authedFetch}
          onClose={() => setAdding(false)}
          onSaved={async () => { setAdding(false); await onChanged(); }}
        />
      )}
    </>
  );
}

function TripEditModal({ visible, trip, authedFetch, onClose, onSaved }) {
  const isNew = !trip;
  const [name, setName] = useState(trip?.name || '');
  const [date, setDate] = useState(trip?.date || new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState(trip?.description || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('Name required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const body = { name: name.trim(), date: date.trim() || null, description: description.trim() };
      if (isNew) {
        await authedFetch('/api/trips', { method: 'POST', body: JSON.stringify(body) });
      } else {
        await authedFetch(`/api/trips/${trip.id}`, { method: 'PUT', body: JSON.stringify(body) });
      }
      await onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{isNew ? 'Add Trip' : 'Edit Trip'}</Text>
              <Text style={styles.modalSubtitle}>{isNew ? 'New journey' : trip.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
            <InlineError message={error} />
            <FormField label="Name" value={name} onChange={setName} />
            <DateField label="Date" value={date} onChange={setDate} clearable={false} />
            <FormField label="Description" value={description} onChange={setDescription} multiline />

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{isNew ? 'Create Trip' : 'Save Changes'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Issues ─────────────────────────────────────────────────────────────────────
function IssuesSection({ issues, vehicles, token, authedFetch, onChanged }) {
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [viewing, setViewing] = useState(null);

  function vehicleLabel(id) {
    if (!id) return 'Unknown vehicle';
    const v = vehicles.find(x => x.id === id);
    return v ? `${v.make} ${v.model}` : id;
  }

  async function resolve(issue) {
    setBusyId(issue.id);
    setError('');
    try {
      await authedFetch(`/api/issues/${issue.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ resolved: true }),
      });
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(issue) {
    confirmDelete('issue', async () => {
      setBusyId(issue.id);
      setError('');
      try {
        await authedFetch(`/api/issues/${issue.id}`, { method: 'DELETE' });
        await onChanged();
      } catch (e) {
        setError(e.message);
      } finally {
        setBusyId(null);
      }
    });
  }

  const sorted = [...issues].sort((a, b) => {
    if (!!a.resolved !== !!b.resolved) return a.resolved ? 1 : -1;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  return (
    <>
      <InlineError message={error} />
      {sorted.length === 0 ? (
        <Text style={adminStyles.emptyText}>No issues reported.</Text>
      ) : (
        sorted.map(i => {
          const severityColor =
            i.severity === 'high' ? '#c4001a' :
            i.severity === 'medium' ? '#d97706' : '#018a16';
          const severityBg =
            i.severity === 'high' ? '#fef2f2' :
            i.severity === 'medium' ? '#fffbeb' : '#f0fdf4';
          return (
            <View key={i.id} style={[adminStyles.row, i.resolved && { opacity: 0.55 }]}>
              <TouchableOpacity style={adminStyles.rowMain} activeOpacity={0.7} onPress={() => setViewing(i)}>
                <View style={[adminStyles.avatar, { backgroundColor: severityBg }]}>
                  <AlertTriangle size={18} color={severityColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={adminStyles.rowTitle} numberOfLines={1}>
                    {i.description || 'No description'}
                  </Text>
                  <Text style={adminStyles.rowMeta}>
                    {vehicleLabel(i.vehicleId)} · {i.reportedBy || 'Unknown'} · {(i.severity || 'low').toUpperCase()}
                    {i.resolved ? ' · Resolved' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
              {!i.resolved && (
                <TouchableOpacity
                  style={adminStyles.iconBtn}
                  onPress={() => resolve(i)}
                  disabled={busyId === i.id}
                >
                  {busyId === i.id ? <ActivityIndicator size="small" color="#018a16" /> : <CheckCircle2 size={16} color="#018a16" />}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={adminStyles.iconBtn}
                onPress={() => handleDelete(i)}
                disabled={busyId === i.id}
              >
                <Trash2 size={16} color="#c4001a" />
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {viewing && (
        <IssueViewModal
          visible
          issue={viewing}
          vehicle={vehicles.find(v => v.id === viewing.vehicleId) || null}
          token={token}
          authedFetch={authedFetch}
          onClose={() => setViewing(null)}
          onChanged={async () => { setViewing(null); await onChanged(); }}
        />
      )}
    </>
  );
}

function IssueViewModal({ visible, issue, vehicle, token, authedFetch, onClose, onChanged }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function markResolved() {
    setSubmitting(true);
    setError('');
    try {
      await authedFetch(`/api/issues/${issue.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ resolved: true }),
      });
      await onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>Issue</Text>
            <Text style={styles.modalSubtitle}>
              {vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown vehicle'}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={18} color="#000" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalList}>
          <InlineError message={error} />
          <Text style={styles.fieldLabel}>Reported by</Text>
          <Text style={adminStyles.readonlyValue}>{issue.reportedBy || 'Unknown'}</Text>

          <Text style={styles.fieldLabel}>Severity</Text>
          <Text style={adminStyles.readonlyValue}>{(issue.severity || 'low').toUpperCase()}</Text>

          <Text style={styles.fieldLabel}>Description</Text>
          <Text style={adminStyles.readonlyValue}>{issue.description || '—'}</Text>

          {issue.photoPath ? <ReceiptViewer path={issue.photoPath} token={token} label="Photo" /> : null}

          <Text style={styles.fieldLabel}>Reported at</Text>
          <Text style={adminStyles.readonlyValue}>{issue.createdAt || '—'}</Text>

          <Text style={styles.fieldLabel}>Status</Text>
          <Text style={adminStyles.readonlyValue}>{issue.resolved ? 'Resolved' : 'Open'}</Text>

          {!issue.resolved && (
            <TouchableOpacity
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
              onPress={markResolved}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Mark as Resolved</Text>}
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── Drives section (admin: edit + delete) ─────────────────────────────────────
function DrivesSection({ drives, vehicles, users, authedFetch, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [driverName, setDriverName] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [startedAt, setStartedAt] = useState('');
  const [endedAt, setEndedAt] = useState('');
  const [busy, setBusy] = useState(false);

  function formatDuration(ms) {
    if (ms == null || ms < 0) return '—';
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
  }
  function formatTs(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function openEdit(d) {
    setEditing(d);
    setDriverName(d.driverName || '');
    setVehicleId(d.vehicleId || '');
    setStartedAt(d.startedAt || '');
    setEndedAt(d.endedAt || '');
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      const veh = vehicles.find(v => v.id === vehicleId);
      await authedFetch(`/api/drives/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          driverName: driverName || null,
          vehicleId: vehicleId || null,
          vehicleName: veh ? `${veh.make} ${veh.model}` : (editing.vehicleName || ''),
          startedAt: startedAt || editing.startedAt,
          endedAt: endedAt || null,
        }),
      });
      setEditing(null);
      onChanged?.();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  }

  function remove(d) {
    confirmDelete(`drive (${d.vehicleName || 'vehicle'})`, async () => {
      try {
        await authedFetch(`/api/drives/${d.id}`, { method: 'DELETE' });
        onChanged?.();
      } catch (e) {
        Alert.alert('Error', e.message);
      }
    });
  }

  const sorted = [...drives].sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
  if (sorted.length === 0) return <Text style={adminStyles.emptyText}>No drives recorded.</Text>;

  return (
    <>
      {sorted.slice(0, 100).map(d => (
        <View key={d.id} style={adminStyles.row}>
          <TouchableOpacity style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }} onPress={() => openEdit(d)} activeOpacity={0.7}>
            <View style={[adminStyles.avatar, { backgroundColor: d.endedAt ? '#eff6ff' : '#dcfce7' }]}>
              <Clock size={18} color={d.endedAt ? '#0061bd' : '#018a16'} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={adminStyles.rowTitle}>{d.vehicleName || 'Vehicle'} · {d.driverName || 'Unknown'}</Text>
              <Text style={adminStyles.rowMeta}>
                {formatTs(d.startedAt)} {d.endedAt ? `→ ${formatTs(d.endedAt)} · ${formatDuration(d.durationMs)}` : '· ONGOING'}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => remove(d)} style={{ padding: 8 }}>
            <Trash2 size={16} color="#c4001a" />
          </TouchableOpacity>
        </View>
      ))}

      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditing(null)}>
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Drive</Text>
                <Text style={styles.modalSubtitle}>{editing?.vehicleName || ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditing(null)} style={styles.closeBtn}>
                <X size={18} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
              <FormField label="Driver name" value={driverName} onChange={setDriverName} />
              <Text style={styles.fieldLabel}>Vehicle</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4, marginBottom: 14 }}>
                {vehicles.map(v => {
                  const selected = v.id === vehicleId;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[adminStyles.chip, selected && adminStyles.chipSelected]}
                      onPress={() => setVehicleId(v.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[adminStyles.chipText, selected && adminStyles.chipTextSelected]}>
                        {v.make} {v.model}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <FormField label="Started at (ISO)" value={startedAt} onChange={setStartedAt} placeholder="2026-01-01T10:00:00.000Z" />
              <FormField label="Ended at (ISO, leave blank for ongoing)" value={endedAt} onChange={setEndedAt} placeholder="" />
              <TouchableOpacity
                style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
                onPress={save}
                disabled={busy}
                activeOpacity={0.85}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ── Fuel records (read-only) ───────────────────────────────────────────────────
function FuelRecordsSection({ records, vehicles, users, token, onChange }) {
  const [editing, setEditing] = useState(null); // record being edited
  const [editAmount, setEditAmount] = useState('');
  const [editPaidBy, setEditPaidBy] = useState('');
  const [editUsedCard, setEditUsedCard] = useState(false);
  const [busy, setBusy] = useState(false);

  function vehicleLabel(id) {
    if (!id) return 'Unknown vehicle';
    const v = vehicles.find(x => x.id === id);
    return v ? `${v.make} ${v.model}` : id;
  }
  function driverLabel(r) {
    return r.paidBy || (users.find(u => u.id === r.driverId)?.name) || 'Unknown';
  }

  function openEdit(r) {
    setEditing(r);
    setEditAmount(String(r.amount || ''));
    setEditPaidBy(r.paidBy || '');
    setEditUsedCard(!!r.usedFuelCard);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      const resp = await fetch(`${SERVER_URL}/api/fuel-records/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: Number(editAmount) || 0,
          paidBy: editPaidBy,
          usedFuelCard: editUsedCard,
        }),
      });
      if (!resp.ok) throw new Error('Failed to update');
      setEditing(null);
      onChange?.();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  }

  function remove(r) {
    confirmDelete(`fuel record (£${Number(r.amount).toFixed(2)})`, async () => {
      try {
        const resp = await fetch(`${SERVER_URL}/api/fuel-records/${r.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error('Failed to delete');
        onChange?.();
      } catch (e) {
        Alert.alert('Error', e.message);
      }
    });
  }

  const sorted = [...records].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  if (sorted.length === 0) {
    return <Text style={adminStyles.emptyText}>No fuel records yet.</Text>;
  }

  return (
    <>
      {sorted.slice(0, 50).map(r => (
        <View key={r.id} style={adminStyles.row}>
          <TouchableOpacity style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }} onPress={() => openEdit(r)} activeOpacity={0.7}>
            <View style={[adminStyles.avatar, { backgroundColor: '#fff7ed' }]}>
              <Fuel size={18} color="#f97316" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={adminStyles.rowTitle}>£{Number(r.amount || 0).toFixed(2)} · {vehicleLabel(r.vehicleId)}</Text>
              <Text style={adminStyles.rowMeta}>
                {driverLabel(r)} · {(r.createdAt || '').slice(0, 10)}
                {r.usedFuelCard ? ' · Fuel card' : ''}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => remove(r)} style={{ padding: 8 }}>
            <Trash2 size={16} color="#c4001a" />
          </TouchableOpacity>
        </View>
      ))}

      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Fuel Record</Text>
              <TouchableOpacity onPress={() => setEditing(null)} style={styles.closeBtn}>
                <X size={18} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 18 }}>
              <FormField label="Amount (£)" value={editAmount} onChange={setEditAmount} keyboardType="decimal-pad" />
              <FormField label="Paid by" value={editPaidBy} onChange={setEditPaidBy} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text style={styles.fieldLabel}>Used fuel card</Text>
                <Switch value={editUsedCard} onValueChange={setEditUsedCard} />
              </View>
              {editing?.receiptPath ? <ReceiptViewer path={editing.receiptPath} token={token} label="Receipt" /> : null}
              <TouchableOpacity
                style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
                onPress={save}
                disabled={busy}
                activeOpacity={0.85}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Shared form field ──────────────────────────────────────────────────────────
function FormField({ label, value, onChange, placeholder, keyboardType, autoCapitalize, multiline, secureTextEntry }) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.textInput, multiline && styles.multiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || ''}
        placeholderTextColor="#bbb"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
      />
    </>
  );
}

const adminStyles = StyleSheet.create({
  lookupBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#0061bd', borderRadius: 10,
    paddingVertical: 11, marginTop: -6, marginBottom: 14,
  },
  lookupBtnText: { color: '#0061bd', fontSize: 14, fontWeight: '600' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ebebeb',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  sectionIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#000' },
  sectionSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  sectionBody: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f3f3',
    backgroundColor: '#fafafa',
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#000' },
  rowMeta: { fontSize: 12, color: '#888', marginTop: 2 },

  vehicleImage: {
    width: 60, height: 40,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f5f5f5', borderRadius: 8,
    overflow: 'hidden',
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  iconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ebebeb',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 6,
  },

  emptyText: { textAlign: 'center', color: '#999', paddingVertical: 16, fontSize: 13 },

  errorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  errorText: { color: '#c4001a', fontSize: 12, fontWeight: '500' },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ebebeb',
    marginRight: 8,
  },
  chipSelected: { backgroundColor: '#000', borderColor: '#000' },
  chipText: { color: '#222', fontSize: 13, fontWeight: '500' },
  chipTextSelected: { color: '#fff', fontWeight: '700' },

  tabHint: { fontSize: 12, color: '#888', marginTop: -4, marginBottom: 8 },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  tabRowDisabled: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  tabRowLabel: { fontSize: 14, color: '#222', fontWeight: '500' },
  tabRowState: { fontSize: 12, color: '#888', fontWeight: '600' },

  readonlyValue: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#000',
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
});

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
  // Bottom-sheet modals (Set Destination, Edit Fuel Record)
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#f5f5f5',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingBottom: 28, maxHeight: '88%',
  },
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

  // Modal form fields
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: 14, marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#000',
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  multiline: { minHeight: 60, textAlignVertical: 'top' },
  multilineTall: { minHeight: 120, textAlignVertical: 'top' },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  currency: { fontSize: 22, color: '#888', marginRight: 8, fontWeight: '500' },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#000' },
  toggleHint: { fontSize: 11, color: '#888', marginTop: 2 },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: '#000',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryBtn: {
    marginTop: 12, paddingVertical: 15, alignItems: 'center',
    borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6e6e6',
  },
  secondaryBtnText: { color: '#c4001a', fontSize: 15, fontWeight: '600' },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  dropdownText: { fontSize: 15, color: '#000', fontWeight: '500' },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#ebebeb',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  dropdownItemText: { fontSize: 15, color: '#000' },
  dropdownCheck: { fontSize: 16, color: '#018a16', fontWeight: '700' },
  dropdownEmpty: { padding: 14, textAlign: 'center', color: '#999' },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  severityChipText: { fontSize: 14, fontWeight: '500', color: '#555' },
});
