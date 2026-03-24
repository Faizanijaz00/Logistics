import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Platform, KeyboardAvoidingView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Route, Plus, Calendar, ChevronRight, Trash2, X, Car } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTripStore } from '../../src/store/tripStore';

function formatDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function TripRow({ trip, onPress, onDelete }) {
  const vehicleCount = trip.vehicles?.length || 0;
  const passengerCount = trip.vehicles?.reduce((sum, v) => sum + (v.passengers?.length || 0), 0) || 0;

  return (
    <TouchableOpacity style={styles.tripRow} activeOpacity={0.6} onPress={onPress}>
      <View style={styles.tripIcon}>
        <Route size={20} color="#fff" />
      </View>
      <View style={styles.tripDetails}>
        <Text style={styles.tripName} numberOfLines={1}>{trip.name}</Text>
        <View style={styles.tripMeta}>
          <Calendar size={12} color="#888" />
          <Text style={styles.tripDate}>{formatDate(trip.date)}</Text>
        </View>
        {(vehicleCount > 0 || passengerCount > 0) && (
          <View style={styles.tripStats}>
            {vehicleCount > 0 && (
              <View style={styles.statBadge}>
                <Car size={10} color="#555" />
                <Text style={styles.statText}>{vehicleCount}</Text>
              </View>
            )}
            {passengerCount > 0 && (
              <View style={styles.statBadge}>
                <Text style={styles.statText}>{passengerCount} passenger{passengerCount !== 1 ? 's' : ''}</Text>
              </View>
            )}
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={(e) => {
          e.stopPropagation?.();
          onDelete();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Trash2 size={16} color="#ccc" />
      </TouchableOpacity>
      <ChevronRight size={18} color="#ccc" />
    </TouchableOpacity>
  );
}

export default function JourneysScreen() {
  const router = useRouter();
  const { trips, addTrip, deleteTrip } = useTripStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a trip name.');
      return;
    }
    if (!date.trim()) {
      Alert.alert('Required', 'Please enter a date (e.g. 2026-04-15).');
      return;
    }
    // Validate date format loosely
    const parsed = new Date(date.trim());
    if (isNaN(parsed.getTime())) {
      Alert.alert('Invalid Date', 'Please enter a valid date (YYYY-MM-DD).');
      return;
    }
    const tripId = addTrip({
      name: name.trim(),
      date: parsed.toISOString().split('T')[0],
      description: description.trim(),
    });
    setName('');
    setDate('');
    setDescription('');
    setModalVisible(false);
    router.push(`/trip/${tripId}`);
  };

  const handleDelete = (trip) => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete "${trip.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTrip(trip.id) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Trips</Text>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.7} onPress={() => setModalVisible(true)}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {trips.length === 0 ? (
        <View style={styles.empty}>
          <Route size={48} color="#ddd" />
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptySubtitle}>Tap + to plan your first trip</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 20 }}>
          {trips.map((trip) => (
            <TripRow
              key={trip.id}
              trip={trip}
              onPress={() => router.push(`/trip/${trip.id}`)}
              onDelete={() => handleDelete(trip)}
            />
          ))}
        </ScrollView>
      )}

      {/* Add Trip Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Trip</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Trip Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Airport Run"
              placeholderTextColor="#bbb"
              autoFocus
            />

            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#bbb"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Notes about this trip..."
              placeholderTextColor="#bbb"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.createBtn} activeOpacity={0.7} onPress={handleCreate}>
              <Text style={styles.createBtnText}>Create Trip</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#000' },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1, paddingHorizontal: 20 },

  /* Empty state */
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
  emptySubtitle: { fontSize: 14, color: '#888' },

  /* Trip row */
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  tripIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  tripDetails: { flex: 1 },
  tripName: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 3 },
  tripMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tripDate: { fontSize: 13, color: '#888' },
  tripStats: { flexDirection: 'row', gap: 8, marginTop: 4 },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statText: { fontSize: 11, color: '#555', fontWeight: '600' },
  deleteBtn: {
    padding: 8,
    marginRight: 4,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#000' },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#000',
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  textArea: {
    minHeight: 70,
    paddingTop: 14,
  },
  createBtn: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
