// Web receipt-photo helpers — mirror the mobile app's flow so tickets created
// on either platform share the same private-bucket storage.
//   POST /api/upload-receipt { imageData: dataURI, kind } -> { path }
//   GET  /api/receipts/url?path=...                        -> { url }
import { SERVER_URL } from '../config/api';

function getToken() {
  try {
    return JSON.parse(localStorage.getItem('auth-storage'))?.state?.token || null;
  } catch {
    return null;
  }
}

function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Upload a File (from an <input type="file">). Returns the stored path.
export async function uploadReceipt(file, kind = 'ticket') {
  const imageData = await fileToDataUri(file);
  const resp = await fetch(`${SERVER_URL}/api/upload-receipt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ imageData, kind }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  return (await resp.json()).path;
}

// Upload a vehicle photo (File from an <input type="file">) to the PUBLIC
// vehicle-photos bucket. Returns a plain public URL (usable directly as an
// <img> src / map marker). Throws on failure.
export async function uploadVehiclePhoto(file) {
  const imageData = await fileToDataUri(file);
  const resp = await fetch(`${SERVER_URL}/api/upload-vehicle-photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ imageData }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Upload failed');
  }
  return (await resp.json()).url;
}

// Short-lived signed URL to view a stored receipt. Null on failure.
export async function getReceiptUrl(path) {
  if (!path) return null;
  try {
    const resp = await fetch(`${SERVER_URL}/api/receipts/url?path=${encodeURIComponent(path)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!resp.ok) return null;
    return (await resp.json()).url || null;
  } catch {
    return null;
  }
}

// The ticket photo can live in the picture_url column (web) or in the
// plan_for_contesting meta as receipt_path (mobile). Returns { httpUrl } for a
// directly-viewable legacy URL, or { path } for a private-bucket path to sign.
export function resolveTicketPhoto(ticket) {
  const pic = ticket?.picture_url;
  if (pic && /^https?:\/\//i.test(pic)) return { httpUrl: pic };
  if (pic) return { path: pic };
  const raw = ticket?.plan_for_contesting;
  if (raw && typeof raw === 'string' && raw.trim().startsWith('{')) {
    try {
      const rp = JSON.parse(raw).receipt_path;
      if (rp) return { path: rp };
    } catch { /* ignore */ }
  }
  return {};
}
