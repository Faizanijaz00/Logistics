import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions,
  ActivityIndicator, Alert, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Navigation, LogOut, Clock, MapPin, Crosshair, Search, Calendar, Car, Check, Sparkles, Sun, Moon } from 'lucide-react-native';
import { useAuthStore } from '../src/store/authStore';
import { useTheme, useThemeStore } from '../src/store/themeStore';
import { SERVER_URL } from '../src/config/api';
import AddressAutocomplete from '../src/components/AddressAutocomplete';
import { reverseGeocode } from '../src/lib/geocode';
import { getRouteEstimate } from '../src/lib/directions';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const SCREEN_W = Math.round(Dimensions.get('window').width);

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
function shortTime(d) { return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
function seatsFor(v) {
  const s = `${v.make} ${v.model}`.toLowerCase();
  if (s.includes('v class') || s.includes('van') || s.includes('vito')) return 7;
  return 4;
}
function splitAddr(a) {
  const parts = (a || '').split(',');
  return { primary: parts[0]?.trim() || a, secondary: parts.slice(1).join(',').trim() };
}

export default function RiderScreen() {
  const user = useAuthStore(s => s.user);
  const token = useAuthStore(s => s.token);
  const logout = useAuthStore(s => s.logout);
  const t = useTheme();
  const toggleTheme = useThemeStore(s => s.toggle);

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
  const [choice, setChoice] = useState('flexible');

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

  // Recent destinations become "recommended" places.
  const recents = useMemo(() => {
    const seen = new Set(); const out = [];
    for (const r of rides) {
      if (!r.destination_address || seen.has(r.destination_address)) continue;
      seen.add(r.destination_address);
      out.push({ address: r.destination_address, lat: r.destination_lat, lng: r.destination_lng });
      if (out.length >= 5) break;
    }
    return out;
  }, [rides]);

  const chosenVehicle = choice === 'flexible' ? null : vehicles.find(v => v.id === choice);
  const arrival = estimate ? new Date((scheduledFor ? scheduledFor.getTime() : Date.now()) + estimate.durationMin * 60000) : null;
  const mapUrl = pickup && MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/mapbox/${t.mapStyle}/static/pin-s+3b82f6(${pickup.lng},${pickup.lat})/${pickup.lng},${pickup.lat},13.5,0/${SCREEN_W}x240@2x?access_token=${MAPBOX_TOKEN}`
    : null;

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
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      {/* Top bar over the map */}
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.hi, { color: t.text }]}>Hi {user?.name || 'there'}</Text>
          <Text style={[styles.sub, { color: t.subtext }]}>Choose your ride</Text>
        </View>
        <View style={styles.topBtns}>
          <TouchableOpacity onPress={toggleTheme} hitSlop={8} style={[styles.iconBtn, { backgroundColor: t.inputBg }]}>
            {t.mode === 'dark' ? <Sun size={18} color={t.text} /> : <Moon size={18} color={t.text} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} hitSlop={8} style={[styles.iconBtn, { backgroundColor: t.inputBg }]}>
            <LogOut size={18} color="#c4001a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRides(); }} />}
      >
        {/* Map header */}
        <View style={styles.mapWrap}>
          {mapUrl ? (
            <Image source={{ uri: mapUrl }} style={styles.map} resizeMode="cover" />
          ) : (
            <View style={[styles.map, styles.mapPlaceholder, { backgroundColor: t.inputBg }]}>
              <ActivityIndicator color={t.subtext} />
            </View>
          )}
        </View>

        {/* Search + Later */}
        <View style={styles.searchZone}>
          <AddressAutocomplete
            big
            leftIcon={Search}
            placeholder="Where to?"
            value={destination?.address || ''}
            onSelect={setDestination}
            rightAccessory={(
              <TouchableOpacity style={[styles.laterBtn, { backgroundColor: t.inputBg }]} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
                <Calendar size={15} color={t.text} />
                <Text style={[styles.laterText, { color: t.text }]}>{scheduledFor ? shortTime(scheduledFor) : 'Later'}</Text>
              </TouchableOpacity>
            )}
          />

          {/* Pickup pill */}
          <View style={[styles.pickup, { backgroundColor: t.card, borderColor: t.border }]}>
            <MapPin size={18} color="#018a16" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pickupLabel, { color: t.subtext }]}>Pickup</Text>
              <Text style={[styles.pickupValue, { color: t.text }]} numberOfLines={1}>
                {pickup?.address || (locating ? 'Getting your location…' : 'Location unavailable')}
              </Text>
            </View>
            <TouchableOpacity onPress={useMyLocation} hitSlop={8} disabled={locating}>
              {locating ? <ActivityIndicator size="small" color={t.accent} /> : <Crosshair size={18} color={t.accent} />}
            </TouchableOpacity>
          </View>

          {showPicker && (
            <DateTimePicker
              value={scheduledFor || new Date()} mode="datetime" minimumDate={new Date()}
              themeVariant={t.mode}
              onChange={(e, d) => { setShowPicker(Platform.OS === 'ios'); if (e.type === 'set' && d) setScheduledFor(d); if (e.type === 'dismissed') setShowPicker(false); }}
            />
          )}
          {scheduledFor && (
            <TouchableOpacity onPress={() => setScheduledFor(null)}><Text style={[styles.clearLater, { color: t.subtext }]}>Scheduled for {fmtWhen(scheduledFor.toISOString())} · tap to clear</Text></TouchableOpacity>
          )}
        </View>

        {estimate && (
          <View style={[styles.estimate, { backgroundColor: t.mode === 'dark' ? '#152a4a' : '#eef4ff' }]}>
            <Clock size={16} color={t.accent} />
            <Text style={[styles.estimateText, { color: t.accent }]}>{estimate.durationMin} min · {estimate.distanceKm.toFixed(1)} km{arrival ? ` · arrive ~${shortTime(arrival)}` : ''}</Text>
          </View>
        )}

        {/* Recommendations (recent destinations) */}
        {!destination && recents.length > 0 && (
          <View style={styles.recents}>
            {recents.map((r, i) => {
              const { primary, secondary } = splitAddr(r.address);
              return (
                <TouchableOpacity key={i} style={[styles.recent, { borderBottomColor: t.border }]} onPress={() => setDestination(r)} activeOpacity={0.7}>
                  <View style={[styles.recentIcon, { backgroundColor: t.inputBg }]}><Clock size={18} color={t.subtext} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recentPrimary, { color: t.text }]} numberOfLines={1}>{primary}</Text>
                    {secondary ? <Text style={[styles.recentSecondary, { color: t.subtext }]} numberOfLines={1}>{secondary}</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Choose a ride */}
        {destination && (
          <View style={styles.chooseZone}>
            <Text style={[styles.section, { color: t.text }]}>Choose a ride</Text>
            <TouchableOpacity style={[styles.rideOpt, { backgroundColor: t.card, borderColor: choice === 'flexible' ? t.text : t.border }]} onPress={() => setChoice('flexible')} activeOpacity={0.8}>
              <View style={[styles.optIcon, { backgroundColor: t.mode === 'dark' ? '#26304d' : '#eef2ff' }]}><Sparkles size={22} color="#6d8bff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optTitle, { color: t.text }]}>Flexible</Text>
                <Text style={[styles.optSub, { color: t.subtext }]}>Any available car · usually fastest</Text>
              </View>
              {choice === 'flexible' && <Check size={20} color={t.text} />}
            </TouchableOpacity>
            {vehicles.map(v => {
              const active = choice === v.id;
              return (
                <TouchableOpacity key={v.id} style={[styles.rideOpt, { backgroundColor: t.card, borderColor: active ? t.text : t.border }]} onPress={() => setChoice(v.id)} activeOpacity={0.8}>
                  <View style={[styles.optIcon, { backgroundColor: t.inputBg }]}><Car size={22} color={t.subtext} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optTitle, { color: t.text }]}>{v.make} {v.model}</Text>
                    <Text style={[styles.optSub, { color: t.subtext }]}>{seatsFor(v)} seats{v.licensePlate ? ` · ${v.licensePlate}` : ''}</Text>
                  </View>
                  {active && <Check size={20} color={t.text} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.chooseZone}>
          <TouchableOpacity style={[styles.book, { backgroundColor: t.mode === 'dark' ? '#fff' : '#000' }, !canBook && styles.bookDisabled]} disabled={!canBook} onPress={book}>
            {submitting ? <ActivityIndicator color={t.mode === 'dark' ? '#000' : '#fff'} /> : (<><Navigation size={18} color={t.mode === 'dark' ? '#000' : '#fff'} /><Text style={[styles.bookText, { color: t.mode === 'dark' ? '#000' : '#fff' }]}>Request ride</Text></>)}
          </TouchableOpacity>

          <Text style={[styles.section, { color: t.text, marginTop: 24 }]}>Your rides</Text>
          {rides.length === 0 ? (
            <Text style={[styles.empty, { color: t.subtext }]}>No rides yet. Book one above.</Text>
          ) : rides.map(r => {
            const c = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
            return (
              <View key={r.id} style={[styles.ride, { backgroundColor: t.card, borderColor: t.border }]}>
                <View style={styles.rideTop}>
                  <View style={[styles.badge, { backgroundColor: c.bg }]}><Text style={[styles.badgeText, { color: c.fg }]}>{r.status}</Text></View>
                  <Text style={[styles.when, { color: t.subtext }]}>{fmtWhen(r.created_at)}</Text>
                </View>
                <View style={styles.line}><MapPin size={13} color="#c4001a" /><Text style={[styles.lineText, { color: t.text }]} numberOfLines={1}>{r.destination_address}</Text></View>
                <View style={styles.rideMeta}>
                  {r.vehicle_preference_name ? <Text style={[styles.metaChip, { backgroundColor: t.inputBg, color: t.subtext }]}>{r.vehicle_preference_name}</Text> : null}
                  {r.est_duration_min ? <Text style={[styles.metaChip, { backgroundColor: t.inputBg, color: t.subtext }]}>{r.est_duration_min} min</Text> : null}
                </View>
                {r.assigned_driver ? <Text style={styles.driver}>Driver: {r.assigned_driver}</Text> : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  hi: { fontSize: 22, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
  topBtns: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  body: { paddingBottom: 48 },
  mapWrap: { height: 200, overflow: 'hidden', marginBottom: -24 },
  map: { width: '100%', height: 224 },
  mapPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  searchZone: { paddingHorizontal: 16, paddingTop: 4 },
  laterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  laterText: { fontSize: 14, fontWeight: '600' },
  pickup: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 4 },
  pickupLabel: { fontSize: 12, fontWeight: '600' },
  pickupValue: { fontSize: 15, fontWeight: '600', marginTop: 1 },
  clearLater: { fontSize: 12, marginTop: 10 },
  estimate: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, marginHorizontal: 16, marginTop: 14 },
  estimateText: { fontSize: 14, fontWeight: '600' },
  recents: { paddingHorizontal: 16, marginTop: 8 },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1 },
  recentIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recentPrimary: { fontSize: 16, fontWeight: '600' },
  recentSecondary: { fontSize: 13, marginTop: 1 },
  chooseZone: { paddingHorizontal: 16 },
  section: { fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 10 },
  rideOpt: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1.5, marginBottom: 10 },
  optIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optTitle: { fontSize: 16, fontWeight: '700' },
  optSub: { fontSize: 13, marginTop: 2 },
  book: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 16, marginTop: 16 },
  bookDisabled: { opacity: 0.35 },
  bookText: { fontSize: 16, fontWeight: '700' },
  empty: { fontSize: 14 },
  ride: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 10 },
  rideTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  when: { fontSize: 12 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  lineText: { flex: 1, fontSize: 14 },
  rideMeta: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  metaChip: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  driver: { fontSize: 13, color: '#4a9eff', fontWeight: '600', marginTop: 8 },
});
