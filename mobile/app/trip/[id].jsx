import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, Modal, Platform, KeyboardAvoidingView,
  FlatList, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft, Plus, Trash2, X, User, Users, MapPin,
  Car, Hash, Calendar, FileText, Edit3, Check, Star,
  CircleCheck, Diamond, Crown,
} from 'lucide-react-native';
import { useTripStore, getPassengerName, isPassengerActive, isTripComplete } from '../../src/store/tripStore';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { usePassengerStore } from '../../src/store/passengerStore';
import { getCarImage } from '../../src/config/carImages';
import { useLayout } from '../../src/hooks/useLayout';
import { useTheme } from '../../src/store/themeStore';

const SEAT_MAP = {
  'Sprinter': 3, 'S-Class': 5, 'S Class': 5, 'GLE': 7,
  'V-Class': 8, 'V Class': 8, 'Range': 7, 'Sport': 7, 'Insignia': 5,
  'Ibiza': 5,
};
function getSeatsForModel(model) {
  if (!model) return 4;
  for (const key of Object.keys(SEAT_MAP)) {
    if (model.includes(key)) return SEAT_MAP[key];
  }
  return 4;
}

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
        <Text style={plateStyles.gbFlag}>GB</Text>
        <Text style={plateStyles.gbText}>GB</Text>
      </View>
      <Text style={plateStyles.plateText}>{registration}</Text>
    </View>
  );
}

const plateStyles = StyleSheet.create({
  plate: {
    flexDirection: 'row',
    alignSelf: 'center',
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

/* -- Driver Selection Modal -- */
function DriverPickerModal({ visible, onClose, onSelect, currentDriver }) {
  const { passengers } = usePassengerStore();
  const th = useTheme();
  const drivers = passengers.filter((p) => p.isDriver).map((p) => p.name);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={driverModalStyles.overlay}>
        <View style={[driverModalStyles.sheet, { backgroundColor: th.card }]}>
          <View style={driverModalStyles.header}>
            <Text style={[driverModalStyles.headerTitle, { color: th.text }]}>Assign Driver</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={th.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={driverModalStyles.list} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* None option to unassign */}
            <TouchableOpacity
              style={[
                driverModalStyles.driverRow,
                { backgroundColor: th.inputBg, borderColor: th.border },
                !currentDriver && driverModalStyles.driverRowSelected,
              ]}
              activeOpacity={0.6}
              onPress={() => { onSelect(''); onClose(); }}
            >
              <Text style={[
                driverModalStyles.driverName,
                { color: th.text },
                !currentDriver && driverModalStyles.driverNameSelected,
              ]}>None</Text>
              {!currentDriver && <Check size={16} color={th.text} />}
            </TouchableOpacity>
            {drivers.map((name) => (
              <TouchableOpacity
                key={name}
                style={[
                  driverModalStyles.driverRow,
                  { backgroundColor: th.inputBg, borderColor: th.border },
                  currentDriver === name && driverModalStyles.driverRowSelected,
                ]}
                activeOpacity={0.6}
                onPress={() => { onSelect(name); onClose(); }}
              >
                <Text style={[
                  driverModalStyles.driverName,
                  { color: th.text },
                  currentDriver === name && driverModalStyles.driverNameSelected,
                ]}>{name}</Text>
                {currentDriver === name && <Check size={16} color={th.text} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const driverModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  list: {
    paddingHorizontal: 24,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  driverRowSelected: {
    backgroundColor: '#f0f0f0',
    borderColor: '#000',
  },
  driverName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  driverNameSelected: {
    fontWeight: '700',
  },
});

/* -- Trip-Level Passenger Modal (uses MASTER passenger list) -- */
function TripPassengerModal({ visible, onClose, trip }) {
  const {
    addTripPassenger, removeTripPassenger, toggleTripPassenger,
  } = useTripStore();
  const { passengers: masterPassengers, addPassenger: addMasterPassenger } = usePassengerStore();
  const th = useTheme();
  const [input, setInput] = useState('');
  const [newIsVip, setNewIsVip] = useState(false);

  const tripPassengers = trip.passengers || [];
  const activeCount = tripPassengers.filter((p) => p.active).length;
  const totalCount = tripPassengers.length;

  // Master passengers not yet added to the trip-level passenger list
  const existingNames = new Set(tripPassengers.map((p) => p.name));

  // Build a map for VIP/driver lookup from master
  const masterMap = {};
  masterPassengers.forEach((p) => { masterMap[p.name] = p; });

  // Available master passengers (not yet in this trip)
  const availableMaster = masterPassengers.filter((p) => !existingNames.has(p.name));

  const handleAdd = () => {
    const name = input.trim();
    if (!name) return;
    // Also add to master list if not already there
    if (!masterMap[name]) {
      addMasterPassenger(name, false, newIsVip);
    }
    addTripPassenger(trip.id, name, false);
    setInput('');
    setNewIsVip(false);
  };

  const handleAddMasterPassenger = (passenger) => {
    addTripPassenger(trip.id, passenger.name, passenger.isDriver);
  };

  const handleRemove = (name) => {
    Alert.alert('Remove Passenger', `Remove ${name} from the journey?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeTripPassenger(trip.id, name) },
    ]);
  };

  const handleToggle = (name) => {
    toggleTripPassenger(trip.id, name);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tripPaxStyles.overlay}
      >
        <View style={[tripPaxStyles.sheet, { backgroundColor: th.card }]}>
          {/* Header */}
          <View style={tripPaxStyles.header}>
            <Text style={[tripPaxStyles.headerTitle, { color: th.text }]}>Journey Passengers</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={th.text} />
            </TouchableOpacity>
          </View>

          {/* Count */}
          <View style={tripPaxStyles.countRow}>
            <Text style={[tripPaxStyles.countText, { color: th.subtext }]}>{activeCount} / {totalCount} active</Text>
          </View>

          {/* Subtitle */}
          <Text style={[tripPaxStyles.subtitle, { color: th.subtext }]}>All drivers are passengers; not all passengers are drivers</Text>

          <ScrollView style={tripPaxStyles.listScroll} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Group passengers into Drivers / Passengers / VIP */}
            {(() => {
              const drivers = [];
              const passengers = [];
              const vips = [];

              tripPassengers.forEach((p) => {
                const master = masterMap[p.name];
                const isVip = master?.isVip || false;
                const isDriver = p.isDriver || master?.isDriver || false;
                const item = { ...p, isVip, isDriver };
                if (isVip) vips.push(item);
                else if (isDriver) drivers.push(item);
                else passengers.push(item);
              });

              const renderRow = (p) => (
                <View
                  key={p.name}
                  style={[
                    tripPaxStyles.passengerRow,
                    { backgroundColor: th.inputBg, borderColor: th.border },
                    !p.active && tripPaxStyles.passengerRowInactive,
                    p.isVip && tripPaxStyles.passengerRowVip,
                  ]}
                >
                  {p.isVip ? (
                    <Diamond size={14} color="#9333ea" fill="#9333ea" style={{ marginRight: 6 }} />
                  ) : p.isDriver ? (
                    <Star size={14} color="#f59e0b" fill="#f59e0b" style={{ marginRight: 6 }} />
                  ) : (
                    <User size={14} color={th.subtext} style={{ marginRight: 6 }} />
                  )}
                  <View style={tripPaxStyles.passengerInfo}>
                    <Text
                      style={[tripPaxStyles.passengerName, { color: th.text }, !p.active && tripPaxStyles.passengerNameInactive]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                  </View>
                  <Switch
                    value={p.active}
                    onValueChange={() => handleToggle(p.name)}
                    trackColor={{ false: '#ddd', true: '#000' }}
                    thumbColor="#fff"
                    style={{ transform: [{ scale: 0.8 }] }}
                  />
                  {!p.isDriver && (
                    <TouchableOpacity
                      onPress={() => handleRemove(p.name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={tripPaxStyles.removeBtn}
                    >
                      <X size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              );

              return (
                <>
                  {/* Drivers */}
                  <View style={tripPaxStyles.groupHeader}>
                    <Star size={14} color="#f59e0b" fill="#f59e0b" />
                    <Text style={[tripPaxStyles.groupTitle, { color: th.subtext }]}>Drivers</Text>
                    <Text style={[tripPaxStyles.groupCount, { color: th.subtext }]}>{drivers.filter(d => d.active).length}/{drivers.length}</Text>
                  </View>
                  {drivers.length === 0 ? (
                    <Text style={[tripPaxStyles.emptyText, { color: th.subtext }]}>No drivers</Text>
                  ) : drivers.map(renderRow)}

                  {/* Passengers */}
                  <View style={[tripPaxStyles.groupHeader, { marginTop: 16 }]}>
                    <User size={14} color={th.subtext} />
                    <Text style={[tripPaxStyles.groupTitle, { color: th.subtext }]}>Passengers</Text>
                    <Text style={[tripPaxStyles.groupCount, { color: th.subtext }]}>{passengers.filter(d => d.active).length}/{passengers.length}</Text>
                  </View>
                  {passengers.length === 0 ? (
                    <Text style={[tripPaxStyles.emptyText, { color: th.subtext }]}>No passengers</Text>
                  ) : passengers.map(renderRow)}

                  {/* VIP */}
                  <View style={[tripPaxStyles.groupHeader, { marginTop: 16 }]}>
                    <Diamond size={14} color="#9333ea" fill="#9333ea" />
                    <Text style={[tripPaxStyles.groupTitle, { color: '#9333ea' }]}>VIP Guests</Text>
                    <Text style={[tripPaxStyles.groupCount, { color: th.subtext }]}>{vips.filter(d => d.active).length}/{vips.length}</Text>
                  </View>
                  {vips.length === 0 ? (
                    <Text style={[tripPaxStyles.emptyText, { color: th.subtext }]}>No VIP guests added</Text>
                  ) : vips.map(renderRow)}
                </>
              );
            })()}

            {/* Add from master list section — grouped */}
            {availableMaster.length > 0 && (() => {
              const availDrivers = availableMaster.filter(p => p.isDriver && !p.isVip);
              const availPassengers = availableMaster.filter(p => !p.isDriver && !p.isVip);
              const availVips = availableMaster.filter(p => p.isVip);

              const renderChips = (list, icon) => (
                <View style={tripPaxStyles.driverChips}>
                  {list.map((p) => (
                    <TouchableOpacity
                      key={p.name}
                      style={[
                        tripPaxStyles.driverChip,
                        p.isVip && tripPaxStyles.vipChip,
                      ]}
                      activeOpacity={0.6}
                      onPress={() => handleAddMasterPassenger(p)}
                    >
                      {icon}
                      <Text style={tripPaxStyles.driverChipText}>{p.name}</Text>
                      <Plus size={12} color="#888" />
                    </TouchableOpacity>
                  ))}
                </View>
              );

              return (
                <View style={tripPaxStyles.addDriversSection}>
                  {availDrivers.length > 0 && (
                    <>
                      <View style={[tripPaxStyles.groupHeader, { marginTop: 0 }]}>
                        <Star size={12} color="#f59e0b" fill="#f59e0b" />
                        <Text style={[tripPaxStyles.addGroupLabel, { color: th.subtext }]}>Drivers</Text>
                      </View>
                      {renderChips(availDrivers, <Star size={12} color="#f59e0b" fill="#f59e0b" />)}
                    </>
                  )}
                  {availPassengers.length > 0 && (
                    <>
                      <View style={[tripPaxStyles.groupHeader, { marginTop: 12 }]}>
                        <User size={12} color={th.subtext} />
                        <Text style={[tripPaxStyles.addGroupLabel, { color: th.subtext }]}>Passengers</Text>
                      </View>
                      {renderChips(availPassengers, <User size={12} color="#888" />)}
                    </>
                  )}
                  {availVips.length > 0 && (
                    <>
                      <View style={[tripPaxStyles.groupHeader, { marginTop: 12 }]}>
                        <Diamond size={12} color="#9333ea" fill="#9333ea" />
                        <Text style={[tripPaxStyles.addGroupLabel, { color: '#9333ea' }]}>VIP Guests</Text>
                      </View>
                      {renderChips(availVips, <Diamond size={12} color="#9333ea" fill="#9333ea" />)}
                    </>
                  )}
                </View>
              );
            })()}
          </ScrollView>

          {/* Add passenger input */}
          <View style={[tripPaxStyles.addRow, { borderTopColor: th.border }]}>
            <TextInput
              style={[tripPaxStyles.addInput, { backgroundColor: th.inputBg, color: th.text, borderColor: th.border }]}
              value={input}
              onChangeText={setInput}
              placeholder="Add new passenger..."
              placeholderTextColor={th.subtext}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[tripPaxStyles.vipToggle, { backgroundColor: th.inputBg, borderColor: th.border }, newIsVip && tripPaxStyles.vipToggleActive]}
              onPress={() => setNewIsVip(!newIsVip)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Diamond size={14} color={newIsVip ? '#9333ea' : '#ccc'} fill={newIsVip ? '#9333ea' : 'transparent'} />
            </TouchableOpacity>
            <TouchableOpacity style={tripPaxStyles.addBtn} onPress={handleAdd}>
              <Text style={tripPaxStyles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const tripPaxStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    marginRight: 12,
  },
  countRow: {
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  subtitle: {
    paddingHorizontal: 24,
    marginBottom: 16,
    fontSize: 12,
    fontStyle: 'italic',
    color: '#aaa',
  },
  listScroll: {
    paddingHorizontal: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingTop: 4,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  groupCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#aaa',
  },
  emptyText: {
    fontSize: 13,
    color: '#ccc',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  passengerRowInactive: {
    backgroundColor: '#f5f5f5',
    opacity: 0.5,
  },
  passengerRowVip: {
    backgroundColor: '#faf5ff',
    borderColor: '#e9d5ff',
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  passengerNameInactive: {
    color: '#999',
  },
  driverLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
    marginTop: 1,
  },
  vipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9333ea',
    marginTop: 1,
  },
  removeBtn: {
    marginLeft: 8,
    padding: 4,
  },
  addDriversSection: {
    marginTop: 20,
  },
  addGroupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#aaa',
    letterSpacing: 1,
    marginBottom: 10,
  },
  driverChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  driverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  vipChip: {
    backgroundColor: '#faf5ff',
    borderColor: '#e9d5ff',
  },
  driverChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  addInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#000',
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  vipToggle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  vipToggleActive: {
    backgroundColor: '#faf5ff',
    borderColor: '#e9d5ff',
  },
  addBtn: {
    backgroundColor: '#000',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

/* -- Per-Vehicle Passenger Assignment Modal -- */
function VehiclePassengerModal({ visible, onClose, tripVehicle, fleetVehicle, trip }) {
  const {
    assignPassengerToVehicle, unassignPassengerFromVehicle,
  } = useTripStore();
  const { passengers: masterPassengers } = usePassengerStore();
  const th = useTheme();

  const vehicleName = fleetVehicle
    ? `${fleetVehicle.make} ${fleetVehicle.model}`
    : 'Unknown Vehicle';

  const tripPassengers = (trip.passengers || []).filter((p) => p.active);
  const vehiclePassengers = tripVehicle.passengers || [];
  const seatsTotal = tripVehicle.seats || 4;

  // Build master map for VIP lookup
  const masterMap = {};
  masterPassengers.forEach((p) => { masterMap[p.name] = p; });

  // Get names assigned to this vehicle
  const assignedNames = new Set(
    vehiclePassengers.map((pName) => typeof pName === 'string' ? pName : pName?.name)
  );
  const assignedCount = assignedNames.size;

  const handleToggleAssign = (name) => {
    if (assignedNames.has(name)) {
      unassignPassengerFromVehicle(trip.id, tripVehicle.vehicleId, name);
    } else {
      if (assignedCount >= seatsTotal) {
        Alert.alert('Full', `This vehicle only has ${seatsTotal} seats.`);
        return;
      }
      assignPassengerToVehicle(trip.id, tripVehicle.vehicleId, name);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={vPaxStyles.overlay}
      >
        <View style={[vPaxStyles.sheet, { backgroundColor: th.card }]}>
          {/* Header */}
          <View style={vPaxStyles.header}>
            <Text style={[vPaxStyles.headerTitle, { color: th.text }]} numberOfLines={1}>
              Passengers - {vehicleName}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={th.text} />
            </TouchableOpacity>
          </View>

          {/* Seat counter */}
          <View style={vPaxStyles.seatCounter}>
            <Text style={[vPaxStyles.seatCounterText, { color: th.subtext }]}>
              {assignedCount} / {seatsTotal} seats
            </Text>
          </View>

          <ScrollView style={vPaxStyles.listScroll} contentContainerStyle={{ paddingBottom: 20 }}>
            {tripPassengers.length === 0 ? (
              <Text style={[vPaxStyles.emptyText, { color: th.subtext }]}>No active journey passengers. Add passengers to the journey first.</Text>
            ) : (
              tripPassengers.map((tp) => {
                const isAssigned = assignedNames.has(tp.name);
                const isFull = assignedCount >= seatsTotal && !isAssigned;
                const master = masterMap[tp.name];
                const isVip = master?.isVip || false;
                return (
                  <TouchableOpacity
                    key={tp.name}
                    style={[
                      vPaxStyles.passengerRow,
                      { backgroundColor: th.inputBg, borderColor: th.border },
                      isAssigned && vPaxStyles.passengerRowAssigned,
                      isFull && vPaxStyles.passengerRowDisabled,
                      isVip && !isAssigned && vPaxStyles.passengerRowVip,
                      isVip && isAssigned && vPaxStyles.passengerRowVipAssigned,
                    ]}
                    activeOpacity={0.6}
                    onPress={() => handleToggleAssign(tp.name)}
                    disabled={isFull}
                  >
                    {isVip ? (
                      <Diamond size={14} color="#9333ea" fill="#9333ea" style={{ marginRight: 6 }} />
                    ) : tp.isDriver ? (
                      <Star size={14} color="#f59e0b" fill="#f59e0b" style={{ marginRight: 6 }} />
                    ) : null}
                    <Text
                      style={[
                        vPaxStyles.passengerName,
                        !isAssigned && !isVip && { color: th.text },
                        isFull && !isAssigned && vPaxStyles.passengerNameDisabled,
                      ]}
                      numberOfLines={1}
                    >
                      {tp.name}
                    </Text>
                    {isVip && (
                      <Text style={vPaxStyles.vipBadge}>VIP</Text>
                    )}
                    {tp.isDriver && (
                      <Text style={vPaxStyles.driverBadge}>Driver</Text>
                    )}
                    <View style={[vPaxStyles.checkbox, isAssigned && vPaxStyles.checkboxChecked]}>
                      {isAssigned && <Check size={14} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const vPaxStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    marginRight: 12,
  },
  seatCounter: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  seatCounterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  listScroll: {
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 13,
    color: '#ccc',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  passengerRowAssigned: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  passengerRowVip: {
    backgroundColor: '#faf5ff',
    borderColor: '#e9d5ff',
  },
  passengerRowVipAssigned: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  passengerRowDisabled: {
    opacity: 0.4,
  },
  passengerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  passengerNameDisabled: {
    color: '#999',
  },
  vipBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9333ea',
    marginRight: 8,
  },
  driverBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
    marginRight: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
});

/* -- Legacy Passenger Management Modal (kept for backwards compat) -- */
function PassengerModal({ visible, onClose, tripVehicle, fleetVehicle, tripId }) {
  const {
    addPassenger, removePassenger, togglePassenger,
  } = useTripStore();
  const th = useTheme();
  const [input, setInput] = useState('');

  const vehicleName = fleetVehicle
    ? `${fleetVehicle.make} ${fleetVehicle.model}`
    : 'Unknown Vehicle';

  const passengers = tripVehicle.passengers || [];
  const driverName = tripVehicle.driver;
  const seatsTotal = tripVehicle.seats || 4;
  // Count active passengers + driver for seat counter
  const activePassengerCount = passengers.filter((p) => isPassengerActive(p)).length;
  const seatsFilled = activePassengerCount + (driverName ? 1 : 0);

  const handleAdd = () => {
    const name = input.trim();
    if (!name) return;
    if (passengers.length >= seatsTotal) {
      Alert.alert('Full', 'No remaining seats. Increase seat count first.');
      return;
    }
    addPassenger(tripId, tripVehicle.vehicleId, name);
    setInput('');
  };

  const handleRemove = (index) => {
    const name = getPassengerName(passengers[index]);
    Alert.alert('Remove Passenger', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removePassenger(tripId, tripVehicle.vehicleId, index) },
    ]);
  };

  const handleToggle = (index) => {
    togglePassenger(tripId, tripVehicle.vehicleId, index);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={paxStyles.overlay}
      >
        <View style={[paxStyles.sheet, { backgroundColor: th.card }]}>
          {/* Header */}
          <View style={paxStyles.header}>
            <Text style={[paxStyles.headerTitle, { color: th.text }]} numberOfLines={1}>
              Passengers - {vehicleName}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={th.text} />
            </TouchableOpacity>
          </View>

          {/* Seat counter */}
          <View style={paxStyles.seatCounter}>
            <Text style={[paxStyles.seatCounterText, { color: th.subtext }]}>
              {seatsFilled} / {seatsTotal} seats filled
            </Text>
          </View>

          <ScrollView style={paxStyles.listScroll} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Driver section */}
            {driverName ? (
              <View style={paxStyles.driverSection}>
                <Text style={[paxStyles.sectionLabel, { color: th.subtext }]}>DRIVER</Text>
                <View style={paxStyles.driverRow}>
                  <Star size={16} color="#f59e0b" fill="#f59e0b" />
                  <Text style={paxStyles.driverName}>{driverName}</Text>
                </View>
              </View>
            ) : (
              <View style={paxStyles.driverSection}>
                <Text style={[paxStyles.sectionLabel, { color: th.subtext }]}>DRIVER</Text>
                <Text style={[paxStyles.noDriver, { color: th.subtext }]}>No driver assigned</Text>
              </View>
            )}

            {/* Passenger list */}
            <Text style={[paxStyles.sectionLabel, { marginTop: 16, color: th.subtext }]}>PASSENGERS</Text>
            {passengers.length === 0 ? (
              <Text style={[paxStyles.emptyText, { color: th.subtext }]}>No passengers yet</Text>
            ) : (
              passengers.map((p, i) => {
                const name = getPassengerName(p);
                const active = isPassengerActive(p);
                return (
                  <View
                    key={i}
                    style={[paxStyles.passengerRow, { backgroundColor: th.inputBg, borderColor: th.border }, !active && paxStyles.passengerRowInactive]}
                  >
                    <Text
                      style={[paxStyles.passengerName, { color: th.text }, !active && paxStyles.passengerNameInactive]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                    <Switch
                      value={active}
                      onValueChange={() => handleToggle(i)}
                      trackColor={{ false: '#ddd', true: '#000' }}
                      thumbColor="#fff"
                      style={{ transform: [{ scale: 0.8 }] }}
                    />
                    <TouchableOpacity
                      onPress={() => handleRemove(i)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={paxStyles.removeBtn}
                    >
                      <X size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Add passenger input */}
          <View style={[paxStyles.addRow, { borderTopColor: th.border }]}>
            <TextInput
              style={[paxStyles.addInput, { backgroundColor: th.inputBg, color: th.text, borderColor: th.border }]}
              value={input}
              onChangeText={setInput}
              placeholder="Add passenger name..."
              placeholderTextColor={th.subtext}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity style={paxStyles.addBtn} onPress={handleAdd}>
              <Text style={paxStyles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const paxStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    marginRight: 12,
  },
  seatCounter: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  seatCounterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  listScroll: {
    paddingHorizontal: 24,
  },
  driverSection: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#aaa',
    letterSpacing: 1,
    marginBottom: 8,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  noDriver: {
    fontSize: 13,
    color: '#ccc',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#ccc',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  passengerRowInactive: {
    backgroundColor: '#f5f5f5',
    opacity: 0.5,
  },
  passengerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  passengerNameInactive: {
    color: '#999',
  },
  removeBtn: {
    marginLeft: 8,
    padding: 4,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  addInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#000',
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  addBtn: {
    backgroundColor: '#000',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

function VehicleCard({ tripVehicle, fleetVehicle, tripId, trip }) {
  const {
    updateTripVehicle, removeVehicleFromTrip, completeTripVehicle,
  } = useTripStore();
  const { passengers: masterPassengers } = usePassengerStore();
  const th = useTheme();

  const [driverModalVisible, setDriverModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState(tripVehicle.departureLocation);
  const [passengerModalVisible, setPassengerModalVisible] = useState(false);

  const carImage = fleetVehicle ? getCarImage(fleetVehicle.imageId) : null;
  const vehicleName = fleetVehicle
    ? `${fleetVehicle.make} ${fleetVehicle.model}`
    : 'Unknown Vehicle';

  const isCompleted = tripVehicle.completed === true;

  // Build master map for VIP lookup
  const masterMap = {};
  masterPassengers.forEach((p) => { masterMap[p.name] = p; });

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

  const handleSelectDriver = (driverName) => {
    updateTripVehicle(tripId, tripVehicle.vehicleId, { driver: driverName });
  };

  const saveLocation = () => {
    updateTripVehicle(tripId, tripVehicle.vehicleId, { departureLocation: locationInput.trim() });
    setEditingLocation(false);
  };

  const handleMarkComplete = () => {
    Alert.alert(
      'Mark Complete',
      `Mark ${vehicleName} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => completeTripVehicle(tripId, tripVehicle.vehicleId),
        },
      ]
    );
  };

  const vehiclePassengers = tripVehicle.passengers || [];
  const assignedCount = vehiclePassengers.length;
  const seatsTotal = tripVehicle.seats || 4;

  // Resolve trip-level passenger info for assigned names
  const tripPassengerMap = {};
  (trip.passengers || []).forEach((p) => { tripPassengerMap[p.name] = p; });

  return (
    <View style={[styles.vehicleCard, { backgroundColor: th.card, borderColor: th.border }, isCompleted && styles.vehicleCardCompleted]}>
      {/* Completed badge */}
      {isCompleted && (
        <View style={styles.completedVehicleBadge}>
          <CircleCheck size={14} color="#16a34a" />
          <Text style={styles.completedVehicleBadgeText}>Completed</Text>
        </View>
      )}

      {/* Vehicle header - image centred on top, name centred below */}
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleImageBox}>
          {carImage ? (
            <Image
              source={carImage}
              style={[styles.vehicleImage, isCompleted && { opacity: 0.4 }]}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.vehicleImageFallback}>
              <Car size={22} color={th.subtext} />
            </View>
          )}
        </View>
        {!isCompleted && (
          <TouchableOpacity
            onPress={handleRemoveVehicle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.removeVehicleBtn}
          >
            <Trash2 size={18} color="#ccc" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.vehicleName, { color: th.text }, isCompleted && styles.textGreyed]}>{vehicleName}</Text>
      {fleetVehicle?.licensePlate && (
        <View style={styles.plateWrap}>
          <UKPlate registration={fleetVehicle.licensePlate} />
        </View>
      )}

      {/* Editable fields */}
      <View style={styles.fieldSection}>
        {/* Driver - tap to open list */}
        <View style={styles.fieldRow}>
          <View style={[styles.fieldIconWrap, { backgroundColor: th.inputBg }]}>
            <User size={14} color={th.text} />
          </View>
          <Text style={[styles.fieldLabel, { color: th.subtext }]}>Driver</Text>
          {isCompleted ? (
            <View style={styles.fieldValueRow}>
              <Text style={[styles.fieldValue, styles.textGreyed]}>
                {tripVehicle.driver || 'None'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.fieldValueRow} onPress={() => setDriverModalVisible(true)}>
              <Text style={[styles.fieldValue, { color: th.text }, !tripVehicle.driver && styles.fieldPlaceholder]}>
                {tripVehicle.driver || 'Tap to assign'}
              </Text>
              <Edit3 size={13} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>

        {/* Seats - read-only */}
        <View style={styles.fieldRow}>
          <View style={[styles.fieldIconWrap, { backgroundColor: th.inputBg }]}>
            <Hash size={14} color={th.text} />
          </View>
          <Text style={[styles.fieldLabel, { color: th.subtext }]}>Seats</Text>
          <View style={styles.fieldValueRow}>
            <Text style={[styles.fieldValue, { color: th.text }, isCompleted && styles.textGreyed]}>
              {assignedCount}/{seatsTotal} filled
            </Text>
          </View>
        </View>

        {/* Departure Location */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldIconWrap}>
            <MapPin size={14} color="#555" />
          </View>
          <Text style={styles.fieldLabel}>Departure</Text>
          {isCompleted ? (
            <View style={styles.fieldValueRow}>
              <Text style={[styles.fieldValue, styles.textGreyed]}>
                {tripVehicle.departureLocation || 'Not set'}
              </Text>
            </View>
          ) : editingLocation ? (
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

      {/* Passengers - tappable to open vehicle passenger assignment modal */}
      <TouchableOpacity
        style={styles.passengersSection}
        activeOpacity={0.6}
        onPress={() => !isCompleted && setPassengerModalVisible(true)}
        disabled={isCompleted}
      >
        <View style={styles.passengerHeader}>
          <Users size={14} color="#555" />
          <Text style={styles.passengerTitle}>Passengers</Text>
          <Text style={styles.passengerCount}>
            {assignedCount}/{seatsTotal}
          </Text>
          {!isCompleted && (
            <View style={styles.passengerChevron}>
              <Edit3 size={13} color="#ccc" />
            </View>
          )}
        </View>

        {/* Preview of assigned passengers */}
        {vehiclePassengers.length > 0 ? (
          <View style={styles.passengerPreview}>
            {vehiclePassengers.slice(0, 4).map((pName, i) => {
              const name = typeof pName === 'string' ? pName : pName?.name || '';
              const tp = tripPassengerMap[name];
              const isDriver = tp?.isDriver;
              const master = masterMap[name];
              const isVip = master?.isVip || false;
              return (
                <View key={i} style={styles.passengerPreviewRow}>
                  {isVip ? (
                    <Diamond size={10} color="#9333ea" fill="#9333ea" />
                  ) : isDriver ? (
                    <Star size={10} color="#f59e0b" fill="#f59e0b" />
                  ) : (
                    <View style={styles.passengerDot} />
                  )}
                  <Text style={[styles.passengerPreviewName, isCompleted && styles.textGreyed]} numberOfLines={1}>
                    {name}
                  </Text>
                </View>
              );
            })}
            {vehiclePassengers.length > 4 && (
              <Text style={styles.passengerMore}>+{vehiclePassengers.length - 4} more</Text>
            )}
          </View>
        ) : (
          <Text style={styles.passengerEmptyHint}>
            {isCompleted ? 'No passengers were assigned' : 'Tap to assign passengers'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Mark Complete button - only visible if driver is assigned and not yet completed */}
      {!isCompleted && tripVehicle.driver && (
        <TouchableOpacity style={styles.markCompleteBtn} activeOpacity={0.7} onPress={handleMarkComplete}>
          <CircleCheck size={16} color="#fff" />
          <Text style={styles.markCompleteBtnText}>Mark Complete</Text>
        </TouchableOpacity>
      )}

      {/* Driver Selection Modal */}
      <DriverPickerModal
        visible={driverModalVisible}
        onClose={() => setDriverModalVisible(false)}
        onSelect={handleSelectDriver}
        currentDriver={tripVehicle.driver}
      />

      {/* Vehicle Passenger Assignment Modal */}
      <VehiclePassengerModal
        visible={passengerModalVisible}
        onClose={() => setPassengerModalVisible(false)}
        tripVehicle={tripVehicle}
        fleetVehicle={fleetVehicle}
        trip={trip}
      />
    </View>
  );
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { trips, addVehicleToTrip, updateTripVehicle } = useTripStore();
  const { vehicles: fleetVehicles } = useVehicleStore();
  const [vehiclePickerVisible, setVehiclePickerVisible] = useState(false);
  const [tripPassengerModalVisible, setTripPassengerModalVisible] = useState(false);
  const { isUnfolded } = useLayout();
  const { fetchPassengers } = usePassengerStore();

  // Fetch master passenger list from server on mount
  useEffect(() => {
    fetchPassengers();
  }, []);

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
  const tripComplete = isTripComplete(trip);

  const handlePickVehicle = (vehicleId) => {
    const fv = fleetVehicles.find((v) => v.id === vehicleId);
    addVehicleToTrip(trip.id, vehicleId, getSeatsForModel(fv?.model));
    setVehiclePickerVisible(false);
  };

  // Trip-level passenger count (active)
  const tripPassengers = trip.passengers || [];
  const activeTripPassengers = tripPassengers.filter((p) => p.active).length;
  const totalSeats = trip.vehicles.reduce((sum, v) => sum + (v.seats || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={[styles.headerSection, isUnfolded && styles.headerSectionUnfolded]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color="#000" />
          <Text style={styles.backText}>Trips</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.scroll, isUnfolded && styles.scrollUnfolded]} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Trip info card */}
        <View style={[styles.tripInfoCard, isUnfolded && styles.tripInfoCardUnfolded]}>
          {tripComplete && (
            <View style={styles.tripCompletedBadge}>
              <CircleCheck size={14} color="#16a34a" />
              <Text style={styles.tripCompletedBadgeText}>All vehicles completed</Text>
            </View>
          )}
          <Text style={[styles.tripTitle, isUnfolded && styles.tripTitleUnfolded]}>{trip.name}</Text>
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
            <TouchableOpacity
              style={styles.summaryItem}
              activeOpacity={0.6}
              onPress={() => setTripPassengerModalVisible(true)}
            >
              <Text style={styles.summaryNumber}>{activeTripPassengers}</Text>
              <Text style={styles.summaryLabel}>Passenger{activeTripPassengers !== 1 ? 's' : ''}</Text>
            </TouchableOpacity>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{totalSeats}</Text>
              <Text style={styles.summaryLabel}>Total Seats</Text>
            </View>
          </View>
        </View>

        {/* Vehicles section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isUnfolded && styles.sectionTitleUnfolded]}>Vehicles</Text>
          {!tripComplete && (
            <TouchableOpacity
              style={styles.addVehicleBtn}
              activeOpacity={0.7}
              onPress={() => setVehiclePickerVisible(true)}
            >
              <Plus size={16} color="#fff" />
              <Text style={styles.addVehicleBtnText}>Add Vehicle</Text>
            </TouchableOpacity>
          )}
        </View>

        {trip.vehicles.length === 0 ? (
          <View style={styles.emptyVehicles}>
            <Car size={32} color="#ddd" />
            <Text style={styles.emptyVehiclesText}>No vehicles assigned</Text>
            <Text style={styles.emptyVehiclesSub}>Add vehicles from your fleet</Text>
          </View>
        ) : (
          <View style={isUnfolded ? styles.vehicleGridUnfolded : undefined}>
            {trip.vehicles.map((tv) => {
              const fv = fleetVehicles.find((v) => v.id === tv.vehicleId);
              return (
                <View key={tv.vehicleId} style={isUnfolded ? styles.vehicleGridItemUnfolded : undefined}>
                  <VehicleCard
                    tripVehicle={tv}
                    fleetVehicle={fv}
                    tripId={trip.id}
                    trip={trip}
                  />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Trip-Level Passenger Modal */}
      <TripPassengerModal
        visible={tripPassengerModalVisible}
        onClose={() => setTripPassengerModalVisible(false)}
        trip={trip}
      />

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
  headerSectionUnfolded: {
    paddingTop: 20,
    paddingBottom: 10,
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
  scrollUnfolded: { paddingHorizontal: 28 },

  /* Trip info card */
  tripInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  tripInfoCardUnfolded: {
    padding: 24,
  },
  tripCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  tripCompletedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  tripTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  tripTitleUnfolded: {
    fontSize: 28,
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
  sectionTitleUnfolded: { fontSize: 20 },
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

  /* Unfolded 2-column vehicle grid */
  vehicleGridUnfolded: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  vehicleGridItemUnfolded: {
    width: '48%',
  },

  /* Vehicle card */
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  vehicleCardCompleted: {
    backgroundColor: '#fafafa',
    borderColor: '#e0e0e0',
  },
  completedVehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  completedVehicleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  textGreyed: {
    color: '#aaa',
  },
  vehicleHeader: {
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  vehicleImageBox: {
    width: 110,
    height: 72,
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
  removeVehicleBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  vehicleName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 4,
  },
  plateWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },

  /* Editable fields */
  fieldSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    gap: 12,
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
    fontSize: 13,
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

  /* Passengers section (tappable) */
  passengersSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginTop: 12,
  },
  passengerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
  },
  passengerTitle: { fontSize: 13, fontWeight: '700', color: '#555', flex: 1, textAlign: 'center' },
  passengerCount: { fontSize: 12, fontWeight: '600', color: '#888' },
  passengerChevron: {
    marginLeft: 4,
  },
  passengerPreview: {
    gap: 3,
    paddingTop: 4,
    alignItems: 'center',
  },
  passengerPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  passengerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
  },
  passengerPreviewName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  passengerMore: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    textAlign: 'center',
  },
  passengerEmptyHint: {
    fontSize: 12,
    color: '#ccc',
    fontStyle: 'italic',
    paddingTop: 4,
    textAlign: 'center',
  },

  /* Mark Complete button */
  markCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 14,
  },
  markCompleteBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
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
