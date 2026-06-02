import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Car, User, Clock, MapPin } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { SERVER_URL } from '../../src/config/api';

function formatDuration(ms) {
  if (ms == null || ms < 0) return '—';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTimestamp(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatPosition(pos) {
  if (!pos || pos.lat == null || pos.lng == null) return 'Unknown';
  return `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
}

export default function DrivesScreen() {
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin';
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const url = isAdmin
        ? `${SERVER_URL}/api/drives`
        : `${SERVER_URL}/api/drives?driverId=${encodeURIComponent(user?.id || '')}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error('Failed to load drives');
      const data = await resp.json();
      setDrives(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, isAdmin, user?.id]);

  // Reload every time the tab is focused, and poll while it stays focused, so a
  // drive just started on the Home tab appears here within a couple of seconds
  // and an ongoing drive's duration stays current.
  useFocusEffect(
    useCallback(() => {
      load();
      const id = setInterval(load, 4000);
      return () => clearInterval(id);
    }, [load])
  );

  const onRefresh = () => { setRefreshing(true); load(); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Drives</Text>
        <Text style={styles.headerSub}>
          {isAdmin ? 'Every drive in the fleet' : 'Your driving history'}
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <View style={styles.empty}><ActivityIndicator size="small" color="#888" /></View>
        ) : error ? (
          <View style={styles.empty}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : drives.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No drives recorded yet</Text>
            <Text style={styles.emptyHint}>Start driving a vehicle to log your first trip.</Text>
          </View>
        ) : (
          drives.map(d => (
            <View key={d.id} style={[styles.card, !d.endedAt && styles.cardActive]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Car size={16} color="#000" />
                  <Text style={styles.cardTitle}>{d.vehicleName || 'Vehicle'}</Text>
                </View>
                {!d.endedAt ? (
                  <View style={styles.activeBadge}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>ONGOING</Text>
                  </View>
                ) : (
                  <Text style={styles.durationText}>{formatDuration(d.durationMs)}</Text>
                )}
              </View>

              <View style={styles.row}>
                <User size={14} color="#666" />
                <Text style={styles.rowText}>{d.driverName || 'Unknown'}</Text>
              </View>

              <View style={styles.row}>
                <Clock size={14} color="#666" />
                <Text style={styles.rowText}>
                  {formatTimestamp(d.startedAt)} {d.endedAt ? `→ ${formatTimestamp(d.endedAt)}` : '→ ongoing'}
                </Text>
              </View>

              <View style={styles.row}>
                <MapPin size={14} color="#018a16" />
                <Text style={styles.rowText} numberOfLines={1}>
                  {d.startAddress || formatPosition(d.startPosition)}
                </Text>
              </View>

              {d.endedAt && (
                <View style={styles.row}>
                  <MapPin size={14} color="#c4001a" />
                  <Text style={styles.rowText} numberOfLines={1}>
                    {d.endAddress || formatPosition(d.endPosition)}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ececec' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#000' },
  headerSub: { fontSize: 13, color: '#888', marginTop: 2 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  empty: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#444' },
  emptyHint: { fontSize: 13, color: '#888', marginTop: 4, textAlign: 'center' },
  errorText: { fontSize: 13, color: '#c4001a' },
  retryBtn: { marginTop: 10, padding: 10, backgroundColor: '#000', borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#ececec' },
  cardActive: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#000' },
  durationText: { fontSize: 13, fontWeight: '700', color: '#0061bd' },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#018a16' },
  activeText: { fontSize: 10, fontWeight: '700', color: '#018a16', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  rowText: { fontSize: 13, color: '#444', flex: 1 },
});
