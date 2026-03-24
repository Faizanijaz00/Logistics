import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReceiptText } from 'lucide-react-native';

export default function TicketsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <ReceiptText size={48} color="#ccc" />
          <Text style={styles.title}>Tickets & Fines</Text>
          <Text style={styles.subtitle}>Ticket management coming soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '600', color: '#333' },
  subtitle: { fontSize: 14, color: '#888' },
});
