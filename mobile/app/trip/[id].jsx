import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, Modal, Platform, KeyboardAvoidingView,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft, Plus, Trash2, X, User, Users, MapPin,
  Car, Hash, Calendar, FileText, Edit3, Check,
} from 'lucide-react-native';
import { useTripStore } from '../../src/store/tripStore';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { getCarImage } from '../../src/config/carImages';

function formatDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function UKPlate({ registration }) {
  if (!registration) return null;
  return (
    <View style={plateStyles.plate}>
      <View style={plateStyles.gbStrip}>
        <Text style={plateStyles.gbFlag}>🇬🇧</Text>
        <Text style={plateStyles.gbText}>GB</Text>
      </View>
      <Text style={plateStyles.plateText}>{registration}</Text>
    </View>
  );
}

const plateStyles = StyleSheet.create({
  plate: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: '#1a1a1a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gbStrip: {
    backgroundColor: '#003399',
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gbFlag: { fontSize: 9, lineHeight: 10 },
  gbText: { fontSize: 6, color: '#fff', fontWeight: '800', letterSpacing: 0.3 },
  plateText: {
    backgroundColor: '#fff',
    color: '#000',
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    alignSelf: 'center',
  },
});

function VehicleCard({ tripVehicle, fleetVehicle, tripId }) {
  const {
    updateTripVehicle, removeVehicleFromTrip,
    addPassenger, removePassenger,
  } = useTripStore();

  const [editingDriver, setEditingDriver] = useState(false);
  const [driverInput, setDriverInput] = useState(tripVehicle.driver);
  const [editingSeats, setEditingSeats] = useState(false);
  const [seatsInput, setSeatsInput] = useState(String(tripVehicle.seats));
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState(tripVehicle.departureLocation);
  const [passengerInput, setPassengerInput] = useState('');

  const carImage = fleetVehicle ? getCarImage(fleetVehicle.imageId) : null;
  const vehicleName = fleetVehicle
    ? `${fleetVehicle.make} ${fleetVehicle.model}`
    : 'Unknown Vehicle';

  const handleRemoveVehicle = () => {
    Alert.alert(
      'Remove Vehicle',
      `Remove ${vehicleName} from this trip?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeVehicleFromTrip(tripId, tripVehicle.vehicleId) },
      ]
    );
  };

  const saveDriver = () => {
    updateTripVehicle(tripId, tripVehicle.vehicleId, { driver: driverInput.trim() });
    setEditingDriver(false);
  };

  const saveSeats = () => {
    const n = parseInt(seatsInput, 10);
    if (!isNaN(n) && n > 0) {
      updateTripVehicle(tripId, tripVehicle.vehicleId, { seats: n });
    }
    setEditingSeats(false);
  };

  const saveLocation = () => {
    updateTripVehicle(tripId, tripVehicle.vehicleId, { departureLocation: locationInput.trim() });
    setEditingLocation(false);
  };

  const handleAddPassenger = () => {
    const name = passengerInput.trim();
    if (!name) return;
    if (tripVehicle.passengers.length >= tripVehicle.seats) {
      Alert.alert('Full', 'This vehicle has no remaining seats. Increase the seat count first.');
      return;
    }
    addPassenger(tripId, tripVehicle.vehicleId, name);
    setPassengerInput('');
  };

  const handleRemovePassenger = (index, name) => {
    Alert.alert('Remove Passenger', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removePassenger(tripId, tripVehicle.vehicleId, index) },
    ]);
  };

  const seatsFilled = tripVehicle.passengers.length;
  const seatsTotal = tripVehicle.seats;

  return (
    <View style={styles.vehicleCard}>
      {/* Vehicle header */}
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleImageBox}>
          {carImage ? (
            <Image source={carImage} style={styles.vehicleImage} resizeMode="contain" />
          ) : (
            <View style={styles.vehicleImageFallback}>
              <Car size={22} color="#888" />
            </View>
          )}
        </View>
        <View style={styles.vehicleHeaderInfo}>
          <Text style={styles.vehicleName}>{vehicleName}</Text>
          {fleetVehicle?.licensePlate && <UKPlate registration={fleetVehicle.licensePlate} />}
        </View>
        <TouchableOpacity onPress={handleRemoveVehicle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Trash2 size={18} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Editable fields */}
      <View style={styles.fieldSection}>
        {/* Driver */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldIconWrap}>
            <User size={14} color="#555" />
          </View>
          <Text style={styles.fieldLabel}>Driver</Text>
          {editingDriver ? (
            <View style={styles.fieldEditRow}>
              <TextInput
                style={styles.fieldInput}
                value={driverInput}
                onChangeText={setDriverInput}
                placeholder="Driver name"
                placeholderTextColor="#bbb"
                autoFocus
                onSubmitEditing={saveDriver}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={saveDriver} style={styles.fieldSaveBtn}>
                <Check size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.fieldValueRow} onPress={() => { setDriverInput(tripVehicle.driver); setEditingDriver(true); }}>
              <Text style={[styles.fieldValue, !tripVehicle.driver && styles.fieldPlaceholder]}>
                {tripVehicle.driver || 'Tap to assign'}
              </Text>
              <Edit3 size={13} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>

        {/* Seats */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldIconWrap}>
            <Hash size={14} color="#555" />
          </View>
          <Text style={styles.fieldLabel}>Seats</Text>
          {editingSeats ? (
            <View style={styles.fieldEditRow}>
              <TextInput
                style={[styles.fieldInput, { width: 60 }]}
                value={seatsInput}
                onChangeText={setSeatsInput}
                keyboardType="number-pad"
                autoFocus
                onSubmitEditing={saveSeats}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={saveSeats} style={styles.fieldSaveBtn}>
                <Check size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.fieldValueRow} onPress={() => { setSeatsInput(String(tripVehicle.seats)); setEditingSeats(true); }}>
              <Text style={styles.fieldValue}>{seatsFilled}/{seatsTotal} filled</Text>
              <Edit3 size={13} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>

        {/* Departure Location */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldIconWrap}>
            <MapPin size={14} color="#555" />
          </View>
          <Text style={styles.fieldLabel}>Departure</Text>
          {editingLocation ? (
            <View style={styles.fieldEditRow}>
              <TextInput
                style={styles.fieldInput}
                value={locationInput}
                onChangeText={setLocationInput}
                placeholder="Departure location"
                placeholderTextColor="#bbb"
                autoFocus
                onSubmitEditing={saveLocation}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={saveLocation} style={styles.fieldSaveBtn}>
                <Check size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.fieldValueRow} onPress={() => { setLocationInput(tripVehicle.departureLocation); setEditingLocation(true); }}>
              <Text style={[styles.fieldValue, !tripVehicle.departureLocation && styles.fieldPlaceholder]}>
                {tripVehicle.departureLocation || 'Tap to set'}
              </Text>
              <Edit3 size={13} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Passengers */}
      <View style={styles.passengersSection}>
        <View style={styles.passengerHeader}>
          <Users size={14} color="#555" />
          <Text style={styles.passengerTitle}>Passengers</Text>
          <Text style={styles.passengerCount}>{seatsFilled}/{seatsTotal}</Text>
        </View>

        {tripVehicle.passengers.map((p, i) => (
          <View key={i} style={styles.passengerRow}>
            <View style={styles.passengerDot} />
            <Text style={styles.passengerName}>{p}</Text>
            <TouchableOpacity
              onPress={() => handleRemovePassenger(i, p)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={14} color="#ccc" />
            </TouchableOpacity>
          </View>
        ))}

        {seatsFilled < seatsTotal && (
          <View style={styles.addPassengerRow}>
            <TextInput
              style={styles.passengerInput}
              value={passengerInput}
              onChangeText={setPassengerInput}
              placeholder="Add passenger name..."
              placeholderTextColor="#bbb"
              onSubmitEditing={handleAddPassenger}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addPassengerBtn} onPress={handleAddPassenger}>
              <Plus size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { trips, addVehicleToTrip } = useTripStore();
  const { vehicles: fleetVehicles } = useVehicleStore();
  const [vehiclePickerVisible, setVehiclePickerVisible] = useState(false);

  const trip = trips.find((t) => t.id === id);

  if (!trip) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color="#000" />
          <Text style={styles.backText}>Trips</Text>
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.errorText}>Trip not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const assignedVehicleIds = new Set(trip.vehicles.map((v) => v.vehicleId));
  const availableVehicles = fleetVehicles.filter((v) => !assignedVehicleIds.has(v.id));

  const handlePickVehicle = (vehicleId) => {
    addVehicleToTrip(trip.id, vehicleId);
    setVehiclePickerVisible(false);
  };

  const totalPassengers = trip.vehicles.reduce((sum, v) => sum + (v.passengers?.length || 0), 0);
  const totalSeats = trip.vehicles.reduce((sum, v) => sum + (v.seats || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.headerSection}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color="#000" />
          <Text style={styles.backText}>Trips</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Trip info card */}
        <View style={styles.tripInfoCard}>
          <Text style={styles.tripTitle}>{trip.name}</Text>
          <View style={styles.tripMetaRow}>
            <Calendar size={14} color="#888" />
            <Text style={styles.tripDateText}>{formatDate(trip.date)}</Text>
          </View>
          {trip.description ? (
            <View style={styles.descriptionRow}>
              <FileText size={14} color="#888" />
              <Text style={styles.descriptionText}>{trip.description}</Text>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{trip.vehicles.length}</Text>
              <Text style={styles.summaryLabel}>Vehicle{trip.vehicles.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{totalPassengers}</Text>
              <Text style={styles.summaryLabel}>Passenger{totalPassengers !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{totalSeats}</Text>
              <Text style={styles.summaryLabel}>Total Seats</Text>
            </View>
          </View>
        </View>

        {/* Vehicles section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vehicles</Text>
          <TouchableOpacity
            style={styles.addVehicleBtn}
            activeOpacity={0.7}
            onPress={() => setVehiclePickerVisible(true)}
          >
            <Plus size={16} color="#fff" />
            <Text style={styles.addVehicleBtnText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>

        {trip.vehicles.length === 0 ? (
          <View style={styles.emptyVehicles}>
            <Car size={32} color="#ddd" />
            <Text style={styles.emptyVehiclesText}>No vehicles assigned</Text>
            <Text style={styles.emptyVehiclesSub}>Add vehicles from your fleet</Text>
          </View>
        ) : (
          trip.vehicles.map((tv) => {
            const fv = fleetVehicles.find((v) => v.id === tv.vehicleId);
            return (
              <VehicleCard
                key={tv.vehicleId}
                tripVehicle={tv}
                fleetVehicle={fv}
                tripId={trip.id}
              />
            );
          })
        )}
      </ScrollView>

      {/* Vehicle Picker Modal */}
      <Modal visible={vehiclePickerVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Vehicle</Text>
              <TouchableOpacity onPress={() => setVehiclePickerVisible(false)}>
                <X size={22} color="#000" />
              </TouchableOpacity>
            </View>

            {availableVehicles.length === 0 ? (
              <View style={styles.emptyModal}>
                <Text style={styles.emptyModalText}>All fleet vehicles are already assigned to this trip.</Text>
              </View>
            ) : (
              <FlatList
                data={availableVehicles}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => {
                  const img = getCarImage(item.imageId);
                  return (
                    <TouchableOpacity
                      style={styles.pickerRow}
                      activeOpacity={0.6}
                      onPress={() => handlePickVehicle(item.id)}
                    >
                      <View style={styles.pickerImageBox}>
                        {img ? (
                          <Image source={img} style={styles.pickerImage} resizeMode="contain" />
                        ) : (
                          <View style={styles.pickerImageFallback}>
                            <Car size={20} color="#888" />
                          </View>
                        )}
                      </View>
                      <View style={styles.pickerInfo}>
                        <Text style={styles.pickerName}>{item.make} {item.model}</Text>
                        {item.licensePlate && <UKPlate registration={item.licensePlate} />}
                      </View>
                      <Plus size={20} color="#000" />
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: '#888' },

  /* Header */
  headerSection: {
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginLeft: 2,
  },

  scroll: { flex: 1, paddingHorizontal: 20 },

  /* Trip info card */
  tripInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  tripTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  tripMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tripDateText: { fontSize: 14, color: '#888', fontWeight: '500' },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6,
    marginTop: 2,
  },
  descriptionText: { fontSize: 14, color: '#666', flex: 1, lineHeight: 20 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: { fontSize: 22, fontWeight: '800', color: '#000' },
  summaryLabel: { fontSize: 11, color: '#888', fontWeight: '600', marginTop: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: '#f0f0f0' },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  addVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#000',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addVehicleBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  /* Empty vehicles */
  emptyVehicles: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 6,
  },
  emptyVehiclesText: { fontSize: 16, fontWeight: '600', color: '#999' },
  emptyVehiclesSub: { fontSize: 13, color: '#bbb' },

  /* Vehicle card */
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  vehicleImageBox: {
    width: 80,
    height: 52,
    marginRight: 12,
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  vehicleImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  vehicleHeaderInfo: { flex: 1, gap: 4 },
  vehicleName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  /* Editable fields */
  fieldSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    gap: 10,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    width: 70,
  },
  fieldValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldValue: { fontSize: 14, fontWeight: '600', color: '#000' },
  fieldPlaceholder: { color: '#ccc' },
  fieldEditRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#000',
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  fieldSaveBtn: {
    backgroundColor: '#000',
    borderRadius: 6,
    padding: 7,
  },

  /* Passengers */
  passengersSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 12,
  },
  passengerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  passengerTitle: { fontSize: 13, fontWeight: '700', color: '#555', flex: 1 },
  passengerCount: { fontSize: 12, fontWeight: '600', color: '#888' },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 8,
  },
  passengerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
  },
  passengerName: { flex: 1, fontSize: 14, fontWeight: '500', color: '#333' },
  addPassengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  passengerInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  addPassengerBtn: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 10,
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
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#000' },
  emptyModal: { paddingVertical: 30, alignItems: 'center' },
  emptyModalText: { fontSize: 14, color: '#888', textAlign: 'center' },

  /* Picker row */
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  pickerImageBox: {
    width: 70,
    height: 46,
    marginRight: 12,
  },
  pickerImage: {
    width: '100%',
    height: '100%',
  },
  pickerImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  pickerInfo: { flex: 1, gap: 4 },
  pickerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
