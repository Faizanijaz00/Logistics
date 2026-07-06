// Lightweight loading placeholder: a few card-shaped grey blocks that gently
// pulse. Pure RN Animated — no shimmer library — so it stays a JS-only change.
import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

function SkeletonCard({ opacity }) {
  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.headerRow}>
        <View style={[styles.bar, { width: '45%' }]} />
        <View style={[styles.bar, { width: '20%' }]} />
      </View>
      <View style={[styles.bar, { width: '70%', marginTop: 12 }]} />
      <View style={[styles.bar, { width: '55%', marginTop: 8 }]} />
      <View style={[styles.bar, { width: '35%', marginTop: 8 }]} />
    </Animated.View>
  );
}

export default function SkeletonList({ count = 4 }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} opacity={opacity} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#ececec' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bar: { height: 12, borderRadius: 6, backgroundColor: '#e6e6e6' },
});
