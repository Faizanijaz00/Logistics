import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReceiptText, Car, User, Calendar, AlertCircle, Clock, Plus, Search, X, ChevronLeft } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { SERVER_URL } from '../../src/config/api';
import ReceiptViewer from '../../src/components/ReceiptViewer';
import SkeletonList from '../../src/components/SkeletonList';
import { AddTicketModal, TicketEditModal } from '../(tabs)/index';

// Appeal/paid state isn't stored in its own columns — `status` carries paid/
// appealing and the deadlines ride inside plan_for_contesting as JSON. Also
// accept the older camelCase/snake fields so historical tickets still read.
function parseTicketMeta(t) {
  let meta = {};
  const raw = t.plan_for_contesting;
  if (raw && typeof raw === 'string' && raw.trim().startsWith('{')) {
    try { meta = JSON.parse(raw); } catch { /* keep defaults */ }
  }
  const appealing = t.appealing || meta.appealing || (t.status === 'Appealing' ? 'yes' : 'undecided');
  const appealDeadline = t.appeal_deadline || t.appealDeadline || meta.appeal_deadline || null;
  const paymentDeadline = t.payment_deadline || t.paymentDeadline || meta.payment_deadline || null;
  const paid = !!t.paid || t.status === 'Paid';
  const receiptPath = t.receipt_path || meta.receipt_path || null;
  return { appealing, appealDeadline, paymentDeadline, paid, receiptPath };
}

// Derive the tracker-facing fields, tolerating both the new wizard schema
// (current_stage/key_deadline_date/action_status) and legacy tickets.
function deriveFine(t) {
  const meta = parseTicketMeta(t);
  const stage = t.current_stage || t.status || 'PCN issued';
  const deadline = t.key_deadline_date || meta.paymentDeadline || meta.appealDeadline || null;
  const actionStatus = t.action_status || (t.action_taken ? 'actioned' : 'needs_action');
  return { stage, deadline, actionStatus, issuerType: t.issuer_type || null, ticketType: t.ticket_type || null };
}

// Days from today until a YYYY-MM-DD / ISO deadline (null-safe). Negative = overdue.
function daysUntil(iso) {
  if (!iso) return Infinity;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return Infinity;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

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
  const router = useRouter();
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const { vehicles } = useVehicleStore();
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | outstanding | appealing | paid

  // Same driver list the Add Ticket modal expects (drivers + admins).
  const drivers = users.filter(u => u.role === 'driver' || u.role === 'admin');

  // Small helper matching the one the edit modal expects: prefixes SERVER_URL,
  // attaches auth, returns parsed JSON (or null on 204).
  const authedFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(`${SERVER_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed (${res.status})`);
    }
    if (res.status === 204) return null;
    return res.json().catch(() => null);
  }, [token]);

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

  // Reload whenever the tab is focused so a ticket just added from Home shows up.
  useFocusEffect(useCallback(() => { load(); }, [load]));
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

  const matchesStatus = (t) => {
    const { appealing, paid } = parseTicketMeta(t);
    switch (statusFilter) {
      case 'paid': return paid;
      case 'appealing': return !paid && appealing === 'yes';
      case 'outstanding': return !paid;
      default: return true;
    }
  };

  const q = query.trim().toLowerCase();
  const matchesQuery = (t) => {
    if (!q) return true;
    const v = getVehicle(t);
    const haystack = [
      t.pcn, t.reference, t.notes, t.reason, getDriver(t),
      v && `${v.make} ${v.model} ${v.licensePlate}`,
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  };

  const filtered = visible
    .filter(t => matchesStatus(t) && matchesQuery(t))
    // Most urgent first: soonest key_deadline_date at the top (no-deadline last).
    .sort((a, b) => daysUntil(deriveFine(a).deadline) - daysUntil(deriveFine(b).deadline));

  // Flip needs_action ⇄ actioned (separate from the enforcement stage).
  const toggleActionStatus = async (t) => {
    const next = deriveFine(t).actionStatus === 'actioned' ? 'needs_action' : 'actioned';
    setTickets(ts => ts.map(x => x.id === t.id ? { ...x, action_status: next } : x));
    try { await authedFetch(`/api/tickets/${t.id}`, { method: 'PATCH', body: JSON.stringify({ action_status: next }) }); }
    catch { load(); }
  };

  const totalOutstanding = filtered.reduce((sum, t) => sum + (Number(t.outstanding ?? t.amount) || 0), 0);

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'outstanding', label: 'Outstanding' },
    { key: 'appealing', label: 'Appealing' },
    { key: 'paid', label: 'Paid' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <ChevronLeft size={24} color="#000" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Tickets & Fines</Text>
            <Text style={styles.headerSub}>
              {filtered.length} ticket{filtered.length === 1 ? '' : 's'} · {formatCurrency(totalOutstanding)} outstanding
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/admin/fine-wizard')} activeOpacity={0.85}>
            <Plus size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add new fine</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <Search size={16} color="#999" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search PCN, driver, vehicle…"
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
            <ReceiptText size={48} color="#ccc" />
            {visible.length === 0 ? (
              <>
                <Text style={styles.emptyText}>No tickets yet</Text>
                <Text style={styles.emptyHint}>Tap Add to log your first ticket.</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>No matching tickets</Text>
                <Text style={styles.emptyHint}>Try a different search or filter.</Text>
              </>
            )}
          </View>
        ) : (
          filtered.map(t => {
            const v = getVehicle(t);
            const driver = getDriver(t);
            const ref = t.pcn || t.reference || '—';
            const amount = t.outstanding ?? t.amount;
            const dateStr = t.date || t.createdAt || t.created_at;
            const reason = t.notes || t.reason || '';
            const { appealing, appealDeadline, paymentDeadline, paid, receiptPath } = parseTicketMeta(t);
            const { stage, deadline, actionStatus, issuerType } = deriveFine(t);
            const dLeft = daysUntil(deadline);
            const deadlineColor = dLeft < 0 ? '#c4001a' : dLeft <= 7 ? '#cc7700' : '#0061bd';
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.card, paid && styles.cardPaid]}
                onPress={() => setEditing(t)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.ref}>{ref}</Text>
                  <Text style={[styles.amount, paid && styles.amountPaid]}>{formatCurrency(amount)}</Text>
                </View>

                {/* Stage + action-status row */}
                <View style={styles.badgeRow}>
                  <View style={styles.stageBadge}>
                    <Text style={styles.stageBadgeText}>{stage}</Text>
                  </View>
                  {issuerType ? (
                    <View style={styles.issuerBadge}>
                      <Text style={styles.issuerBadgeText}>{issuerType === 'government' ? 'Gov' : 'Private'}</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); toggleActionStatus(t); }}
                    style={[styles.actionPill, actionStatus === 'actioned' ? styles.actionDone : styles.actionNeeded]}
                  >
                    <Text style={[styles.actionPillText, { color: actionStatus === 'actioned' ? '#018a16' : '#c4001a' }]}>
                      {actionStatus === 'actioned' ? '✓ Actioned' : '● Needs action'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {deadline ? (
                  <View style={styles.row}>
                    <Clock size={14} color={deadlineColor} />
                    <Text style={[styles.rowText, { color: deadlineColor, fontWeight: '600' }]}>
                      {dLeft < 0 ? `Overdue by ${Math.abs(dLeft)}d` : dLeft === 0 ? 'Due today' : `Due in ${dLeft}d`} · {formatDate(deadline)}
                    </Text>
                  </View>
                ) : null}

                {t.recommended_action ? (
                  <Text style={styles.reason} numberOfLines={2}>→ {t.recommended_action}</Text>
                ) : null}

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

                <ReceiptViewer path={receiptPath} token={token} label="Ticket photo" />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <AddTicketModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        user={user}
        token={token}
        drivers={drivers}
        vehicles={vehicles}
        onSaved={load}
      />

      {editing && (
        <TicketEditModal
          visible
          ticket={editing}
          vehicles={vehicles}
          drivers={drivers}
          currentUser={user}
          token={token}
          authedFetch={authedFetch}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
          onDeleted={async () => { setEditing(null); await load(); }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ececec' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { marginLeft: -4 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#000' },
  headerSub: { fontSize: 13, color: '#888', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f2f2f2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginTop: 12 },
  searchInput: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  filterRow: { gap: 8, paddingTop: 10, paddingRight: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f2f2f2' },
  filterChipActive: { backgroundColor: '#000' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  filterChipTextActive: { color: '#fff' },
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
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  stageBadge: { backgroundColor: '#eef2ff', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  stageBadgeText: { fontSize: 12, fontWeight: '600', color: '#3730a3' },
  issuerBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  issuerBadgeText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  actionPill: { marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  actionNeeded: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  actionDone: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  actionPillText: { fontSize: 12, fontWeight: '700' },
  ref: { fontSize: 15, fontWeight: '700', color: '#000', fontFamily: 'monospace' },
  amount: { fontSize: 16, fontWeight: '700', color: '#c4001a' },
  amountPaid: { color: '#018a16' },
  paidBadge: { fontSize: 10, fontWeight: '700', color: '#018a16', letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  rowText: { fontSize: 13, color: '#444', flex: 1 },
  reason: { fontSize: 13, color: '#666', marginTop: 8, fontStyle: 'italic' },
});
