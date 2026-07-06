// Capture control for add-forms: lets a user attach one receipt photo (camera or
// library), uploads it, and reports the resulting storage path via onChange.
// onChange(path | null). Shows a local preview while/after uploading.
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Modal } from 'react-native';
import { Camera, X } from 'lucide-react-native';
import { captureReceiptPhoto, pickReceiptFromLibrary, uploadReceipt } from '../lib/receipts';

export default function ReceiptPicker({ kind, token, onChange, label = 'Attach photo' }) {
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState(null);
  const [full, setFull] = useState(false);

  async function handlePicked(dataUri) {
    if (!dataUri) return;
    setUploading(true);
    try {
      const path = await uploadReceipt(dataUri, kind, token);
      setPreviewUri(dataUri);
      onChange(path);
    } catch (e) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  }

  function choose() {
    Alert.alert('Add photo', undefined, [
      { text: 'Take photo', onPress: async () => handlePicked(await captureReceiptPhoto()) },
      { text: 'Choose from library', onPress: async () => handlePicked(await pickReceiptFromLibrary()) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function remove() {
    setPreviewUri(null);
    onChange(null);
  }

  if (previewUri) {
    return (
      <View style={styles.previewWrap}>
        <TouchableOpacity onPress={() => setFull(true)} activeOpacity={0.85}>
          <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.removeBtn} onPress={remove} activeOpacity={0.85}>
          <X size={16} color="#fff" />
        </TouchableOpacity>

        <Modal visible={full} transparent animationType="fade" onRequestClose={() => setFull(false)}>
          <View style={styles.fullBackdrop}>
            <TouchableOpacity style={styles.fullClose} onPress={() => setFull(false)} activeOpacity={0.85}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <Image source={{ uri: previewUri }} style={styles.fullImage} resizeMode="contain" />
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.attachBtn, uploading && { opacity: 0.6 }]}
      onPress={choose}
      disabled={uploading}
      activeOpacity={0.85}
    >
      {uploading ? (
        <ActivityIndicator color="#555" />
      ) : (
        <>
          <Camera size={18} color="#555" />
          <Text style={styles.attachText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  attachText: { color: '#555', fontSize: 15, fontWeight: '500' },
  previewWrap: { marginTop: 8, position: 'relative', alignSelf: 'flex-start' },
  preview: { width: 120, height: 120, borderRadius: 12, backgroundColor: '#eee' },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#c4001a',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  fullClose: { position: 'absolute', top: 52, right: 20, zIndex: 2, padding: 8 },
  fullImage: { width: '92%', height: '80%' },
});
