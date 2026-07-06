// Display a stored receipt: fetches a short-lived signed URL for the given
// storage path and renders a thumbnail that opens full-screen on tap.
// Renders nothing when path is falsy.
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Modal } from 'react-native';
import { X } from 'lucide-react-native';
import { getReceiptUrl } from '../lib/receipts';

export default function ReceiptViewer({ path, token, label = 'Receipt' }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [full, setFull] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getReceiptUrl(path, token).then(u => {
      if (alive) {
        setUrl(u);
        setLoading(false);
      }
    });
    return () => { alive = false; };
  }, [path, token]);

  if (!path) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {loading ? (
        <View style={styles.thumb}><ActivityIndicator color="#888" /></View>
      ) : url ? (
        <TouchableOpacity onPress={() => setFull(true)} activeOpacity={0.85}>
          <Image source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
        </TouchableOpacity>
      ) : (
        <Text style={styles.err}>Couldn’t load receipt</Text>
      )}

      <Modal visible={full} transparent animationType="fade" onRequestClose={() => setFull(false)}>
        <View style={styles.fullBackdrop}>
          <TouchableOpacity style={styles.fullClose} onPress={() => setFull(false)} activeOpacity={0.85}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
          {url ? <Image source={{ uri: url }} style={styles.fullImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  label: { fontSize: 13, color: '#888', marginBottom: 6 },
  thumb: { width: 100, height: 100, borderRadius: 10, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  err: { fontSize: 13, color: '#c4001a' },
  fullBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  fullClose: { position: 'absolute', top: 52, right: 20, zIndex: 2, padding: 8 },
  fullImage: { width: '92%', height: '80%' },
});
