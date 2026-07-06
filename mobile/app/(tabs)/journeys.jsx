import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Platform, KeyboardAvoidingView, Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Route, Plus, Calendar, ChevronRight, Trash2, X, Car, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTripStore, isTripComplete } from '../../src/store/tripStore';
import { useVehicleStore } from '../../src/store/vehicleStore';
import { getCarImage } from '../../src/config/carImages';
import DateField from '../../src/components/DateField';
import { useLayout } from '../../src/hooks/useLayout';

function formatDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* -- Helper: resolve car images for a trip's vehicles -- */
function useTripCarImages(trip) {
  const { vehicles: fleetVehicles } = useVehicleStore();
  if (!trip.vehicles?.length) return [];
  return trip.vehicles.map((tv) => {
    const fv = fleetVehicles.find((v) => v.id === tv.vehicleId);
    return fv ? getCarImage(fv.imageId) : null;
  });
}

/* -- Helper: resolve driver names for a trip's vehicles -- */
function useTripDriverNames(trip) {
  if (!trip.vehicles?.length) return [];
  return trip.vehicles.map((tv) => tv.driver || null);
}

/* -- Phone layout trip card -- */
function TripRow({ trip, onPress, onDelete, isPrevious }) {
  const vehicleCount = trip.vehicles?.length || 0;
  const passengerCount = trip.vehicles?.reduce((sum, v) => sum + (v.passengers?.length || 0), 0) || 0;
  const carImages = useTripCarImages(trip);
  const driverNames = useTripDriverNames(trip);
  const hasImages = carImages.some(Boolean);

  return (
    <TouchableOpacity
      style={[styles.tripCard, isPrevious && styles.tripCardPrevious]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Completed badge */}
      {isPrevious && (
        <View style={styles.completedBadge}>
          <CheckCircle size={12} color="#16a34a" />
          <Text style={styles.completedBadgeText}>Completed</Text>
        </View>
      )}

      {/* Car images with driver names */}
      {hasImages && (
        <View style={styles.carRow}>
          {carImages.map((img, i) =>
            img ? (
              <View key={i} style={styles.carThumbCol}>
                <Image source={img} style={styles.carThumb} resizeMode="contain" />
                {driverNames[i] ? (
                  <Text style={[styles.driverNameSmall, isPrevious && styles.textGreyed]} numberOfLines={1}>
                    {driverNames[i]}
                  </Text>
                ) : (
                  <Text style={[styles.noDriverSmall, isPrevious && styles.textGreyed]} numberOfLines={1}>
                    No driver
                  </Text>
                )}
              </View>
            ) : null
          )}
        </View>
      )}

      {/* Content */}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardName, isPrevious && styles.textGreyed]} numberOfLines={2}>{trip.name}</Text>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={15} color="#ccc" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardDateRow}>
          <Calendar size={14} color={isPrevious ? '#aaa' : '#666'} />
          <Text style={[styles.cardDate, isPrevious && styles.textGreyed]}>{formatDate(trip.date)}</Text>
        </View>

        {(vehicleCount > 0 || passengerCount > 0) && (
          <View style={styles.cardStats}>
            {vehicleCount > 0 && (
              <View style={[styles.statBadge, isPrevious && styles.statBadgePrevious]}>
                <Car size={11} color={isPrevious ? '#aaa' : '#555'} />
                <Text style={[styles.statText, isPrevious && styles.textGreyed]}>
                  {vehicleCount} vehicle{vehicleCount !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            {passengerCount > 0 && (
              <View style={[styles.statBadge, isPrevious && styles.statBadgePrevious]}>
                <Text style={[styles.statText, isPrevious && styles.textGreyed]}>
                  {passengerCount} passenger{passengerCount !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* -- Unfolded trip card with floating car images -- */
function UnfoldedTripCard({ trip, onPress, onDelete, isPrevious }) {
  const vehicleCount = trip.vehicles?.length || 0;
  const passengerCount = trip.vehicles?.reduce((sum, v) => sum + (v.passengers?.length || 0), 0) || 0;
  const carImages = useTripCarImages(trip);
  const driverNames = useTripDriverNames(trip);
  const hasImages = carImages.some(Boolean);

  // Calculate how many columns this card spans based on car count
  const carCount = vehicleCount;
  const span = carCount <= 1 ? 1 : carCount === 2 ? 2 : carCount === 3 ? 3 : 4;

  const spanStyle = span === 1
    ? unfoldedStyles.span1
    : span === 2
      ? unfoldedStyles.span2
      : span === 3
        ? unfoldedStyles.span3
        : unfoldedStyles.span4;

  return (
    <View style={spanStyle}>
      <TouchableOpacity
        style={[unfoldedStyles.card, isPrevious && unfoldedStyles.cardPrevious]}
        activeOpacity={0.7}
        onPress={onPress}
      >
        {/* Completed badge */}
        {isPrevious && (
          <View style={unfoldedStyles.completedBadge}>
            <CheckCircle size={11} color="#16a34a" />
            <Text style={unfoldedStyles.completedBadgeText}>Completed</Text>
          </View>
        )}

        {/* Floating car images on top */}
        {hasImages && (
          <View style={unfoldedStyles.carImageRow}>
            {carImages.map((img, i) =>
              img ? (
                <View key={i} style={unfoldedStyles.carImageWrap}>
                  <Image
                    source={img}
                    style={[unfoldedStyles.carImage, isPrevious && { opacity: 0.5 }]}
                    resizeMode="contain"
                  />
                  <View style={unfoldedStyles.groundShadow} />
                  {driverNames[i] ? (
                    <Text style={[unfoldedStyles.driverNameSmall, isPrevious && { color: '#bbb' }]} numberOfLines={1}>
                      {driverNames[i]}
                    </Text>
                  ) : (
                    <Text style={[unfoldedStyles.noDriverSmall, isPrevious && { color: '#ccc' }]} numberOfLines={1}>
                      No driver
                    </Text>
                  )}
                </View>
              ) : (
                <View key={i} style={unfoldedStyles.carImageWrap}>
                  <View style={unfoldedStyles.carFallback}>
                    <Car size={20} color="#aaa" />
                  </View>
                  {driverNames[i] ? (
                    <Text style={unfoldedStyles.driverNameSmall} numberOfLines={1}>
                      {driverNames[i]}
                    </Text>
                  ) : (
                    <Text style={unfoldedStyles.noDriverSmall} numberOfLines={1}>
                      No driver
                    </Text>
                  )}
                </View>
              )
            )}
          </View>
        )}

        {/* Card content */}
        <View style={unfoldedStyles.cardContent}>
          <View style={unfoldedStyles.topRow}>
            <View style={[unfoldedStyles.routeIcon, isPrevious && { backgroundColor: '#aaa' }]}>
              <Route size={14} color="#fff" />
            </View>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash2 size={15} color="#ccc" />
            </TouchableOpacity>
          </View>
          <Text style={[unfoldedStyles.tripName, isPrevious && { color: '#aaa' }]} numberOfLines={2}>
            {trip.name}
          </Text>
          <View style={unfoldedStyles.dateRow}>
            <Calendar size={12} color={isPrevious ? '#bbb' : '#999'} />
            <Text style={[unfoldedStyles.dateText, isPrevious && { color: '#bbb' }]}>
              {formatDate(trip.date)}
            </Text>
          </View>
          {(vehicleCount > 0 || passengerCount > 0) && (
            <View style={unfoldedStyles.statsRow}>
              {vehicleCount > 0 && (
                <View style={[unfoldedStyles.statBadge, isPrevious && { backgroundColor: '#f5f5f5' }]}>
                  <Car size={10} color={isPrevious ? '#aaa' : '#555'} />
                  <Text style={[unfoldedStyles.statText, isPrevious && { color: '#aaa' }]}>{vehicleCount}</Text>
                </View>
              )}
              {passengerCount > 0 && (
                <View style={[unfoldedStyles.statBadge, isPrevious && { backgroundColor: '#f5f5f5' }]}>
                  <Text style={[unfoldedStyles.statText, isPrevious && { color: '#aaa' }]}>{passengerCount} pax</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const unfoldedStyles = StyleSheet.create({
  /* Span widths based on a 4-column grid with 14px gap */
  span1: { width: '23.5%' },
  span2: { width: '48.5%' },
  span3: { width: '73.5%' },
  span4: { width: '100%' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
    overflow: 'visible',
  },
  cardPrevious: {
    backgroundColor: '#fafafa',
    borderColor: '#e0e0e0',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 14,
    marginTop: 10,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
  },
  carImageRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingHorizontal: 8,
    gap: 4,
  },
  carImageWrap: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 140,
  },
  carImage: {
    width: '100%',
    height: 65,
    zIndex: 2,
  },
  groundShadow: {
    width: '60%',
    height: 8,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.07)',
    marginTop: -2,
    zIndex: 1,
  },
  carFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverNameSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
    marginTop: 2,
    textAlign: 'center',
  },
  noDriverSmall: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#bbb',
    marginTop: 2,
    textAlign: 'center',
  },
  cardContent: {
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  dateText: { fontSize: 12, color: '#999' },
  statsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statText: { fontSize: 10, color: '#555', fontWeight: '600' },
});

/* -- Section header for Active / Previous -- */
function SectionHeader({ title, count }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      <View style={styles.sectionCountBadge}>
        <Text style={styles.sectionCountText}>{count}</Text>
      </View>
    </View>
  );
}

export default function JourneysScreen() {
  const router = useRouter();
  const { trips, addTrip, deleteTrip } = useTripStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const { isUnfolded } = useLayout();

  // Split trips into active and previous
  const activeTrips = trips.filter((t) => !isTripComplete(t));
  const previousTrips = trips.filter((t) => isTripComplete(t));

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

  const renderTrips = (tripList, isPrevious) => {
    if (isUnfolded) {
      return (
        <View style={styles.unfoldedGrid}>
          {tripList.map((trip) => (
            <UnfoldedTripCard
              key={trip.id}
              trip={trip}
              onPress={() => router.push(`/trip/${trip.id}`)}
              onDelete={() => handleDelete(trip)}
              isPrevious={isPrevious}
            />
          ))}
        </View>
      );
    }
    return tripList.map((trip) => (
      <TripRow
        key={trip.id}
        trip={trip}
        onPress={() => router.push(`/trip/${trip.id}`)}
        onDelete={() => handleDelete(trip)}
        isPrevious={isPrevious}
      />
    ));
  };

  const hasTrips = trips.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, isUnfolded && styles.headerUnfolded]}>
        <Text style={[styles.title, isUnfolded && styles.titleUnfolded]}>Trips</Text>
        <TouchableOpacity style={styles.addButton} activeOpacity={0.7} onPress={() => setModalVisible(true)}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {!hasTrips ? (
        <View style={[styles.empty, isUnfolded && styles.emptyUnfolded]}>
          <Route size={isUnfolded ? 56 : 48} color="#ddd" />
          <Text style={[styles.emptyTitle, isUnfolded && styles.emptyTitleUnfolded]}>No trips yet</Text>
          <Text style={styles.emptySubtitle}>Tap + to plan your first trip</Text>
        </View>
      ) : (
        <ScrollView
          style={isUnfolded ? styles.scrollUnfolded : styles.scroll}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Active Trips */}
          {activeTrips.length > 0 && (
            <>
              <SectionHeader title="Active Trips" count={activeTrips.length} />
              {renderTrips(activeTrips, false)}
            </>
          )}

          {/* Previous Trips */}
          {previousTrips.length > 0 && (
            <>
              <SectionHeader title="Previous Trips" count={previousTrips.length} />
              {renderTrips(previousTrips, true)}
            </>
          )}
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

            <DateField label="Date" value={date} onChange={setDate} clearable={false} />

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
  headerUnfolded: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#000' },
  titleUnfolded: { fontSize: 32 },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1, paddingHorizontal: 20 },
  scrollUnfolded: { flex: 1, paddingHorizontal: 28 },

  /* Section headers */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
    gap: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  sectionCountBadge: {
    backgroundColor: '#e5e5e5',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
  },

  /* Empty state */
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyUnfolded: {
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
  emptyTitleUnfolded: { fontSize: 24 },
  emptySubtitle: { fontSize: 14, color: '#888' },

  /* Phone trip cards */
  tripCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ebebeb',
    overflow: 'hidden',
  },
  tripCardPrevious: {
    backgroundColor: '#fafafa',
    borderColor: '#e0e0e0',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 16,
    marginTop: 12,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  carRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 4,
  },
  carThumbCol: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 110,
  },
  carThumb: {
    width: 80,
    height: 52,
    flex: 1,
    maxWidth: 110,
  },
  driverNameSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
    marginTop: 2,
    textAlign: 'center',
  },
  noDriverSmall: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#bbb',
    marginTop: 2,
    textAlign: 'center',
  },
  textGreyed: {
    color: '#aaa',
  },
  cardBody: {
    padding: 18,
    alignItems: 'center',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 6,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 20,
    letterSpacing: 0.3,
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  cardDate: {
    fontSize: 15,
    color: '#555',
    fontWeight: '600',
  },
  cardStats: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statBadgePrevious: {
    backgroundColor: '#f5f5f5',
  },
  statText: { fontSize: 11, color: '#555', fontWeight: '600' },

  /* Unfolded flexbox grid */
  unfoldedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingBottom: 20,
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
