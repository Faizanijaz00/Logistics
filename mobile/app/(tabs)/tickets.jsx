import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReceiptText, Car, User, Calendar, AlertCircle, Clock } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { SERVER_URL } from '../../src/config/api';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(n) {
  if (n == null || isNaN(n)) return '—';
  return `£${Number(n).toFixed(2)}`;
}

export default function TicketsScreen() {
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const { vehicles } = useVehicleStore();
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [tRes, uRes] = await Promise.all([
        fetch(`${SERVER_URL}/api/tickets`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${SERVER_URL}/api/auth/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!tRes.ok) throw new Error('Failed to load tickets');
      const tData = await tRes.json();
      const uData = uRes.ok ? await uRes.json() : [];
      setTickets(Array.isArray(tData) ? tData : []);
      setUsers(Array.isArray(uData) ? uData : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const getVehicle = (t) => {
    const id = t.vehicle_id || t.vehicleId;
    return vehicles.find(v => v.id === id);
  };
  const getDriver = (t) => {
    if (t.driverName) return t.driverName;
    if (t.driver_name) return t.driver_name;
    const id = t.driver_id || t.driverId;
    return users.find(u => u.id === id)?.name || 'Unknown';
  };

  // Filter for drivers — only show their own tickets
  const visible = user?.role === 'admin'
    ? tickets
    : tickets.filter(t => {
        const did = t.driver_id || t.driverId;
        return did === user?.id;
      });

  const totalOutstanding = visible.reduce((sum, t) => sum + (Number(t.outstanding ?? t.amount) || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tickets & Fines</Text>
        <Text style={styles.headerSub}>
          {visible.length} ticket{visible.length === 1 ? '' : 's'} · {formatCurrency(totalOutstanding)} outstanding
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
        ) : visible.length === 0 ? (
          <View style={styles.empty}>
            <ReceiptText size={48} color="#ccc" />
            <Text style={styles.emptyText}>No tickets yet</Text>
            <Text style={styles.emptyHint}>Add a ticket from the home screen.</Text>
          </View>
        ) : (
          visible.map(t => {
            const v = getVehicle(t);
            const driver = getDriver(t);
            const ref = t.pcn || t.reference || '—';
            const amount = t.outstanding ?? t.amount;
            const dateStr = t.date || t.createdAt || t.created_at;
            const reason = t.notes || t.reason || '';
            const paid = t.paid || t.status === 'Paid';
            const appealing = t.appealing || 'undecided';
            const appealDeadline = t.appeal_deadline || t.appealDeadline;
            const paymentDeadline = t.payment_deadline || t.paymentDeadline;
            return (
              <View key={t.id} style={[styles.card, paid && styles.cardPaid]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.ref}>{ref}</Text>
                  <Text style={[styles.amount, paid && styles.amountPaid]}>{formatCurrency(amount)}</Text>
                </View>
                {paid ? <Text style={styles.paidBadge}>PAID</Text> : null}

                {v ? (
                  <View style={styles.row}>
                    <Car size={14} color="#666" />
                    <Text style={styles.rowText}>{v.make} {v.model} · {v.licensePlate}</Text>
                  </View>
                ) : null}

                <View style={styles.row}>
                  <User size={14} color="#666" />
                  <Text style={styles.rowText}>{driver}</Text>
                </View>

                <View style={styles.row}>
                  <Calendar size={14} color="#666" />
                  <Text style={styles.rowText}>Issued: {formatDate(dateStr)}</Text>
                </View>

                {appealing && appealing !== 'undecided' ? (
                  <View style={styles.row}>
                    <AlertCircle size={14} color={appealing === 'yes' ? '#0061bd' : '#888'} />
                    <Text style={[styles.rowText, { color: appealing === 'yes' ? '#0061bd' : '#666', fontWeight: '600' }]}>
                      Appeal: {appealing === 'yes' ? 'Yes' : 'No'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.row}>
                    <AlertCircle size={14} color="#f59e0b" />
                    <Text style={[styles.rowText, { color: '#92400e' }]}>Appeal: Undecided</Text>
                  </View>
                )}

                {appealing !== 'no' && appealDeadline ? (
                  <View style={styles.row}>
                    <Clock size={14} color="#0061bd" />
                    <Text style={styles.rowText}>Appeal by: {formatDate(appealDeadline)}</Text>
                  </View>
                ) : null}

                {appealing !== 'yes' && paymentDeadline ? (
                  <View style={styles.row}>
                    <Clock size={14} color="#c4001a" />
                    <Text style={styles.rowText}>Pay by: {formatDate(paymentDeadline)}</Text>
                  </View>
                ) : null}

                {reason ? <Text style={styles.reason} numberOfLines={3}>{reason}</Text> : null}
              </View>
            );
          })
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
  empty: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#444', marginTop: 8 },
  emptyHint: { fontSize: 13, color: '#888', textAlign: 'center' },
  errorText: { fontSize: 13, color: '#c4001a' },
  retryBtn: { marginTop: 10, padding: 10, backgroundColor: '#000', borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#ececec' },
  cardPaid: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ref: { fontSize: 15, fontWeight: '700', color: '#000', fontFamily: 'monospace' },
  amount: { fontSize: 16, fontWeight: '700', color: '#c4001a' },
  amountPaid: { color: '#018a16' },
  paidBadge: { fontSize: 10, fontWeight: '700', color: '#018a16', letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  rowText: { fontSize: 13, color: '#444', flex: 1 },
  reason: { fontSize: 13, color: '#666', marginTop: 8, fontStyle: 'italic' },
});
