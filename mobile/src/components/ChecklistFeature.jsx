// Shared UI for the Maintenance & Inventory features: a per-car list with a
// last-check date + OVERDUE badge, an admin "in rotation" marker, a per-car
// checklist modal (tick items off, complete the check), and a master item
// editor. Driven entirely by a checklist store (see createChecklistStore) so
// both features look and behave identically. Config differences (per-car items,
// bulk import) are passed as props.
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Modal, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Car, Check, Star, Pencil, Plus, Trash2, X, Upload, ChevronRight, ClipboardList } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { useVehicleStore } from '../store/vehicleStore';
import { getCarImage } from '../config/carImages';
import AdminHeader from './AdminHeader';
import SkeletonList from './SkeletonList';

const OVERDUE_DAYS = 7;

function daysSince(iso) {
  if (!iso) return Infinity;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / 86400000;
}

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ChecklistFeature({ store, title, emptyIcon, itemNoun = 'item', perCar = false, showImport = false }) {
  const EmptyIcon = emptyIcon || ClipboardList;
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin';
  const vehicles = useVehicleStore(s => s.vehicles);
  const { summaries, rotationVehicleId, loading, error, setRotation } = store();

  const [refreshing, setRefreshing] = useState(false);
  const [openVehicle, setOpenVehicle] = useState(null); // vehicle whose checklist is open
  const [showEditor, setShowEditor] = useState(false);

  // Zustand actions are stable, so read them off getState() to keep this
  // callback's deps to the (stable) store prop — avoids re-running on renders.
  const load = useCallback(async () => {
    await Promise.all([useVehicleStore.getState().fetchVehicles(), store.getState().fetchOverview()]);
  }, [store]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const summaryFor = (vehicleId) => summaries.find(s => s.vehicle_id === vehicleId);

  async function handleSetRotation(vehicleId) {
    try {
      await setRotation(rotationVehicleId === vehicleId ? null : vehicleId);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  const overdueCount = vehicles.filter(v => daysSince(summaryFor(v.id)?.last_completed_at) >= OVERDUE_DAYS).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AdminHeader
        title={title}
        subtitle={`${vehicles.length} car${vehicles.length === 1 ? '' : 's'} · ${overdueCount} overdue`}
        right={isAdmin ? (
          <TouchableOpacity style={styles.editBtn} onPress={() => setShowEditor(true)} activeOpacity={0.85}>
            <Pencil size={16} color="#000" />
            <Text style={styles.editBtnText}>Items</Text>
          </TouchableOpacity>
        ) : null}
      />

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
        ) : vehicles.length === 0 ? (
          <View style={styles.empty}>
            <EmptyIcon size={48} color="#ccc" />
            <Text style={styles.emptyText}>No cars yet</Text>
            <Text style={styles.emptyHint}>Add vehicles in Fleet first.</Text>
          </View>
        ) : (
          vehicles.map(v => {
            const summary = summaryFor(v.id);
            const last = summary?.last_completed_at;
            const overdue = daysSince(last) >= OVERDUE_DAYS;
            const inRotation = rotationVehicleId === v.id;
            const carImage = getCarImage(v.imageId);
            const lastStr = formatDate(last);
            return (
              <TouchableOpacity key={v.id} style={[styles.card, inRotation && styles.cardRotation]} onPress={() => setOpenVehicle(v)} activeOpacity={0.7}>
                <View style={styles.imageBox}>
                  {carImage ? (
                    <Image source={carImage} style={styles.carImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.iconFallback}><Car size={22} color="#888" /></View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.carName}>{v.make} {v.model}</Text>
                  <Text style={styles.carSub}>{v.licensePlate}</Text>
                  <View style={styles.metaRow}>
                    {overdue ? (
                      <View style={styles.overdueBadge}><Text style={styles.overdueText}>OVERDUE</Text></View>
                    ) : null}
                    <Text style={styles.lastText}>{lastStr ? `Last: ${lastStr}` : 'Never checked'}</Text>
                  </View>
                  {inRotation ? <Text style={styles.rotationText}>In rotation — up for its check</Text> : null}
                </View>
                {isAdmin ? (
                  <TouchableOpacity onPress={() => handleSetRotation(v.id)} hitSlop={10} style={styles.starBtn}>
                    <Star size={20} color={inRotation ? '#f59e0b' : '#ccc'} fill={inRotation ? '#f59e0b' : 'none'} />
                  </TouchableOpacity>
                ) : (
                  <ChevronRight size={20} color="#ccc" />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {openVehicle ? (
        <ChecklistModal
          store={store}
          vehicle={openVehicle}
          perCar={perCar}
          onClose={() => setOpenVehicle(null)}
        />
      ) : null}

      {showEditor ? (
        <ItemEditorModal
          store={store}
          itemNoun={itemNoun}
          perCar={perCar}
          showImport={showImport}
          onClose={() => setShowEditor(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

// ── Per-car checklist modal ─────────────────────────────────────────────────
function ChecklistModal({ store, vehicle, perCar, onClose }) {
  const { currentCheck, checkLoading, items, startCheck, fetchItems, toggleCheckItem, completeCheck, clearCurrentCheck } = store();
  const [completing, setCompleting] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await fetchItems(perCar ? vehicle.id : undefined);
        await startCheck(vehicle.id);
      } catch (e) {
        if (alive) setErr(e.message);
      }
    })();
    return () => { alive = false; clearCurrentCheck(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id]);

  const labelFor = (itemId) => items.find(i => i.id === itemId)?.label || '(removed item)';
  const posFor = (itemId) => items.find(i => i.id === itemId)?.position ?? 9999;

  const checkItems = [...(currentCheck?.items || [])].sort((a, b) => posFor(a.item_id) - posFor(b.item_id));
  const doneCount = checkItems.filter(i => i.checked).length;

  async function onToggle(it) {
    try { await toggleCheckItem(it.id, !it.checked); }
    catch (e) { Alert.alert('Error', e.message); }
  }

  async function onComplete() {
    if (!currentCheck?.check) return;
    setCompleting(true);
    try {
      await completeCheck(currentCheck.check.id);
      onClose();
      Alert.alert('Done', 'Check completed.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCompleting(false);
    }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>{vehicle.make} {vehicle.model}</Text>
            <Text style={styles.modalSub}>{vehicle.licensePlate}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}><X size={18} color="#000" /></TouchableOpacity>
        </View>

        {checkLoading || (!currentCheck && !err) ? (
          <View style={styles.centerFill}><ActivityIndicator color="#888" /></View>
        ) : err ? (
          <View style={styles.empty}><Text style={styles.errorText}>{err}</Text></View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.modalList}>
              <Text style={styles.progress}>{doneCount}/{checkItems.length} done</Text>
              {checkItems.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No checklist items</Text>
                  <Text style={styles.emptyHint}>Add items with the “Items” button.</Text>
                </View>
              ) : (
                checkItems.map(it => (
                  <TouchableOpacity key={it.id} style={styles.itemRow} onPress={() => onToggle(it)} activeOpacity={0.7}>
                    <View style={[styles.checkbox, it.checked && styles.checkboxOn]}>
                      {it.checked ? <Check size={16} color="#fff" /> : null}
                    </View>
                    <Text style={[styles.itemLabel, it.checked && styles.itemLabelDone]}>{labelFor(it.item_id)}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {checkItems.length > 0 ? (
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.primaryBtn, completing && { opacity: 0.6 }]}
                  onPress={onComplete}
                  disabled={completing}
                  activeOpacity={0.85}
                >
                  {completing ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Complete check</Text>}
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// ── Master item editor modal ────────────────────────────────────────────────
function ItemEditorModal({ store, itemNoun, perCar, showImport, onClose }) {
  const { items, fetchItems, addItem, updateItem, deleteItem, importItems } = store();
  const [label, setLabel] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => { fetchItems(); /* master list (all cars) */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onAdd() {
    if (!label.trim()) return;
    setBusy(true);
    try { await addItem({ label: label.trim() }); setLabel(''); }
    catch (e) { Alert.alert('Error', e.message); }
    finally { setBusy(false); }
  }

  async function onSaveEdit(id) {
    if (!editLabel.trim()) return;
    try { await updateItem(id, { label: editLabel.trim() }); setEditingId(null); }
    catch (e) { Alert.alert('Error', e.message); }
  }

  function onDelete(item) {
    Alert.alert('Remove item?', `Remove "${item.label}" from the master list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteItem(item.id).catch(e => Alert.alert('Error', e.message)) },
    ]);
  }

  const sorted = [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Checklist items</Text>
              <Text style={styles.modalSub}>Applies to {perCar ? 'all cars unless car-specific' : 'every car'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><X size={18} color="#000" /></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                value={label}
                onChangeText={setLabel}
                placeholder={`Add a ${itemNoun}…`}
                placeholderTextColor="#bbb"
                onSubmitEditing={onAdd}
                returnKeyType="done"
              />
              <TouchableOpacity style={[styles.addItemBtn, busy && { opacity: 0.6 }]} onPress={onAdd} disabled={busy} activeOpacity={0.85}>
                <Plus size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {showImport ? (
              <TouchableOpacity style={styles.importBtn} onPress={() => setShowImportModal(true)} activeOpacity={0.8}>
                <Upload size={16} color="#0284c7" />
                <Text style={styles.importText}>Import list</Text>
              </TouchableOpacity>
            ) : null}

            {sorted.length === 0 ? (
              <Text style={styles.emptyHint}>No items yet. Add one above.</Text>
            ) : (
              sorted.map(item => (
                <View key={item.id} style={styles.editItemRow}>
                  {editingId === item.id ? (
                    <>
                      <TextInput style={styles.editInput} value={editLabel} onChangeText={setEditLabel} autoFocus />
                      <TouchableOpacity onPress={() => onSaveEdit(item.id)} hitSlop={8}><Check size={18} color="#018a16" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingId(null)} hitSlop={8}><X size={18} color="#999" /></TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.editItemLabel}>{item.label}{perCar && item.vehicle_id ? '  (this car)' : ''}</Text>
                      <TouchableOpacity onPress={() => { setEditingId(item.id); setEditLabel(item.label); }} hitSlop={8}><Pencil size={16} color="#666" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => onDelete(item)} hitSlop={8}><Trash2 size={16} color="#c4001a" /></TouchableOpacity>
                    </>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {showImportModal ? (
          <ImportModal
            onClose={() => setShowImportModal(false)}
            onImport={async (labels) => { await importItems(labels); setShowImportModal(false); }}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

// ── Bulk import modal (one label per line) ──────────────────────────────────
function ImportModal({ onClose, onImport }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function run() {
    const labels = text.split('\n').map(s => s.trim()).filter(Boolean);
    if (labels.length === 0) { Alert.alert('Nothing to import', 'Enter one item per line.'); return; }
    setBusy(true);
    try { await onImport(labels); }
    catch (e) { Alert.alert('Error', e.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Import list</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><X size={18} color="#000" /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>One item per line</Text>
            <TextInput
              style={[styles.addInput, styles.importInput]}
              value={text}
              onChangeText={setText}
              placeholder={'First aid kit\nHi-vis vest\nWarning triangle'}
              placeholderTextColor="#bbb"
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity style={[styles.primaryBtn, busy && { opacity: 0.6 }]} onPress={run} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Import</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f2f2f2', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  editBtnText: { color: '#000', fontSize: 14, fontWeight: '700' },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  empty: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#444', marginTop: 8 },
  emptyHint: { fontSize: 13, color: '#888', textAlign: 'center' },
  errorText: { fontSize: 13, color: '#c4001a' },
  retryBtn: { marginTop: 10, padding: 10, backgroundColor: '#000', borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#ececec' },
  cardRotation: { borderColor: '#fcd34d', backgroundColor: '#fffbeb' },
  imageBox: { width: 74, height: 48 },
  carImage: { width: '100%', height: '100%' },
  iconFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5', borderRadius: 8 },
  carName: { fontSize: 15, fontWeight: '700', color: '#000' },
  carSub: { fontSize: 12, color: '#888', marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  overdueBadge: { backgroundColor: '#c4001a', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  overdueText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  lastText: { fontSize: 12, color: '#666' },
  rotationText: { fontSize: 11, color: '#b45309', fontWeight: '600', marginTop: 4 },
  starBtn: { padding: 4 },
  // modal
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  modalSub: { fontSize: 13, color: '#888', marginTop: 2 },
  closeBtn: { padding: 6 },
  modalList: { padding: 20, paddingBottom: 40 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progress: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#018a16', borderColor: '#018a16' },
  itemLabel: { flex: 1, fontSize: 15, color: '#111' },
  itemLabelDone: { color: '#999', textDecorationLine: 'line-through' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#eee' },
  primaryBtn: { backgroundColor: '#000', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addInput: { flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#111' },
  addItemBtn: { backgroundColor: '#000', width: 46, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#bae6fd', backgroundColor: '#f0f9ff', borderRadius: 10 },
  importText: { color: '#0284c7', fontSize: 14, fontWeight: '700' },
  importInput: { minHeight: 160, marginTop: 6 },
  fieldLabel: { fontSize: 13, color: '#666', marginBottom: 6, fontWeight: '500' },
  editItemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  editItemLabel: { flex: 1, fontSize: 15, color: '#111' },
  editInput: { flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, color: '#111' },
});
