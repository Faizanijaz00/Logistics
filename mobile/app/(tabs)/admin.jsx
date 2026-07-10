// Admin hub — the last bottom tab. A simple scrollable page of large tappable
// cards that route to each admin tool. The Fines card opens the full Tickets &
// Fines screen (moved to /admin/fines); the rest open their own pages.
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ReceiptText, CreditCard, FileText, Wrench, Package, ChevronRight } from 'lucide-react-native';

const CARDS = [
  { key: 'fines', title: 'Fines', subtitle: 'Tickets, PCNs & charges', route: '/admin/fines', icon: ReceiptText, color: '#7c3aed', bg: '#faf5ff' },
  { key: 'payments', title: 'Payments', subtitle: 'Log purchases & receipts', route: '/admin/payments', icon: CreditCard, color: '#018a16', bg: '#f0fdf4' },
  { key: 'sops', title: 'SOPs', subtitle: 'Standard operating procedures', route: '/admin/sops', icon: FileText, color: '#0284c7', bg: '#f0f9ff' },
  { key: 'maintenance', title: 'Maintenance Checks', subtitle: 'Weekly per-car checklist', route: '/admin/maintenance', icon: Wrench, color: '#f97316', bg: '#fff7ed' },
  { key: 'inventory', title: 'Inventory', subtitle: 'Per-car item checklist', route: '/admin/inventory', icon: Package, color: '#c4001a', bg: '#fef2f2' },
];

export default function AdminHubScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin</Text>
        <Text style={styles.headerSub}>Manage fines, payments, SOPs & checks</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {CARDS.map(c => {
          const Icon = c.icon;
          return (
            <TouchableOpacity
              key={c.key}
              style={styles.card}
              onPress={() => router.push(c.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: c.bg }]}>
                <Icon size={24} color={c.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardSub}>{c.subtitle}</Text>
              </View>
              <ChevronRight size={20} color="#ccc" />
            </TouchableOpacity>
          );
        })}
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
  listContent: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#ececec' },
  iconBox: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#000' },
  cardSub: { fontSize: 13, color: '#888', marginTop: 2 },
});
