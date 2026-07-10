import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, Store, Trash2 } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { usePaymentStore } from '../../src/store/paymentStore';
import AdminHeader from '../../src/components/AdminHeader';
import ReceiptPicker from '../../src/components/ReceiptPicker';
import ReceiptViewer from '../../src/components/ReceiptViewer';
import SkeletonList from '../../src/components/SkeletonList';

function formatCurrency(n) {
  if (n == null || isNaN(n)) return '—';
  return `£${Number(n).toFixed(2)}`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PaymentsScreen() {
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const { payments, loading, error, fetchPayments, addPayment, deletePayment } = usePaymentStore();

  const [refreshing, setRefreshing] = useState(false);
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [receiptPath, setReceiptPath] = useState(null);
  const [formKey, setFormKey] = useState(0); // bump to remount ReceiptPicker (clears preview)
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(useCallback(() => { fetchPayments(); }, [fetchPayments]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
  };

  function resetForm() {
    setItem('');
    setAmount('');
    setVendor('');
    setReceiptPath(null);
    setFormKey(k => k + 1);
  }

  async function handleSubmit() {
    if (!item.trim()) {
      Alert.alert('Missing item', 'Enter what was bought.');
      return;
    }
    const numeric = amount ? parseFloat(amount) : null;
    if (amount && (isNaN(numeric) || numeric < 0)) {
      Alert.alert('Invalid amount', 'Enter a valid amount.');
      return;
    }
    setSubmitting(true);
    try {
      await addPayment({
        item: item.trim(),
        amount: numeric,
        vendor: vendor.trim() || null,
        receipt_path: receiptPath,
        created_by: user?.name || user?.username || null,
      });
      resetForm();
      Alert.alert('Saved', 'Payment logged.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete(payment) {
    Alert.alert('Delete payment?', `Remove "${payment.item}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePayment(payment.id).catch(e => Alert.alert('Error', e.message)) },
    ]);
  }

  const total = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AdminHeader
        title="Payments"
        subtitle={`${payments.length} payment${payments.length === 1 ? '' : 's'} · ${formatCurrency(total)} total`}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Log a purchase */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Log a purchase</Text>

            <Text style={styles.fieldLabel}>What was bought</Text>
            <TextInput
              style={styles.input}
              value={item}
              onChangeText={setItem}
              placeholder="e.g. Windscreen washer fluid"
              placeholderTextColor="#bbb"
            />

            <Text style={styles.fieldLabel}>Amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currency}>£</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#bbb"
              />
            </View>

            <Text style={styles.fieldLabel}>Where bought (vendor)</Text>
            <TextInput
              style={styles.input}
              value={vendor}
              onChangeText={setVendor}
              placeholder="e.g. Halfords"
              placeholderTextColor="#bbb"
            />

            <Text style={styles.fieldLabel}>Receipt</Text>
            <ReceiptPicker key={formKey} kind="payment" token={token} onChange={setReceiptPath} label="Attach receipt photo" />

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save payment</Text>}
            </TouchableOpacity>
          </View>

          {/* Logged payments */}
          <Text style={styles.sectionTitle}>Logged payments</Text>
          {loading && !refreshing ? (
            <SkeletonList count={3} />
          ) : error ? (
            <View style={styles.empty}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={fetchPayments} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
            </View>
          ) : payments.length === 0 ? (
            <View style={styles.empty}>
              <CreditCard size={48} color="#ccc" />
              <Text style={styles.emptyText}>No payments yet</Text>
              <Text style={styles.emptyHint}>Log your first purchase above.</Text>
            </View>
          ) : (
            payments.map(p => (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardItem} numberOfLines={1}>{p.item}</Text>
                  <Text style={styles.cardAmount}>{formatCurrency(p.amount)}</Text>
                </View>
                {p.vendor ? (
                  <View style={styles.row}>
                    <Store size={14} color="#666" />
                    <Text style={styles.rowText}>{p.vendor}</Text>
                  </View>
                ) : null}
                {p.created_at ? <Text style={styles.cardDate}>{formatDate(p.created_at)}{p.created_by ? ` · ${p.created_by}` : ''}</Text> : null}
                <ReceiptViewer path={p.receipt_path} token={token} label="Receipt" />
                <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(p)} hitSlop={8}>
                  <Trash2 size={16} color="#c4001a" />
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  formCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#ececec', marginBottom: 20 },
  formTitle: { fontSize: 17, fontWeight: '700', color: '#000', marginBottom: 10 },
  fieldLabel: { fontSize: 13, color: '#666', marginBottom: 6, marginTop: 12, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#111', backgroundColor: '#fff' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#fff' },
  currency: { fontSize: 17, color: '#888', fontWeight: '600' },
  amountInput: { flex: 1, fontSize: 15, color: '#111', paddingVertical: 12 },
  primaryBtn: { backgroundColor: '#000', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#000', marginBottom: 10 },
  empty: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#444', marginTop: 8 },
  emptyHint: { fontSize: 13, color: '#888', textAlign: 'center' },
  errorText: { fontSize: 13, color: '#c4001a' },
  retryBtn: { marginTop: 10, padding: 10, backgroundColor: '#000', borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#ececec' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardItem: { fontSize: 15, fontWeight: '700', color: '#000', flex: 1 },
  cardAmount: { fontSize: 16, fontWeight: '700', color: '#018a16' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  rowText: { fontSize: 13, color: '#444', flex: 1 },
  cardDate: { fontSize: 12, color: '#999', marginTop: 6 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start' },
  deleteText: { fontSize: 13, color: '#c4001a', fontWeight: '600' },
});
