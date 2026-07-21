// Shared header for the Admin hub's stacked sub-pages: a back chevron, a title,
// an optional subtitle, and an optional right-hand action (e.g. an Add button).
// Matches the header styling used on the Fines screen.
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../store/themeStore';

export default function AdminHeader({ title, subtitle, right }) {
  const router = useRouter();
  const t = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.border }]}>
      <View style={styles.row}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <ChevronLeft size={24} color={t.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: t.subtext }]}>{subtitle}</Text> : null}
        </View>
        {right || null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ececec' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { marginLeft: -4 },
  title: { fontSize: 22, fontWeight: '700', color: '#000' },
  subtitle: { fontSize: 13, color: '#888', marginTop: 2 },
});
