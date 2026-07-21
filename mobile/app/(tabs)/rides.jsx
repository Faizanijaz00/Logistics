import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Image, Dimensions, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, User, ArrowRight, Car, Check, X } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { useTheme } from '../../src/store/themeStore';
import { SERVER_URL } from '../../src/config/api';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const SCREEN_W = Math.round(Dimensions.get('window').width);

const STATUS_COLORS = {
  pending: { bg: '#fef9c3', fg: '#854d0e' }, accepted: { bg: '#dbeafe', fg: '#1e40af' },
  in_progress: { bg: '#e0e7ff', fg: '#3730a3' }, completed: { bg: '#dcfce7', fg: '#166534' }, cancelled: { bg: '#fee2e2', fg: '#991b1b' },
};
function fmtWhen(iso) { return iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''; }

export default function RidesScreen() {
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const selectedVehicleId = useAuthStore(s => s.selectedVehicleId);
  const selectedVehicleName = useAuthStore(s => s.selectedVehicleName);
  const selectVehicle = useAuthStore(s => s.selectVehicle);
  const vehicles = useVehicleStore(s => s.vehicles);
  const t = useTheme();

  const [loc, setLoc] = useState(null);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/rides`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRides(await res.json());
    } catch {}
    setLoading(false); setRefreshing(false);
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Driver's current location for the map.
  useEffect(() => {
    (async () => {
      try {
        const Location = await import('expo-location');
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') status = (await Location.requestForegroundPermissionsAsync()).status;
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {}
    })();
  }, []);

  // Poll for new requests periodically.
  useEffect(() => {
    const iv = setInterval(load, 12000);
    return () => clearInterval(iv);
  }, [load]);

  const update = async (ride, status) => {
    setBusyId(ride.id);
    try {
      const res = await fetch(`${SERVER_URL}/api/rides/${ride.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, assigned_driver: user?.name }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      await load();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setBusyId(null); }
  };

  const pending = rides.filter(r => r.status === 'pending');
  const mine = rides.filter(r => r.assigned_driver_id === user?.id && r.status !== 'completed' && r.status !== 'cancelled');
  const mapUrl = loc && MAPBOX_TOKEN
    ? `https://api.mapbox.com/styles/v1/mapbox/${t.mapStyle}/static/pin-s+2563eb(${loc.lng},${loc.lat})/${loc.lng},${loc.lat},13,0/${SCREEN_W}x600@2x?access_token=${MAPBOX_TOKEN}`
    : null;

  const RideCard = ({ r }) => {
    const c = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
    const isMine = r.assigned_driver_id === user?.id;
    return (
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={styles.cardTop}>
          <View style={styles.riderRow}><User size={15} color={t.subtext} /><Text style={[styles.rider, { color: t.text }]}>{r.rider_name || 'Rider'}</Text></View>
          <View style={[styles.badge, { backgroundColor: c.bg }]}><Text style={[styles.badgeText, { color: c.fg }]}>{r.status}</Text></View>
        </View>
        <View style={styles.route}>
          <View style={styles.routeLine}><MapPin size={13} color="#018a16" /><Text style={[styles.routeText, { color: t.text }]} numberOfLines={1}>{r.pickup_address || 'Current location'}</Text></View>
          <View style={styles.routeLine}><MapPin size={13} color="#c4001a" /><Text style={[styles.routeText, { color: t.text }]} numberOfLines={1}>{r.destination_address}</Text></View>
        </View>
        <View style={styles.metaRow}>
          {r.vehicle_preference_name ? <Text style={[styles.chip, { backgroundColor: t.inputBg, color: t.subtext }]}>{r.vehicle_preference_name}</Text> : null}
          {r.est_duration_min ? <Text style={[styles.chip, { backgroundColor: t.inputBg, color: t.subtext }]}>{r.est_duration_min} min</Text> : null}
          <Text style={[styles.when, { color: t.subtext }]}>{fmtWhen(r.created_at)}</Text>
        </View>
        {r.status === 'pending' && (
          <TouchableOpacity style={[styles.select, { backgroundColor: t.accent }]} disabled={busyId === r.id} onPress={() => update(r, 'accepted')}>
            {busyId === r.id ? <ActivityIndicator size="small" color="#fff" /> : <><Text style={styles.selectText}>Select ride</Text><ArrowRight size={18} color="#fff" /></>}
          </TouchableOpacity>
        )}
        {isMine && r.status === 'accepted' && (
          <TouchableOpacity style={[styles.select, { backgroundColor: t.accent }]} disabled={busyId === r.id} onPress={() => update(r, 'in_progress')}><Text style={styles.selectText}>Start ride</Text></TouchableOpacity>
        )}
        {isMine && r.status === 'in_progress' && (
          <TouchableOpacity style={[styles.select, { backgroundColor: '#018a16' }]} disabled={busyId === r.id} onPress={() => update(r, 'completed')}><Text style={styles.selectText}>Complete ride</Text></TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      {/* Map with Select-vehicle button */}
      <View style={styles.mapWrap}>
        {mapUrl ? <Image source={{ uri: mapUrl }} style={styles.map} resizeMode="cover" />
          : <View style={[styles.map, styles.center, { backgroundColor: t.inputBg }]}><ActivityIndicator color={t.subtext} /></View>}
        <TouchableOpacity style={[styles.vehBtn, { backgroundColor: t.card }]} activeOpacity={0.85} onPress={() => setPickerOpen(true)}>
          <Car size={20} color={t.accent} />
          <Text style={[styles.vehBtnText, { color: t.text }]} numberOfLines={1}>
            {selectedVehicleName ? selectedVehicleName : 'Select vehicle'}
          </Text>
          {selectedVehicleName ? <Text style={[styles.vehBtnSub, { color: t.subtext }]}>Change</Text> : null}
        </TouchableOpacity>
      </View>

      {/* Bottom sheet */}
      <View style={[styles.sheet, { backgroundColor: t.bg }]}>
        <View style={styles.handle}><View style={[styles.handleBar, { backgroundColor: t.border }]} /></View>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: selectedVehicleId ? '#018a16' : t.subtext }]} />
          <Text style={[styles.statusText, { color: t.text }]}>{selectedVehicleId ? selectedVehicleName : 'No vehicle selected'}</Text>
          <Text style={[styles.statusSub, { color: t.subtext }]}>{pending.length} request{pending.length === 1 ? '' : 's'}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
          {loading ? <ActivityIndicator style={{ marginTop: 24 }} color={t.text} /> : (
            <>
              {mine.map(r => <RideCard key={r.id} r={r} />)}
              {pending.length === 0
                ? (mine.length === 0 && <Text style={[styles.empty, { color: t.subtext }]}>No ride requests right now.</Text>)
                : pending.map(r => <RideCard key={r.id} r={r} />)}
            </>
          )}
        </ScrollView>
      </View>

      {/* Vehicle picker */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)} />
        <View style={[styles.pickerSheet, { backgroundColor: t.card }]}>
          <View style={styles.pickerHead}>
            <Text style={[styles.pickerTitle, { color: t.text }]}>Select vehicle</Text>
            <TouchableOpacity onPress={() => setPickerOpen(false)} hitSlop={10}><X size={22} color={t.subtext} /></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 380 }}>
            {vehicles.map(v => {
              const active = v.id === selectedVehicleId;
              return (
                <TouchableOpacity key={v.id} style={[styles.vehRow, { borderBottomColor: t.border }]} activeOpacity={0.7}
                  onPress={() => { selectVehicle(v.id, `${v.make} ${v.model}`); setPickerOpen(false); }}>
                  <View style={[styles.vehIcon, { backgroundColor: t.inputBg }]}><Car size={20} color={t.subtext} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.vehName, { color: t.text }]}>{v.make} {v.model}</Text>
                    {v.licensePlate ? <Text style={[styles.vehPlate, { color: t.subtext }]}>{v.licensePlate}</Text> : null}
                  </View>
                  {active && <Check size={20} color={t.accent} />}
                </TouchableOpacity>
              );
            })}
            {vehicles.length === 0 && <Text style={[styles.empty, { color: t.subtext }]}>No vehicles available.</Text>}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  mapWrap: { flex: 1 },
  map: { width: '100%', height: '100%' },
  vehBtn: { position: 'absolute', bottom: 22, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 28, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8, maxWidth: '86%' },
  vehBtnText: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  vehBtnSub: { fontSize: 13, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  pickerSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 36 },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pickerTitle: { fontSize: 18, fontWeight: '700' },
  vehRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  vehIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  vehName: { fontSize: 16, fontWeight: '700' },
  vehPlate: { fontSize: 13, marginTop: 1 },
  sheet: { height: '46%', borderTopLeftRadius: 22, borderTopRightRadius: 22, marginTop: -20, paddingHorizontal: 16 },
  handle: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 17, fontWeight: '700' },
  statusSub: { fontSize: 13, marginLeft: 'auto' },
  list: { paddingBottom: 24 },
  card: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rider: { fontSize: 15, fontWeight: '700' },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  route: { gap: 4 },
  routeLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeText: { flex: 1, fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  chip: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  when: { fontSize: 12, marginLeft: 'auto' },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#000', borderRadius: 12, paddingVertical: 14, marginTop: 12 },
  selectText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  empty: { fontSize: 14, textAlign: 'center', marginTop: 24 },
});
