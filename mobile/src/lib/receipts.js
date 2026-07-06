// Receipt photos — pick from camera/library, upload to the server (which stores
// them in a private Supabase bucket), and mint short-lived signed view URLs.
// The server endpoints live in server/receipts.js:
//   POST /api/upload-receipt  { imageData: dataURI, kind }  -> { path }
//   GET  /api/receipts/url?path=...                          -> { url }
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { SERVER_URL } from '../config/api';

// Compress a bit so uploads stay small; the server caps files at 15MB.
const PICKER_OPTS = { mediaTypes: ['images'], quality: 0.5, base64: true, allowsEditing: false };

function toDataUri(asset) {
  if (!asset?.base64) return null;
  const mime = asset.mimeType || 'image/jpeg';
  return `data:${mime};base64,${asset.base64}`;
}

// Launch the camera. Returns a base64 data URI, or null if cancelled/denied.
export async function captureReceiptPhoto() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Camera access needed', 'Enable camera access in Settings to photograph receipts.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync(PICKER_OPTS);
  if (result.canceled) return null;
  return toDataUri(result.assets?.[0]);
}

// Launch the photo library. Returns a base64 data URI, or null if cancelled/denied.
export async function pickReceiptFromLibrary() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Photos access needed', 'Enable photo access in Settings to attach receipts.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTS);
  if (result.canceled) return null;
  return toDataUri(result.assets?.[0]);
}

// Upload a base64 data URI to the server. kind is 'fuel' | 'ticket' | 'issue'.
// Returns the stored storage path (throws on failure).
export async function uploadReceipt(dataUri, kind, token) {
  const resp = await fetch(`${SERVER_URL}/api/upload-receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ imageData: dataUri, kind }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  const data = await resp.json();
  return data.path;
}

// Mint a short-lived signed URL to view a stored receipt. Returns null on failure.
export async function getReceiptUrl(path, token) {
  if (!path) return null;
  try {
    const resp = await fetch(`${SERVER_URL}/api/receipts/url?path=${encodeURIComponent(path)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.url || null;
  } catch {
    return null;
  }
}
