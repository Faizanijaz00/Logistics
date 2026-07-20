import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Navigation, LogOut, Clock, MapPin, Crosshair, Search, Calendar, Car, Check, Sparkles } from 'lucide-react-native';
import { useAuthStore } from '../src/store/authStore';
import { SERVER_URL } from '../src/config/api';
import AddressAutocomplete from '../src/components/AddressAutocomplete';
import { reverseGeocode } from '../src/lib/geocode';
import { getRouteEstimate } from '../src/lib/directions';

const STATUS_COLORS = {
  pending: { bg: '#fef9c3', fg: '#854d0e' },
  accepted: { bg: '#dbeafe', fg: '#1e40af' },
  in_progress: { bg: '#e0e7ff', fg: '#3730a3' },
  completed: { bg: '#dcfce7', fg: '#166534' },
  cancelled: { bg: '#fee2e2', fg: '#991b1b' },
};

function fmtWhen(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function shortTime(d) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function seatsFor(v) {
  const s = `${v.make} ${v.model}`.toLowerCase();
  if (s.includes('v class') || s.includes('van') || s.includes('vito')) return 7;
  return 4;
}

export default function RiderScreen() {
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  const logout = useAuthStore(s => s.logout);

  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [scheduledFor, setScheduledFor] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rides, setRides] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [choice, setChoice] = useState('flexible'); // 'flexible' | vehicle id

  const loadRides = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/rides`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRides(await res.json());
    } catch {}
    setRefreshing(false);
  }, [token]);

  const loadVehicles = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/vehicles`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setVehicles(await res.json());
    } catch {}
  }, [token]);

  useFocusEffect(useCallback(() => { loadRides(); loadVehicles(); }, [loadRides, loadVehicles]));

  // Auto-capture the rider's current location as the pickup on first load.
  useEffect(() => { if (!pickup) useMyLocation(); }, []);

  useEffect(() => {
    if (pickup?.lat == null || destination?.lat == null) { setEstimate(null); return; }
    let alive = true;
    getRouteEstimate(pickup, destination).then(e => { if (alive) setEstimate(e); });
    return () => { alive = false; };
  }, [pickup?.lat, pickup?.lng, destination?.lat, destination?.lng]);

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const Location = await import('expo-location');
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') status = (await Location.requestForegroundPermissionsAsync()).status;
      if (status !== 'granted') { Alert.alert('Location off', 'Enable location to use your current position.'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      const addr = await reverseGeocode(latitude, longitude);
      setPickup({ address: addr || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, lat: latitude, lng: longitude });
    } catch {
      Alert.alert('Error', 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  const chosenVehicle = choice === 'flexible' ? null : vehicles.find(v => v.id === choice);
  const arrival = estimate ? new Date((scheduledFor ? scheduledFor.getTime() : Date.now()) + estimate.durationMin * 60000) : null;

  const book = async () => {
    if (!destination?.address) { Alert.alert('Add a destination', 'Where do you want to go?'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          rider_name: user?.name,
          pickup_address: pickup?.address || null,
          pickup_lat: pickup?.lat ?? null,
          pickup_lng: pickup?.lng ?? null,
          destination_address: destination.address,
          destination_lat: destination.lat ?? null,
          destination_lng: destination.lng ?? null,
          scheduled_for: scheduledFor ? scheduledFor.toISOString() : null,
          est_duration_min: estimate?.durationMin ?? null,
          est_distance_km: estimate ? Math.round(estimate.distanceKm * 10) / 10 : null,
          vehicle_preference: choice,
          vehicle_preference_name: chosenVehicle ? `${chosenVehicle.make} ${chosenVehicle.model}` : 'Flexible',
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Request failed (${res.status})`); }
      setDestination(null); setScheduledFor(null); setChoice('flexible');
      Alert.alert('Ride requested', 'Nearby drivers have been notified.');
      loadRides();
    } catch (e) {
      Alert.alert('Could not request ride', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const canBook = destination && !submitting;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hi}>Hi {user?.name || 'there'}</Text>
          <Text style={styles.sub}>Where to?</Text>
        </View>
        <TouchableOpacity onPress={logout} hitSlop={10} style={styles.logout}><LogOut size={20} color="#c4001a" /></TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRides(); }} />}
      >
        {/* Hero "Where to?" search + Later */}
        <AddressAutocomplete
          big
          leftIcon={Search}
          placeholder="Where to?"
          value={destination?.address || ''}
          onSelect={setDestination}
          rightAccessory={(
            <TouchableOpacity style={styles.laterBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
              <Calendar size={15} color="#000" />
              <Text style={styles.laterText}>{scheduledFor ? shortTime(scheduledFor) : 'Later'}</Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.card}>
          <View style={styles.pickupRow}>
            <MapPin size={18} color="#018a16" />
            <View style={{ flex: 1 }}>
              <Text style={styles.pickupLabel}>Pickup</Text>
              <Text style={styles.pickupValue} numberOfLines={1}>
                {pickup?.address || (locating ? 'Getting your location…' : 'Location unavailable')}
              </Text>
            </View>
            <TouchableOpacity onPress={useMyLocation} hitSlop={8} disabled={locating}>
              {locating ? <ActivityIndicator size="small" color="#0061bd" /> : <Crosshair size={18} color="#0061bd" />}
            </TouchableOpacity>
          </View>

          {showPicker && (
            <DateTimePicker
              value={scheduledFor || new Date()}
              mode="datetime"
              minimumDate={new Date()}
              onChange={(e, d) => {
                setShowPicker(Platform.OS === 'ios');
                if (e.type === 'set' && d) setScheduledFor(d);
                if (e.type === 'dismissed') setShowPicker(false);
              }}
            />
          )}
          {scheduledFor && (
            <TouchableOpacity onPress={() => setScheduledFor(null)}>
              <Text style={styles.clearLater}>Scheduled for {fmtWhen(scheduledFor.toISOString())} · tap to clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Trip estimate */}
        {estimate && (
          <View style={styles.estimate}>
            <Clock size={16} color="#0061bd" />
            <Text style={styles.estimateText}>
              {estimate.durationMin} min · {estimate.distanceKm.toFixed(1)} km{arrival ? ` · arrive ~${shortTime(arrival)}` : ''}
            </Text>
          </View>
        )}

        {/* Choose a ride */}
        {destination && (
          <>
            <Text style={styles.section}>Choose a ride</Text>
            <TouchableOpacity style={[styles.rideOpt, choice === 'flexible' && styles.rideOptActive]} onPress={() => setChoice('flexible')} activeOpacity={0.8}>
              <View style={[styles.optIcon, { backgroundColor: '#eef2ff' }]}><Sparkles size={22} color="#3730a3" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optTitle}>Flexible</Text>
                <Text style={styles.optSub}>Any available car · usually fastest</Text>
              </View>
              {choice === 'flexible' && <Check size={20} color="#000" />}
            </TouchableOpacity>

            {vehicles.map(v => {
              const active = choice === v.id;
              return (
                <TouchableOpacity key={v.id} style={[styles.rideOpt, active && styles.rideOptActive]} onPress={() => setChoice(v.id)} activeOpacity={0.8}>
                  <View style={[styles.optIcon, { backgroundColor: '#f1f5f9' }]}><Car size={22} color="#334155" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optTitle}>{v.make} {v.model}</Text>
                    <Text style={styles.optSub}>{seatsFor(v)} seats{v.licensePlate ? ` · ${v.licensePlate}` : ''}</Text>
                  </View>
                  {active && <Check size={20} color="#000" />}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <TouchableOpacity style={[styles.book, !canBook && styles.bookDisabled, { marginTop: 20 }]} disabled={!canBook} onPress={book}>
          {submitting ? <ActivityIndicator color="#fff" /> : (<><Navigation size={18} color="#fff" /><Text style={styles.bookText}>Request ride</Text></>)}
        </TouchableOpacity>

        <Text style={[styles.section, { marginTop: 28 }]}>Your rides</Text>
        {rides.length === 0 ? (
          <Text style={styles.empty}>No rides yet. Book one above.</Text>
        ) : rides.map(r => {
          const c = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
          return (
            <View key={r.id} style={styles.ride}>
              <View style={styles.rideTop}>
                <View style={[styles.badge, { backgroundColor: c.bg }]}><Text style={[styles.badgeText, { color: c.fg }]}>{r.status}</Text></View>
                <Text style={styles.when}>{fmtWhen(r.created_at)}</Text>
              </View>
              {r.pickup_address ? <View style={styles.line}><MapPin size={13} color="#018a16" /><Text style={styles.lineText} numberOfLines={1}>{r.pickup_address}</Text></View> : null}
              <View style={styles.line}><MapPin size={13} color="#c4001a" /><Text style={styles.lineText} numberOfLines={1}>{r.destination_address}</Text></View>
              <View style={styles.rideMeta}>
                {r.vehicle_preference_name ? <Text style={styles.metaChip}>{r.vehicle_preference_name}</Text> : null}
                {r.est_duration_min ? <Text style={styles.metaChip}>{r.est_duration_min} min</Text> : null}
              </View>
              {r.assigned_driver ? <Text style={styles.driver}>Driver: {r.assigned_driver}</Text> : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ececec' },
  hi: { fontSize: 22, fontWeight: '700', color: '#000' },
  sub: { fontSize: 14, color: '#888', marginTop: 2 },
  logout: { padding: 6 },
  body: { padding: 16, paddingBottom: 48 },
  laterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  laterText: { fontSize: 14, fontWeight: '600', color: '#000' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#ececec', marginTop: 14 },
  pickupRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pickupLabel: { fontSize: 12, color: '#888', fontWeight: '600' },
  pickupValue: { fontSize: 15, color: '#000', fontWeight: '600', marginTop: 1 },
  clearLater: { color: '#888', fontSize: 12, marginTop: 10 },
  estimate: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#eef4ff', borderRadius: 12, padding: 12, marginTop: 14 },
  estimateText: { fontSize: 14, color: '#1e40af', fontWeight: '600' },
  section: { fontSize: 16, fontWeight: '700', color: '#000', marginTop: 20, marginBottom: 10 },
  rideOpt: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#ececec', marginBottom: 10 },
  rideOptActive: { borderColor: '#000' },
  optIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  optSub: { fontSize: 13, color: '#888', marginTop: 2 },
  label: { fontSize: 13, fontWeight: '500', color: '#626669', marginBottom: 6 },
  notes: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 12, fontSize: 15, color: '#000', minHeight: 56, textAlignVertical: 'top' },
  book: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#000', borderRadius: 14, paddingVertical: 16, marginTop: 16 },
  bookDisabled: { opacity: 0.35 },
  bookText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  empty: { fontSize: 14, color: '#888' },
  ride: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#ececec', marginBottom: 10 },
  rideTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  when: { fontSize: 12, color: '#999' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  lineText: { flex: 1, fontSize: 14, color: '#333' },
  rideMeta: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  metaChip: { fontSize: 12, color: '#475569', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  driver: { fontSize: 13, color: '#1e40af', fontWeight: '600', marginTop: 8 },
});
