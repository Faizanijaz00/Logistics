import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions,
  ActivityIndicator, Alert, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LogOut, Clock, MapPin, Crosshair, Search, Calendar, Car, Check, Sparkles, Sun, Moon, X, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '../src/store/authStore';
import { useTheme, useThemeStore } from '../src/store/themeStore';
import { SERVER_URL } from '../src/config/api';
import AddressAutocomplete from '../src/components/AddressAutocomplete';
import { reverseGeocode } from '../src/lib/geocode';
import { getRouteEstimate } from '../src/lib/directions';
import { getCarImage } from '../src/config/carImages';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const SCREEN_W = Math.round(Dimensions.get('window').width);

const STATUS_COLORS = {
  pending: { bg: '#fef9c3', fg: '#854d0e' }, accepted: { bg: '#dbeafe', fg: '#1e40af' },
  in_progress: { bg: '#e0e7ff', fg: '#3730a3' }, completed: { bg: '#dcfce7', fg: '#166534' }, cancelled: { bg: '#fee2e2', fg: '#991b1b' },
};
function fmtWhen(iso) { return iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }
function shortTime(d) { return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
function seatsFor(v) { const s = `${v.make} ${v.model}`.toLowerCase(); return (s.includes('v class') || s.includes('van') || s.includes('vito')) ? 7 : 4; }
function splitAddr(a) { const p = (a || '').split(','); return { primary: p[0]?.trim() || a, secondary: p.slice(1).join(',').trim() }; }

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
    try { const res = await fetch(`${SERVER_URL}/api/rides`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) setRides(await res.json()); } catch {}
    setRefreshing(false);
  }, [token]);
  const loadVehicles = useCallback(async () => {
    try { const res = await fetch(`${SERVER_URL}/api/vehicles`, { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) setVehicles(await res.json()); } catch {}
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
    } catch { Alert.alert('Error', 'Could not get your location.'); }
    finally { setLocating(false); }
  };

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

  const homeMapUrl = pickup && MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/mapbox/${t.mapStyle}/static/pin-s+3b82f6(${pickup.lng},${pickup.lat})/${pickup.lng},${pickup.lat},13.5,0/${SCREEN_W}x240@2x?access_token=${MAPBOX_TOKEN}`
    : null;
  const routeMapUrl = pickup && destination?.lat != null && MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/mapbox/${t.mapStyle}/static/`
      + `${estimate?.geometry ? `path-5+2563eb-0.9(${encodeURIComponent(estimate.geometry)}),` : ''}`
      + `pin-s+16a34a(${pickup.lng},${pickup.lat}),pin-s+dc2626(${destination.lng},${destination.lat})`
      + `/auto/${SCREEN_W}x320@2x?access_token=${MAPBOX_TOKEN}&padding=60`
    : null;

  const book = async () => {
    if (!destination?.address) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/rides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          rider_name: user?.name,
          pickup_address: pickup?.address || null, pickup_lat: pickup?.lat ?? null, pickup_lng: pickup?.lng ?? null,
          destination_address: destination.address, destination_lat: destination.lat ?? null, destination_lng: destination.lng ?? null,
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
    } catch (e) { Alert.alert('Could not request ride', e.message); }
    finally { setSubmitting(false); }
  };

  const isDark = t.mode === 'dark';
  const btnBg = isDark ? '#fff' : '#000';
  const btnFg = isDark ? '#000' : '#fff';

  // ── Ride option card ──────────────────────────────────────────────
  const RideCard = ({ id, title, subtitle, image, iconBg, Icon, iconColor }) => {
    const active = choice === id;
    return (
      <TouchableOpacity style={[styles.rideOpt, { backgroundColor: t.card, borderColor: active ? t.text : t.border }]} onPress={() => setChoice(id)} activeOpacity={0.85}>
        <View style={[styles.optIcon, { backgroundColor: iconBg || t.inputBg }]}>
          {image ? <Image source={image} style={styles.optImg} resizeMode="contain" /> : <Icon size={24} color={iconColor || t.subtext} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.optTitle, { color: t.text }]}>{title}</Text>
          <Text style={[styles.optSub, { color: t.subtext }]}>{subtitle}</Text>
        </View>
        {active && <Check size={20} color={t.text} />}
      </TouchableOpacity>
    );
  };

  // ══════════════════════ CONFIRM VIEW (destination chosen) ══════════════════════
  if (destination) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
        <View style={styles.routeMapWrap}>
          {routeMapUrl ? <Image source={{ uri: routeMapUrl }} style={styles.routeMap} resizeMode="cover" />
            : <View style={[styles.routeMap, styles.center, { backgroundColor: t.inputBg }]}><ActivityIndicator color={t.subtext} /></View>}
          {/* Route header pill */}
          <View style={[styles.routePill, { backgroundColor: t.card }]}>
            <TouchableOpacity onPress={() => { setDestination(null); setChoice('flexible'); }} hitSlop={8}><X size={20} color={t.text} /></TouchableOpacity>
            <Text style={[styles.routeText, { color: '#16a34a' }]} numberOfLines={1}>{splitAddr(pickup?.address).primary}</Text>
            <ArrowRight size={15} color={t.subtext} />
            <Text style={[styles.routeText, { color: t.text }]} numberOfLines={1}>{splitAddr(destination.address).primary}</Text>
          </View>
        </View>

        <ScrollView style={[styles.sheet, { backgroundColor: t.bg }]} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
          {estimate && (
            <View style={[styles.estimate, { backgroundColor: isDark ? '#152a4a' : '#eef4ff', marginHorizontal: 0, marginTop: 4 }]}>
              <Clock size={16} color={t.accent} />
              <Text style={[styles.estimateText, { color: t.accent }]}>{estimate.durationMin} min · {estimate.distanceKm.toFixed(1)} km{arrival ? ` · arrive ~${shortTime(arrival)}` : ''}</Text>
            </View>
          )}
          <Text style={[styles.section, { color: t.text }]}>Choose a ride</Text>
          <RideCard id="flexible" title="Flexible" subtitle="Any available car · usually fastest" Icon={Sparkles} iconBg={isDark ? '#26304d' : '#eef2ff'} iconColor="#6d8bff" />
          {vehicles.map(v => (
            <RideCard key={v.id} id={v.id} title={`${v.make} ${v.model}`} subtitle={`${estimate ? estimate.durationMin + ' min · ' : ''}${seatsFor(v)} seats`} image={getCarImage(v.imageId)} Icon={Car} />
          ))}
        </ScrollView>

        {/* Bottom action bar */}
        <View style={[styles.bottomBar, { backgroundColor: t.bg, borderTopColor: t.border }]}>
          <TouchableOpacity style={[styles.continue, { backgroundColor: btnBg }, submitting && { opacity: 0.5 }]} disabled={submitting} onPress={book}>
            {submitting ? <ActivityIndicator color={btnFg} /> : <Text style={[styles.continueText, { color: btnFg }]}>Continue</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.laterRound, { backgroundColor: t.card, borderColor: t.border }]} onPress={() => setShowPicker(true)}>
            <Calendar size={20} color={t.text} />
          </TouchableOpacity>
        </View>
        {scheduledFor && <Text style={[styles.scheduledNote, { color: t.subtext, backgroundColor: t.bg }]}>Scheduled for {fmtWhen(scheduledFor.toISOString())}</Text>}
        {showPicker && (
          <DateTimePicker value={scheduledFor || new Date()} mode="datetime" minimumDate={new Date()} themeVariant={t.mode}
            onChange={(e, d) => { setShowPicker(Platform.OS === 'ios'); if (e.type === 'set' && d) setScheduledFor(d); if (e.type === 'dismissed') setShowPicker(false); }} />
        )}
      </SafeAreaView>
    );
  }

  // ══════════════════════ HOME VIEW ══════════════════════
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.hi, { color: t.text }]}>Hi {user?.name || 'there'}</Text>
          <Text style={[styles.sub, { color: t.subtext }]}>Choose your ride</Text>
        </View>
        <View style={styles.topBtns}>
          <TouchableOpacity onPress={toggleTheme} hitSlop={8} style={[styles.iconBtn, { backgroundColor: t.inputBg }]}>{isDark ? <Sun size={18} color={t.text} /> : <Moon size={18} color={t.text} />}</TouchableOpacity>
          <TouchableOpacity onPress={logout} hitSlop={8} style={[styles.iconBtn, { backgroundColor: t.inputBg }]}><LogOut size={18} color="#c4001a" /></TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRides(); }} />}>
        <View style={styles.mapWrap}>
          {homeMapUrl ? <Image source={{ uri: homeMapUrl }} style={styles.map} resizeMode="cover" />
            : <View style={[styles.map, styles.center, { backgroundColor: t.inputBg }]}><ActivityIndicator color={t.subtext} /></View>}
        </View>

        <View style={styles.searchZone}>
          <AddressAutocomplete big leftIcon={Search} placeholder="Where to?" value={destination?.address || ''} onSelect={setDestination} proximity={pickup}
            rightAccessory={(
              <TouchableOpacity style={[styles.laterBtn, { backgroundColor: t.inputBg }]} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
                <Calendar size={15} color={t.text} /><Text style={[styles.laterText, { color: t.text }]}>{scheduledFor ? shortTime(scheduledFor) : 'Later'}</Text>
              </TouchableOpacity>
            )} />
          <View style={[styles.pickup, { backgroundColor: t.card, borderColor: t.border }]}>
            <MapPin size={18} color="#018a16" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pickupLabel, { color: t.subtext }]}>Pickup</Text>
              <Text style={[styles.pickupValue, { color: t.text }]} numberOfLines={1}>{pickup?.address || (locating ? 'Getting your location…' : 'Location unavailable')}</Text>
            </View>
            <TouchableOpacity onPress={useMyLocation} hitSlop={8} disabled={locating}>{locating ? <ActivityIndicator size="small" color={t.accent} /> : <Crosshair size={18} color={t.accent} />}</TouchableOpacity>
          </View>
        </View>

        {recents.length > 0 && (
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

        <View style={styles.chooseZone}>
          <Text style={[styles.section, { color: t.text, marginTop: 8 }]}>Your rides</Text>
          {rides.length === 0 ? <Text style={[styles.empty, { color: t.subtext }]}>No rides yet. Book one above.</Text>
            : rides.map(r => {
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
      {showPicker && (
        <DateTimePicker value={scheduledFor || new Date()} mode="datetime" minimumDate={new Date()} themeVariant={t.mode}
          onChange={(e, d) => { setShowPicker(Platform.OS === 'ios'); if (e.type === 'set' && d) setScheduledFor(d); if (e.type === 'dismissed') setShowPicker(false); }} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10 },
  hi: { fontSize: 22, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
  topBtns: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  body: { paddingBottom: 48 },
  mapWrap: { height: 200, overflow: 'hidden', marginBottom: -24 },
  map: { width: '100%', height: 224 },
  searchZone: { paddingHorizontal: 16, paddingTop: 4 },
  laterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  laterText: { fontSize: 14, fontWeight: '600' },
  pickup: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 4 },
  pickupLabel: { fontSize: 12, fontWeight: '600' },
  pickupValue: { fontSize: 15, fontWeight: '600', marginTop: 1 },
  estimate: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, marginHorizontal: 16, marginTop: 14 },
  estimateText: { fontSize: 14, fontWeight: '600' },
  recents: { paddingHorizontal: 16, marginTop: 8 },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1 },
  recentIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recentPrimary: { fontSize: 16, fontWeight: '600' },
  recentSecondary: { fontSize: 13, marginTop: 1 },
  chooseZone: { paddingHorizontal: 16 },
  section: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 12 },
  rideOpt: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 12, borderWidth: 1.5, marginBottom: 10 },
  optIcon: { width: 60, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  optImg: { width: 58, height: 44 },
  optTitle: { fontSize: 16, fontWeight: '700' },
  optSub: { fontSize: 13, marginTop: 2 },
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

  // Confirm view
  routeMapWrap: { height: 300 },
  routeMap: { width: '100%', height: 300 },
  routePill: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  routeText: { flex: 1, fontSize: 14, fontWeight: '700' },
  sheet: { flex: 1, marginTop: -20, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: 'transparent' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, borderTopWidth: 1 },
  continue: { flex: 1, borderRadius: 28, paddingVertical: 17, alignItems: 'center' },
  continueText: { fontSize: 17, fontWeight: '700' },
  laterRound: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scheduledNote: { textAlign: 'center', fontSize: 12, paddingBottom: 8 },
});
