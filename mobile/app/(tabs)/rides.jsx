import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Clock, User, Navigation } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { SERVER_URL } from '../../src/config/api';
import { useTheme } from '../../src/store/themeStore';

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

export default function RidesScreen() {
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const t = useTheme();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/rides`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRides(await res.json());
    } catch {}
    setLoading(false); setRefreshing(false);
  }, [token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const pending = rides.filter(r => r.status === 'pending');
  const mine = rides.filter(r => r.assigned_driver_id === user?.id && r.status !== 'completed' && r.status !== 'cancelled');

  const Card = ({ r }) => {
    const c = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
    const isMine = r.assigned_driver_id === user?.id;
    return (
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={styles.top}>
          <View style={styles.riderRow}><User size={14} color={t.subtext} /><Text style={[styles.rider, { color: t.text }]}>{r.rider_name || 'Rider'}</Text></View>
          <View style={[styles.badge, { backgroundColor: c.bg }]}><Text style={[styles.badgeText, { color: c.fg }]}>{r.status}</Text></View>
        </View>
        {r.pickup_address ? <View style={styles.line}><MapPin size={13} color="#018a16" /><Text style={[styles.lineText, { color: t.text }]} numberOfLines={1}>{r.pickup_address}</Text></View> : null}
        <View style={styles.line}><MapPin size={13} color="#c4001a" /><Text style={[styles.lineText, { color: t.text }]} numberOfLines={1}>{r.destination_address}</Text></View>
        {r.notes ? <Text style={[styles.notes, { color: t.subtext }]}>“{r.notes}”</Text> : null}
        <Text style={[styles.when, { color: t.subtext }]}><Clock size={12} color={t.subtext} /> {fmtWhen(r.created_at)}</Text>

        <View style={styles.actions}>
          {r.status === 'pending' && (
            <TouchableOpacity style={styles.accept} disabled={busyId === r.id} onPress={() => update(r, 'accepted')}>
              {busyId === r.id ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.acceptText}>Accept ride</Text>}
            </TouchableOpacity>
          )}
          {isMine && r.status === 'accepted' && (
            <TouchableOpacity style={styles.accept} disabled={busyId === r.id} onPress={() => update(r, 'in_progress')}>
              <Text style={styles.acceptText}>Start ride</Text>
            </TouchableOpacity>
          )}
          {isMine && r.status === 'in_progress' && (
            <TouchableOpacity style={[styles.accept, { backgroundColor: '#018a16' }]} disabled={busyId === r.id} onPress={() => update(r, 'completed')}>
              <Text style={styles.acceptText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.border }]}>
        <Text style={[styles.title, { color: t.text }]}>Ride requests</Text>
        <Text style={[styles.sub, { color: t.subtext }]}>{pending.length} pending · {mine.length} active</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={t.text} />
        ) : rides.length === 0 ? (
          <View style={styles.empty}><Navigation size={40} color={t.subtext} /><Text style={[styles.emptyText, { color: t.subtext }]}>No ride requests yet</Text></View>
        ) : (
          <>
            {mine.length > 0 && <><Text style={[styles.section, { color: t.text }]}>Your active rides</Text>{mine.map(r => <Card key={r.id} r={r} />)}</>}
            <Text style={[styles.section, { color: t.text }]}>Pending</Text>
            {pending.length === 0 ? <Text style={[styles.emptyText, { color: t.subtext }]}>Nothing pending.</Text> : pending.map(r => <Card key={r.id} r={r} />)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ececec' },
  title: { fontSize: 22, fontWeight: '700', color: '#000' },
  sub: { fontSize: 13, color: '#888', marginTop: 2 },
  body: { padding: 16, paddingBottom: 48 },
  section: { fontSize: 14, fontWeight: '700', color: '#000', marginTop: 8, marginBottom: 10 },
  empty: { alignItems: 'center', gap: 10, marginTop: 60 },
  emptyText: { fontSize: 14, color: '#888' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#ececec', marginBottom: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rider: { fontSize: 15, fontWeight: '700', color: '#000' },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  lineText: { flex: 1, fontSize: 14, color: '#333' },
  notes: { fontSize: 13, color: '#666', fontStyle: 'italic', marginTop: 8 },
  when: { fontSize: 12, color: '#999', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  accept: { flex: 1, backgroundColor: '#000', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  acceptText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
