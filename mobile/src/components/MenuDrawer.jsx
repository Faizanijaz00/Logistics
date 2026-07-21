import { useEffect, useRef } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../store/themeStore';

// Lightweight half-width slide-in drawer (pure Animated, no native drawer dep).
// Kept mounted so it can animate in/out; ignores touches when closed.
export default function MenuDrawer({ open, onClose, title, subtitle, items }) {
  const t = useTheme();
  const W = Math.min(Dimensions.get('window').width * 0.78, 340);
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current; // 0 closed → 1 open

  useEffect(() => {
    Animated.timing(anim, { toValue: open ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [open]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-W, 0] });
  const backdrop = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <View pointerEvents={open ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.panel, { backgroundColor: t.card, width: W, paddingTop: insets.top + 16, transform: [{ translateX }] }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: t.text }]}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: t.subtext }]}>{subtitle}</Text> : null}
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={10}><X size={22} color={t.subtext} /></TouchableOpacity>
        </View>
        {items.map((it) => (
          <TouchableOpacity
            key={it.label}
            style={[styles.item, { borderBottomColor: t.border }]}
            activeOpacity={0.7}
            onPress={() => { onClose(); setTimeout(() => it.onPress(), 180); }}
          >
            {it.icon ? <it.icon size={20} color={it.danger ? '#c4001a' : t.text} /> : null}
            <Text style={[styles.itemText, { color: t.text }, it.danger && { color: '#c4001a' }]}>{it.label}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: '#fff', paddingHorizontal: 20, borderTopRightRadius: 18, borderBottomRightRadius: 18, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 4, height: 0 }, elevation: 12 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#000' },
  subtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  itemText: { fontSize: 16, color: '#222', fontWeight: '500' },
});
