import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Modal, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Car, User, MapPin, Clock, X, Plus, ChevronDown, Trash2 } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { SERVER_URL } from '../../src/config/api';

function fmtWhen(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(min) {
  if (!min) return '—';
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
}

const DURATIONS = [
  { label: '1h', min: 60 }, { label: '2h', min: 120 }, { label: '4h', min: 240 },
  { label: '8h', min: 480 }, { label: 'All day', min: 600 },
];

function NewBookingModal({ visible, onClose, vehicles, user, token, onSaved }) {
  const [vehicleId, setVehicleId] = useState(null);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const [start, setStart] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [duration, setDuration] = useState(120);
  const [destination, setDestination] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const vehicle = vehicles.find(v => v.id === vehicleId) || null;

  async function handleSubmit() {
    if (!vehicleId) { Alert.alert('Pick a vehicle', 'Choose which car you need.'); return; }
    if (!destination.trim()) { Alert.alert('Add a destination', 'Where is the car going?'); return; }
    setSubmitting(true);
    try {
      const body = {
        id: `booking-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        vehicle_id: vehicleId,
        vehicle_name: vehicle ? `${vehicle.make} ${vehicle.model}` : '',
        driver_id: user?.id || null,
        driver_name: user?.name || user?.username || 'Unknown',
        start_time: start.toISOString(),
        duration_minutes: duration,
        destination: destination.trim(),
        created_at: new Date().toISOString(),
      };
      const resp = await fetch(`${SERVER_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || 'Failed to save'); }
      onSaved?.(); onClose();
      // reset
      setVehicleId(null); setStart(new Date()); setDuration(120); setDestination('');
    } catch (e) { Alert.alert('Error', e.message); } finally { setSubmitting(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Book a Car</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}><X size={20} color="#000" /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Vehicle</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setVehiclePickerOpen(o => !o)} activeOpacity={0.7}>
            <Text style={[styles.dropdownText, !vehicle && { color: '#bbb' }]}>
              {vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.licensePlate}` : 'Select vehicle'}
            </Text>
            <ChevronDown size={18} color="#888" />
          </TouchableOpacity>
          {vehiclePickerOpen && (
            <View style={styles.dropdownList}>
              {vehicles.map(v => (
                <TouchableOpacity key={v.id} style={styles.dropdownItem} onPress={() => { setVehicleId(v.id); setVehiclePickerOpen(false); }}>
                  <Text style={styles.dropdownItemText}>{v.make} {v.model} · {v.licensePlate}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>When</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
            <Text style={styles.dropdownText}>{fmtWhen(start.toISOString())}</Text>
            <Clock size={16} color="#888" />
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={start}
              mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
              onChange={(e, d) => { setShowPicker(Platform.OS === 'ios'); if (d) setStart(d); }}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
            />
          )}

          <Text style={styles.label}>For how long</Text>
          <View style={styles.chipRow}>
            {DURATIONS.map(d => (
              <TouchableOpacity key={d.min} onPress={() => setDuration(d.min)} style={[styles.chip, duration === d.min && styles.chipActive]} activeOpacity={0.7}>
                <Text style={[styles.chipText, duration === d.min && styles.chipTextActive]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Destination</Text>
          <TextInput style={styles.input} value={destination} onChangeText={setDestination} placeholder="Where is the car going?" placeholderTextColor="#bbb" />

          <TouchableOpacity style={[styles.primaryBtn, (submitting || !vehicleId || !destination.trim()) && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting || !vehicleId || !destination.trim()} activeOpacity={0.85}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Booking</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function BookingsScreen() {
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const { vehicles, fetchVehicles } = useVehicleStore();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      const resp = await fetch(`${SERVER_URL}/api/bookings`, { headers: { Authorization: `Bearer ${token}` } });
      const data = resp.ok ? await resp.json() : [];
      setBookings(Array.isArray(data) ? data : []);
    } catch { /* ignore */ } finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { load(); fetchVehicles(); }, [load, fetchVehicles]));

  async function remove(id) {
    try {
      await fetch(`${SERVER_URL}/api/bookings/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      load();
    } catch { /* ignore */ }
  }

  const sorted = [...bookings].sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0));
  const now = Date.now();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Bookings</Text>
            <Text style={styles.headerSub}>Who needs which car, when, and where</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
            <Plus size={18} color="#fff" />
            <Text style={styles.addBtnText}>Book</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {loading ? (
          <View style={styles.empty}><ActivityIndicator color="#888" /></View>
        ) : sorted.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptyHint}>Tap Book to reserve a car.</Text>
          </View>
        ) : (
          sorted.map(b => {
            const past = b.start_time && new Date(b.start_time).getTime() < now;
            const mine = b.driver_id === user?.id;
            return (
              <View key={b.id} style={[styles.card, past && { opacity: 0.55 }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.rowLeft}><Car size={16} color="#000" /><Text style={styles.cardTitle}>{b.vehicle_name || 'Vehicle'}</Text></View>
                  {mine ? (
                    <TouchableOpacity onPress={() => remove(b.id)} hitSlop={6}><Trash2 size={16} color="#c4001a" /></TouchableOpacity>
                  ) : null}
                </View>
                <View style={styles.row}><User size={14} color="#666" /><Text style={styles.rowText}>{b.driver_name || 'Unknown'}</Text></View>
                <View style={styles.row}><Clock size={14} color="#0061bd" /><Text style={styles.rowText}>{fmtWhen(b.start_time)} · {fmtDuration(b.duration_minutes)}</Text></View>
                <View style={styles.row}><MapPin size={14} color="#c4001a" /><Text style={styles.rowText} numberOfLines={2}>{b.destination || '—'}</Text></View>
              </View>
            );
          })
        )}
      </ScrollView>

      <NewBookingModal visible={showAdd} onClose={() => setShowAdd(false)} vehicles={vehicles} user={user} token={token} onSaved={load} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ececec' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#000' },
  headerSub: { fontSize: 13, color: '#888', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#444' },
  emptyHint: { fontSize: 13, color: '#888', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#ececec' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#000' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  rowText: { fontSize: 13, color: '#444', flex: 1 },
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
  label: { fontSize: 13, color: '#666', fontWeight: '600', marginBottom: 6, marginTop: 14 },
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 13 },
  dropdownText: { fontSize: 15, color: '#111' },
  dropdownList: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, marginTop: 6, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  dropdownItemText: { fontSize: 14, color: '#111' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 13, fontSize: 15, color: '#111' },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#f2f2f2' },
  chipActive: { backgroundColor: '#000' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },
  primaryBtn: { backgroundColor: '#000', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
