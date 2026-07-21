import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Search, X, Plus, Paperclip, Trash2 } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useSopStore } from '../../src/store/sopStore';
import AdminHeader from '../../src/components/AdminHeader';
import ReceiptPicker from '../../src/components/ReceiptPicker';
import ReceiptViewer from '../../src/components/ReceiptViewer';
import SkeletonList from '../../src/components/SkeletonList';
import { useTheme } from '../../src/store/themeStore';

export default function SopsScreen() {
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const { sops, loading, error, fetchSops } = useSopStore();
  const t = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // sop object or null
  const [showModal, setShowModal] = useState(false);

  useFocusEffect(useCallback(() => { fetchSops(); }, [fetchSops]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSops();
    setRefreshing(false);
  };

  const q = query.trim().toLowerCase();
  const filtered = !q ? sops : sops.filter(s => {
    const haystack = [s.title, s.body].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });

  function openAdd() { setEditing(null); setShowModal(true); }
  function openEdit(sop) { setEditing(sop); setShowModal(true); }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      <AdminHeader
        title="SOPs"
        subtitle={`${sops.length} document${sops.length === 1 ? '' : 's'}`}
        right={(
          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.85}>
            <Plus size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      />

      <View style={[styles.searchWrap, { backgroundColor: t.bg }]}>
        <View style={[styles.searchRow, { backgroundColor: t.card, borderColor: t.border }]}>
          <Search size={16} color={t.subtext} />
          <TextInput
            style={[styles.searchInput, { color: t.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search SOPs by title or text…"
            placeholderTextColor={t.subtext}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}><X size={16} color={t.subtext} /></TouchableOpacity>
          ) : null}
        </View>
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
            <TouchableOpacity onPress={fetchSops} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <FileText size={48} color="#ccc" />
            {sops.length === 0 ? (
              <>
                <Text style={[styles.emptyText, { color: t.text }]}>No SOPs yet</Text>
                <Text style={[styles.emptyHint, { color: t.subtext }]}>Tap Add to create your first SOP.</Text>
              </>
            ) : (
              <>
                <Text style={[styles.emptyText, { color: t.text }]}>No matching SOPs</Text>
                <Text style={[styles.emptyHint, { color: t.subtext }]}>Try a different search.</Text>
              </>
            )}
          </View>
        ) : (
          filtered.map(s => (
            <TouchableOpacity key={s.id} style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]} onPress={() => openEdit(s)} activeOpacity={0.7}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: t.text }]} numberOfLines={1}>{s.title}</Text>
                {s.attachment_path ? (
                  <View style={styles.badge}>
                    <Paperclip size={12} color="#0284c7" />
                    <Text style={styles.badgeText}>File</Text>
                  </View>
                ) : null}
              </View>
              {s.body ? <Text style={[styles.snippet, { color: t.subtext }]} numberOfLines={2}>{s.body}</Text> : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <SopModal
        visible={showModal}
        sop={editing}
        token={token}
        user={user}
        onClose={() => setShowModal(false)}
      />
    </SafeAreaView>
  );
}

// ── Add / Edit SOP modal ────────────────────────────────────────────────────
function SopModal({ visible, sop, token, user, onClose }) {
  const { addSop, updateSop, deleteSop } = useSopStore();
  const t = useTheme();
  const isEdit = !!sop;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [attachmentPath, setAttachmentPath] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle(sop?.title || '');
      setBody(sop?.body || '');
      setAttachmentPath(sop?.attachment_path || null);
      setFormKey(k => k + 1);
    }
  }, [visible, sop]);

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Enter a title for the SOP.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim() || null,
        attachment_path: attachmentPath,
      };
      if (isEdit) {
        await updateSop(sop.id, payload);
      } else {
        await addSop({ ...payload, created_by: user?.name || user?.username || null });
      }
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete() {
    Alert.alert('Delete SOP?', `Remove "${sop.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await deleteSop(sop.id); onClose(); }
          catch (e) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalSafe, { backgroundColor: t.card }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={[styles.modalHeader, { borderBottomColor: t.border }]}>
            <Text style={[styles.modalTitle, { color: t.text }]}>{isEdit ? 'Edit SOP' : 'New SOP'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}><X size={18} color={t.text} /></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: t.subtext }]}>Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: t.inputBg, color: t.text, borderColor: t.border }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Vehicle handover checklist"
              placeholderTextColor={t.subtext}
            />

            <Text style={[styles.fieldLabel, { color: t.subtext }]}>Content</Text>
            <TextInput
              style={[styles.input, styles.multiline, { backgroundColor: t.inputBg, color: t.text, borderColor: t.border }]}
              value={body}
              onChangeText={setBody}
              placeholder="Type the procedure…"
              placeholderTextColor={t.subtext}
              multiline
              textAlignVertical="top"
            />

            {isEdit && sop?.attachment_path ? (
              <ReceiptViewer path={sop.attachment_path} token={token} label="Current attachment" />
            ) : null}

            <Text style={[styles.fieldLabel, { color: t.subtext }]}>{isEdit && sop?.attachment_path ? 'Replace attachment' : 'Attachment (optional)'}</Text>
            <ReceiptPicker key={formKey} kind="sop" token={token} onChange={setAttachmentPath} label="Attach file (image)" />

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{isEdit ? 'Save changes' : 'Create SOP'}</Text>}
            </TouchableOpacity>

            {isEdit ? (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
                <Trash2 size={16} color="#c4001a" />
                <Text style={styles.deleteText}>Delete SOP</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#000', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#f5f5f5' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#ececec' },
  searchInput: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  empty: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#444', marginTop: 8 },
  emptyHint: { fontSize: 13, color: '#888', textAlign: 'center' },
  errorText: { fontSize: 13, color: '#c4001a' },
  retryBtn: { marginTop: 10, padding: 10, backgroundColor: '#000', borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#ececec' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#000', flex: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0f9ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#0284c7' },
  snippet: { fontSize: 13, color: '#666', marginTop: 6, lineHeight: 18 },
  // modal
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  closeBtn: { padding: 6 },
  modalList: { padding: 20, paddingBottom: 60 },
  fieldLabel: { fontSize: 13, color: '#666', marginBottom: 6, marginTop: 14, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#111', backgroundColor: '#fff' },
  multiline: { minHeight: 140 },
  primaryBtn: { backgroundColor: '#000', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 22 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  deleteText: { fontSize: 14, color: '#c4001a', fontWeight: '600' },
});
