import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReceiptText } from 'lucide-react-native';
import { useLayout } from '../../src/hooks/useLayout';

export default function TicketsScreen() {
  const { isUnfolded } = useLayout();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, isUnfolded && styles.containerUnfolded]}>
        <View style={[styles.placeholder, isUnfolded && styles.placeholderUnfolded]}>
          <ReceiptText size={isUnfolded ? 56 : 48} color="#ccc" />
          <Text style={[styles.title, isUnfolded && styles.titleUnfolded]}>Tickets & Fines</Text>
          <Text style={[styles.subtitle, isUnfolded && styles.subtitleUnfolded]}>Ticket management coming soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  containerUnfolded: { paddingHorizontal: 40 },
  placeholder: { alignItems: 'center', gap: 8 },
  placeholderUnfolded: { gap: 12 },
  title: { fontSize: 20, fontWeight: '600', color: '#333' },
  titleUnfolded: { fontSize: 26 },
  subtitle: { fontSize: 14, color: '#888' },
  subtitleUnfolded: { fontSize: 16 },
});
