import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Car, User, Clock, MapPin, Search, X } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { SERVER_URL } from '../../src/config/api';
import SkeletonList from '../../src/components/SkeletonList';
import GeoText from '../../src/components/GeoText';
import UpdateInfo from '../../src/components/UpdateInfo';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

// Encode [[lng,lat],...] as a Mapbox/Google polyline (precision 5) for the
// Static Images API path overlay.
function encodePolyline(points) {
  let out = '';
  let prevLat = 0, prevLng = 0;
  const enc = (num) => {
    let v = Math.round(num * 1e5);
    v = v < 0 ? ~(v << 1) : (v << 1);
    let s = '';
    while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; }
    return s + String.fromCharCode(v + 63);
  };
  for (const [lng, lat] of points) {
    out += enc(lat - prevLat) + enc(lng - prevLng);
    prevLat = lat; prevLng = lng;
  }
  return out;
}

// Static Mapbox map: the route line (if we have breadcrumbs) + start (green) /
// end (red) pins. `route` is [[lng,lat],...].
function staticMapUrl(startPt, endPt, route) {
  if (!MAPBOX_TOKEN) return null;
  const overlays = [];
  if (route && route.length >= 2) {
    overlays.push(`path-4+0061bd-0.9(${encodeURIComponent(encodePolyline(route))})`);
  }
  if (startPt?.lat != null && startPt?.lng != null) overlays.push(`pin-s-a+018a16(${startPt.lng},${startPt.lat})`);
  if (endPt?.lat != null && endPt?.lng != null) overlays.push(`pin-s-b+c4001a(${endPt.lng},${endPt.lat})`);
  if (!overlays.length) return null;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${overlays.join(',')}/auto/600x300@2x?padding=50&access_token=${MAPBOX_TOKEN}`;
}

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

export default function DrivesScreen() {
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin';
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | ongoing | completed
  const [selected, setSelected] = useState(null); // tapped drive → detail modal
  const [route, setRoute] = useState([]); // [[lng,lat],...] breadcrumbs for the selected drive

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

  // When a drive is opened, pull its GPS breadcrumbs (for the drive's time
  // window) so the detail can draw the route line.
  useEffect(() => {
    if (!selected?.vehicleId || !selected?.startedAt) { setRoute([]); return; }
    let alive = true;
    (async () => {
      try {
        const resp = await fetch(
          `${SERVER_URL}/api/vehicles/${selected.vehicleId}/track?since=${encodeURIComponent(selected.startedAt)}&limit=500`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!resp.ok) { if (alive) setRoute([]); return; }
        const pts = await resp.json();
        const start = new Date(selected.startedAt).getTime();
        const end = selected.endedAt ? new Date(selected.endedAt).getTime() : Date.now();
        const line = (Array.isArray(pts) ? pts : [])
          .filter(p => {
            const t = new Date(p.timestamp).getTime();
            return p.lat != null && p.lng != null && t >= start - 60000 && t <= end + 60000;
          })
          .map(p => [p.lng, p.lat]);
        if (alive) setRoute(line);
      } catch {
        if (alive) setRoute([]);
      }
    })();
    return () => { alive = false; };
  }, [selected, token]);

  // Effective start/end: the drive's own position, or fall back to the first/
  // last breadcrumb so From/To resolve even when the drive lacked GPS.
  const startPt = selected?.startPosition || (route.length ? { lat: route[0][1], lng: route[0][0] } : null);
  const endPt = selected?.endPosition || (route.length ? { lat: route[route.length - 1][1], lng: route[route.length - 1][0] } : null);

  const q = query.trim().toLowerCase();
  const filtered = drives.filter(d => {
    if (statusFilter === 'ongoing' && d.endedAt) return false;
    if (statusFilter === 'completed' && !d.endedAt) return false;
    if (!q) return true;
    const haystack = [d.vehicleName, d.driverName, d.startAddress, d.endAddress]
      .filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'ongoing', label: 'Ongoing' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Drives</Text>
        <Text style={styles.headerSub}>
          {isAdmin ? 'Every drive in the fleet' : 'Your driving history'}
        </Text>

        <View style={styles.searchRow}>
          <Search size={16} color="#999" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search vehicle, driver, place…"
            placeholderTextColor="#aaa"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <X size={16} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          keyboardShouldPersistTaps="handled"
        >
          {FILTERS.map(f => {
            const active = statusFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setStatusFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <SkeletonList count={4} />
        ) : error ? (
          <View style={styles.empty}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            {drives.length === 0 ? (
              <>
                <Text style={styles.emptyText}>No drives recorded yet</Text>
                <Text style={styles.emptyHint}>Start driving a vehicle to log your first trip.</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>No matching drives</Text>
                <Text style={styles.emptyHint}>Try a different search or filter.</Text>
              </>
            )}
          </View>
        ) : (
          filtered.map(d => (
            <TouchableOpacity key={d.id} style={[styles.card, !d.endedAt && styles.cardActive]} onPress={() => setSelected(d)} activeOpacity={0.7}>
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
                <View style={styles.locCol}>
                  <Text style={styles.locLabel}>From</Text>
                  <GeoText
                    lat={d.startPosition?.lat}
                    lng={d.startPosition?.lng}
                    address={d.startAddress}
                    style={styles.rowText}
                  />
                </View>
              </View>

              {d.endedAt && (
                <View style={styles.row}>
                  <MapPin size={14} color="#c4001a" />
                  <View style={styles.locCol}>
                    <Text style={styles.locLabel}>To</Text>
                    <GeoText
                      lat={d.endPosition?.lat}
                      lng={d.endPosition?.lng}
                      address={d.endAddress}
                      style={styles.rowText}
                    />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
        {!loading && !error && <UpdateInfo />}
      </ScrollView>

      {/* Drive / journey detail */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.detailBackdrop}>
          <View style={styles.detailSheet}>
            {selected && (
              <>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle}>{selected.vehicleName || 'Drive'}</Text>
                  <TouchableOpacity onPress={() => setSelected(null)} hitSlop={8}><X size={20} color="#000" /></TouchableOpacity>
                </View>
                {staticMapUrl(startPt, endPt, route) ? (
                  <Image source={{ uri: staticMapUrl(startPt, endPt, route) }} style={styles.detailMap} resizeMode="cover" />
                ) : null}
                <View style={styles.detailBody}>
                  <View style={styles.row}><User size={14} color="#666" /><Text style={styles.rowText}>{selected.driverName || 'Unknown'}</Text></View>
                  <View style={styles.row}><Clock size={14} color="#666" /><Text style={styles.rowText}>
                    {formatTimestamp(selected.startedAt)} {selected.endedAt ? `→ ${formatTimestamp(selected.endedAt)}` : '→ ongoing'}
                  </Text></View>
                  {selected.endedAt ? (
                    <View style={styles.row}><Clock size={14} color="#0061bd" /><Text style={[styles.rowText, { fontWeight: '600' }]}>Duration: {formatDuration(selected.durationMs)}</Text></View>
                  ) : null}
                  {route.length >= 2 ? (
                    <View style={styles.row}><MapPin size={14} color="#0061bd" /><Text style={styles.rowText}>{route.length} GPS points along the route</Text></View>
                  ) : null}
                  <View style={styles.row}>
                    <MapPin size={14} color="#018a16" />
                    <View style={styles.locCol}><Text style={styles.locLabel}>From</Text>
                      <GeoText lat={startPt?.lat} lng={startPt?.lng} address={selected.startAddress} style={styles.rowText} numberOfLines={2} />
                    </View>
                  </View>
                  {selected.endedAt ? (
                    <View style={styles.row}>
                      <MapPin size={14} color="#c4001a" />
                      <View style={styles.locCol}><Text style={styles.locLabel}>To</Text>
                        <GeoText lat={endPt?.lat} lng={endPt?.lng} address={selected.endAddress} style={styles.rowText} numberOfLines={2} />
                      </View>
                    </View>
                  ) : null}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ececec' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#000' },
  headerSub: { fontSize: 13, color: '#888', marginTop: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f2f2f2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginTop: 12 },
  searchInput: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  filterRow: { gap: 8, paddingTop: 10, paddingRight: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f2f2f2' },
  filterChipActive: { backgroundColor: '#000' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  filterChipTextActive: { color: '#fff' },
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
  locCol: { flex: 1 },
  locLabel: { fontSize: 10, fontWeight: '700', color: '#999', letterSpacing: 0.5, textTransform: 'uppercase' },
  detailBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden', paddingBottom: 28 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  detailMap: { width: '100%', height: 180, backgroundColor: '#eaeaea' },
  detailBody: { padding: 16, gap: 2 },
});
