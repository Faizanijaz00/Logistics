import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, ActivityIndicator, Alert, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronDown, ChevronUp, User, MapPin, Check, X } from 'lucide-react-native';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { useAuthStore } from '../../src/store/authStore';
import { getCarImage } from '../../src/config/carImages';
import { SERVER_URL } from '../../src/config/api';
import { useLayout } from '../../src/hooks/useLayout';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

function useReverseGeocode(position) {
  const [address, setAddress] = useState(null);
  useEffect(() => {
    if (!position?.lat || !position?.lng) return;
    // Mapbox reverse geocoding — lng,lat order. Prefer a short label (postcode/neighbourhood).
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${position.lng},${position.lat}.json?types=postcode,neighborhood,address&limit=1&access_token=${MAPBOX_TOKEN}`)
      .then(r => r.json())
      .then(data => {
        const short = data.features?.[0]?.place_name;
        if (short) setAddress(short);
      })
      .catch(() => {});
  }, [position?.lat, position?.lng]);
  return address;
}

function getExpiryStatus(dateStr) {
  if (!dateStr) return null;
  const expiry = new Date(dateStr);
  if (isNaN(expiry.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { color: '#c4001a', bg: '#fef2f2', border: '#fecaca', label: 'Expired' };
  if (daysLeft <= 20) return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Due soon' };
  return { color: '#018a16', bg: '#f0fdf4', border: '#bbf7d0', label: 'Valid' };
}

function StatusCard({ title, status, sub }) {
  return (
    <View style={[styles.statusCard, { backgroundColor: status.bg, borderColor: status.border }]}>
      <Text style={styles.statusCardTitle}>{title}</Text>
      <Text style={[styles.statusCardValue, { color: status.color }]}>{status.label}</Text>
      {sub ? <Text style={styles.statusCardSub}>{sub}</Text> : null}
    </View>
  );
}

function InfoCardContent({ vehicle, editing, plate, setPlate, handleSavePlate, saving, setEditing, showMoreInfo, setShowMoreInfo, motStatus, taxStatus, insStatus, serviceStatus, tflStatus, tflRegistered, formatDate, locationAddress }) {
  return (
    <>
      {/* Year / Color / Fuel */}
      <View style={styles.metaRow}>
        {vehicle.year ? <Text style={styles.metaText}>{vehicle.year}</Text> : null}
        {vehicle.year && vehicle.color ? <Text style={styles.metaDot}>·</Text> : null}
        {vehicle.color ? <Text style={styles.metaText}>{vehicle.color}</Text> : null}
        {vehicle.color && vehicle.fuelType ? <Text style={styles.metaDot}>·</Text> : null}
        {vehicle.fuelType ? <Text style={styles.metaText}>{vehicle.fuelType}</Text> : null}
      </View>

      {/* Plate edit row (admin only) */}
      {editing && (
        <View style={[styles.plateEditRow, { marginBottom: 16 }]}>
          <TextInput
            style={styles.plateInput}
            value={plate}
            onChangeText={t => setPlate(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="e.g. AB12 CDE"
            placeholderTextColor="#bbb"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSavePlate} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Check size={18} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => { setEditing(false); setPlate(vehicle.licensePlate); }}
          >
            <X size={18} color="#c4001a" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.divider} />

      {/* Status (Driver/Parked) — appears ABOVE Location */}
      <View style={styles.statusStack}>
        {vehicle.currentDriver ? (
          <View style={styles.statusItem}>
            <View style={[styles.statusIcon, { backgroundColor: '#018a16' }]}>
              <User size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusLabel}>Driver</Text>
              <Text style={styles.statusValue}>{vehicle.currentDriver}</Text>
              <View style={styles.statusIndicator}>
                <View style={[styles.dot, { backgroundColor: '#018a16' }]} />
                <Text style={[styles.statusIndicatorText, { color: '#018a16' }]}>Active</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.statusItem}>
            <View style={[styles.statusIcon, { backgroundColor: '#888' }]}>
              <User size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={styles.statusValue}>Parked</Text>
              {vehicle.lastDriver ? (
                <View style={styles.statusIndicator}>
                  <View style={[styles.dot, { backgroundColor: '#888' }]} />
                  <Text style={[styles.statusIndicatorText, { color: '#888' }]}>
                    Parked by {vehicle.lastDriver}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Location — clickable, opens native Maps with directions */}
        <TouchableOpacity
          style={styles.statusItem}
          activeOpacity={vehicle.position?.lat ? 0.6 : 1}
          onPress={() => {
            const lat = vehicle.position?.lat;
            const lng = vehicle.position?.lng;
            if (lat == null || lng == null) return;
            const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
            Linking.openURL(url).catch(() => {});
          }}
        >
          <View style={[styles.statusIcon, { backgroundColor: (vehicle.destination || vehicle.parkedAt) ? '#3B82F6' : '#e5e5e5' }]}>
            <MapPin size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>Location</Text>
            <Text style={[styles.statusValue, vehicle.position?.lat && styles.statusValueLink]} numberOfLines={1}>
              {vehicle.position?.lat != null && vehicle.position?.lng != null
                ? `${vehicle.position.lat.toFixed(6)}, ${vehicle.position.lng.toFixed(6)}`
                : 'Unknown'}
            </Text>
            {vehicle.destination ? (
              <View style={styles.statusIndicator}>
                <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.statusIndicatorText, { color: '#3B82F6' }]}>En route</Text>
              </View>
            ) : vehicle.position?.lat ? (
              <View style={styles.statusIndicator}>
                <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.statusIndicatorText, { color: '#3B82F6' }]}>Tap to get directions</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* More Information toggle */}
      <TouchableOpacity style={styles.moreInfoBtn} onPress={() => setShowMoreInfo(v => !v)} activeOpacity={0.7}>
        <Text style={styles.moreInfoText}>More Information</Text>
        {showMoreInfo ? <ChevronUp size={18} color="#555" /> : <ChevronDown size={18} color="#555" />}
      </TouchableOpacity>

      {showMoreInfo && (
        <View style={styles.moreInfoGrid}>
          <StatusCard
            title="MOT"
            status={motStatus}
            sub={vehicle.mot?.expiryDate ? `Expires ${formatDate(vehicle.mot.expiryDate)}` : null}
          />
          <StatusCard
            title="Road Tax"
            status={taxStatus}
            sub={vehicle.tax?.expiryDate ? `Due ${formatDate(vehicle.tax.expiryDate)}` : null}
          />
          <StatusCard
            title="Insurance"
            status={insStatus}
            sub={vehicle.insurance?.expiryDate ? `Expires ${formatDate(vehicle.insurance.expiryDate)}` : vehicle.insurance?.provider || null}
          />
          <StatusCard
            title="Service"
            status={serviceStatus}
            sub={vehicle.maintenance?.nextService ? `Next ${formatDate(vehicle.maintenance.nextService)}` : (vehicle.maintenance?.lastService ? `Last ${formatDate(vehicle.maintenance.lastService)}` : null)}
          />
          <StatusCard
            title="Auto Pay"
            status={tflStatus}
            sub={tflRegistered && vehicle.tfl?.accountName ? vehicle.tfl.accountName : null}
          />
        </View>
      )}
    </>
  );
}

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { vehicles, fetchVehicles } = useVehicleStore();
  const { token, user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const { isUnfolded } = useLayout();

  const vehicle = vehicles.find(v => v.id === id);
  const locationAddress = useReverseGeocode(vehicle?.position);
  const [editing, setEditing] = useState(false);
  const [plate, setPlate] = useState(vehicle?.licensePlate || '');
  const [saving, setSaving] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  if (!vehicle) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.errorText}>Vehicle not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const carImage = getCarImage(vehicle.imageId);

  const handleSavePlate = async () => {
    if (!plate.trim()) return;
    setSaving(true);
    try {
      const resp = await fetch(`${SERVER_URL}/api/vehicles/${vehicle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ licensePlate: plate.trim().toUpperCase() }),
      });
      if (!resp.ok) throw new Error('Failed to save');
      await fetchVehicles();
      setEditing(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Expiry status helpers
  const motStatus = getExpiryStatus(vehicle.mot?.expiryDate) || {
    color: vehicle.mot?.status?.toLowerCase() === 'valid' ? '#018a16' : '#888',
    bg: vehicle.mot?.status?.toLowerCase() === 'valid' ? '#f0fdf4' : '#f8f8f8',
    border: vehicle.mot?.status?.toLowerCase() === 'valid' ? '#bbf7d0' : '#e5e5e5',
    label: vehicle.mot?.status || 'Unknown',
  };
  const taxStatus = getExpiryStatus(vehicle.tax?.expiryDate) || {
    color: ['paid', 'taxed'].includes(vehicle.tax?.status?.toLowerCase()) ? '#018a16' : '#c4001a',
    bg: ['paid', 'taxed'].includes(vehicle.tax?.status?.toLowerCase()) ? '#f0fdf4' : '#fef2f2',
    border: ['paid', 'taxed'].includes(vehicle.tax?.status?.toLowerCase()) ? '#bbf7d0' : '#fecaca',
    label: vehicle.tax?.status || 'Unknown',
  };
  const insStatus = getExpiryStatus(vehicle.insurance?.expiryDate) || {
    color: '#018a16', bg: '#f0fdf4', border: '#bbf7d0', label: 'Valid',
  };
  const nextService = vehicle.maintenance?.nextService;
  const serviceOverdue = nextService && new Date(nextService) < new Date();
  const serviceStatus = {
    color: serviceOverdue ? '#c4001a' : (nextService ? '#018a16' : '#888'),
    bg: serviceOverdue ? '#fef2f2' : (nextService ? '#f0fdf4' : '#f8f8f8'),
    border: serviceOverdue ? '#fecaca' : (nextService ? '#bbf7d0' : '#e5e5e5'),
    label: serviceOverdue ? 'Overdue' : (nextService ? 'Scheduled' : 'Not Set'),
  };
  const tflRegistered = !!vehicle.tfl?.registeredForAutoPay;
  const tflStatus = {
    color: tflRegistered ? '#018a16' : '#c4001a',
    bg: tflRegistered ? '#f0fdf4' : '#fef2f2',
    border: tflRegistered ? '#bbf7d0' : '#fecaca',
    label: tflRegistered ? 'Registered' : 'Not Registered',
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  const infoCardProps = {
    vehicle, editing, plate, setPlate, handleSavePlate, saving, setEditing,
    showMoreInfo, setShowMoreInfo, motStatus, taxStatus, insStatus,
    serviceStatus, tflStatus, tflRegistered, formatDate, locationAddress,
  };

  // ── Unfolded: side-by-side layout ──
  if (isUnfolded) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Back button */}
        <View style={styles.unfoldedBackRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color="#000" />
            <Text style={styles.backText}>Fleet</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.unfoldedContainer}>
          {/* Left column: car hero */}
          <View style={styles.unfoldedHeroCol}>
            <Text style={styles.heroVehicleNameUnfolded}>{vehicle.make} {vehicle.model}</Text>

            {vehicle.licensePlate ? (
              <View style={styles.plateAbove}>
                <View style={styles.ukPlateSmall}>
                  <View style={styles.gbStripSmall}>
                    <Text style={styles.gbFlagSmall}>🇬🇧</Text>
                    <Text style={styles.gbTextSmall}>GB</Text>
                  </View>
                  <Text style={styles.plateTextSmall}>{vehicle.licensePlate}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.carWrapperUnfolded}>
              {carImage ? (
                <Image
                  source={carImage}
                  style={styles.carImageUnfolded}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.carFallbackUnfolded} />
              )}
            </View>
            <View style={styles.groundShadowUnfolded} />
          </View>

          {/* Right column: scrollable info */}
          <ScrollView
            style={styles.unfoldedInfoCol}
            contentContainerStyle={{ paddingBottom: 48 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.infoCardUnfolded}>
              <InfoCardContent {...infoCardProps} />
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // ── Phone layout (unchanged) ──
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* Fixed hero — stays on screen while info scrolls */}
      <View style={styles.heroSection}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color="#000" />
          <Text style={styles.backText}>Fleet</Text>
        </TouchableOpacity>

        <Text style={styles.heroVehicleName}>{vehicle.make} {vehicle.model}</Text>

        {vehicle.licensePlate ? (
          <View style={styles.plateAbove}>
            <View style={styles.ukPlateSmall}>
              <View style={styles.gbStripSmall}>
                <Text style={styles.gbFlagSmall}>🇬🇧</Text>
                <Text style={styles.gbTextSmall}>GB</Text>
              </View>
              <Text style={styles.plateTextSmall}>{vehicle.licensePlate}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.carWrapper}>
          {carImage ? (
            <Image
              source={carImage}
              style={styles.carImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.carFallback} />
          )}
        </View>
        {/* Ground shadow ellipse */}
        <View style={styles.groundShadow} />
      </View>

      {/* Scrollable info card */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info card */}
        <View style={styles.infoCard}>
          <InfoCardContent {...infoCardProps} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#EEEFF2' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: '#888' },

  scrollView: {
    flex: 1,
  },

  plateAbove: {
    alignItems: 'center',
    marginBottom: 0,
  },
  ukPlateSmall: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#1a1a1a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gbStripSmall: {
    backgroundColor: '#003399',
    paddingHorizontal: 5,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gbFlagSmall: { fontSize: 9, lineHeight: 10 },
  gbTextSmall: { fontSize: 6, color: '#fff', fontWeight: '800', letterSpacing: 0.3 },
  plateTextSmall: {
    backgroundColor: '#fff',
    color: '#000',
    paddingHorizontal: 12,
    paddingVertical: 3,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    alignSelf: 'center',
  },

  /* Hero — fixed, does not scroll */
  heroSection: {
    backgroundColor: '#EEEFF2',
    paddingTop: 16,
    paddingBottom: 0,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 0,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginLeft: 2,
  },
  heroVehicleName: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  carWrapper: {
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: -40,
  },
  carImage: {
    width: '100%',
    height: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
  },
  carFallback: {
    width: '100%',
    height: 240,
  },
  groundShadow: {
    alignSelf: 'center',
    width: 280,
    height: 10,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.10)',
    marginTop: -2,
  },

  /* Info card */
  infoCard: {
    backgroundColor: '#fff',
    marginTop: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 8,
    // iOS shadow on card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
    minHeight: 400,
  },

  vehicleName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 6,
  },
  metaText: { fontSize: 14, color: '#777' },
  metaDot: { fontSize: 14, color: '#ccc' },

  /* UK Plate */
  plateSection: { marginBottom: 20 },
  ukPlate: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderWidth: 2.5,
    borderColor: '#1a1a1a',
    borderRadius: 5,
    overflow: 'hidden',
  },
  gbStrip: {
    backgroundColor: '#003399',
    paddingHorizontal: 7,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  gbFlag: { fontSize: 13, lineHeight: 14 },
  gbText: { fontSize: 8, color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
  plateTextBox: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  plateText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 3,
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  plateEditRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  plateInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 6,
    padding: 10,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  saveBtn: { backgroundColor: '#000', borderRadius: 6, padding: 10 },
  cancelBtn: { padding: 10 },

  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 18,
  },

  /* Driver + Location */
  statusRow: {
    flexDirection: 'row',
    gap: 20,
  },
  statusStack: {
    flexDirection: 'column',
    gap: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  statusValueLink: {
    color: '#0284c7',
    textDecorationLine: 'underline',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusIndicatorText: { fontSize: 11, fontWeight: '500' },

  /* More Information */
  moreInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  moreInfoText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  moreInfoGrid: {
    marginTop: 14,
    gap: 10,
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  statusCardTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statusCardValue: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  statusCardSub: {
    fontSize: 12,
    color: '#888',
  },

  /* ── Unfolded layout ── */
  unfoldedBackRow: {
    paddingTop: 16,
    paddingBottom: 4,
    backgroundColor: '#EEEFF2',
  },
  unfoldedContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  unfoldedHeroCol: {
    width: '42%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#EEEFF2',
  },
  heroVehicleNameUnfolded: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  carWrapperUnfolded: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: -20,
  },
  carImageUnfolded: {
    width: 280,
    height: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
  },
  carFallbackUnfolded: {
    width: 260,
    height: 180,
  },
  groundShadowUnfolded: {
    width: 200,
    height: 8,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.10)',
    marginTop: -2,
  },
  unfoldedInfoCol: {
    flex: 1,
  },
  infoCardUnfolded: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 8,
    minHeight: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
});
