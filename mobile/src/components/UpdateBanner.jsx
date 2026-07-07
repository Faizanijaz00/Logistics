import { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { Download, RefreshCw } from 'lucide-react-native';

// Surfaces EAS over-the-air (OTA) updates on the home screen. On mount — and
// whenever the app returns to the foreground — it asks the update server whether
// a newer JS bundle is published for this build's runtime version. If so, it
// shows a banner; tapping it downloads the update and relaunches into it.
//
// Updates are disabled in Expo Go and in the local dev client (bundle comes from
// Metro, not the update server), so `Updates.isEnabled` is false there and this
// renders nothing. It only appears in preview/production builds.
export default function UpdateBanner() {
  const {
    isUpdateAvailable,
    isUpdatePending,
    isDownloading,
    downloadError,
  } = Updates.useUpdates();
  const [failed, setFailed] = useState(false);

  const checkForUpdate = useCallback(async () => {
    if (!Updates.isEnabled) return;
    try {
      await Updates.checkForUpdateAsync();
    } catch {
      // Offline or transient server error — stay quiet and retry next foreground.
    }
  }, []);

  // Check once on mount, then again each time the app becomes active.
  useEffect(() => {
    checkForUpdate();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') checkForUpdate();
    });
    return () => sub.remove();
  }, [checkForUpdate]);

  // Once a downloaded update is staged, relaunch into it.
  useEffect(() => {
    if (isUpdatePending) Updates.reloadAsync().catch(() => {});
  }, [isUpdatePending]);

  async function handleUpdate() {
    setFailed(false);
    try {
      await Updates.fetchUpdateAsync();
    } catch {
      setFailed(true);
    }
  }

  if (!Updates.isEnabled) return null;
  if (!isUpdateAvailable && !isDownloading) return null;

  const errored = failed || !!downloadError;

  return (
    <TouchableOpacity
      style={styles.banner}
      activeOpacity={0.85}
      onPress={handleUpdate}
      disabled={isDownloading}
    >
      <View style={styles.iconWrap}>
        {isDownloading ? <RefreshCw size={18} color="#0061bd" /> : <Download size={18} color="#0061bd" />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          {isDownloading ? 'Downloading update…' : errored ? 'Update failed' : 'Update available'}
        </Text>
        <Text style={styles.subtitle}>
          {isDownloading
            ? 'The app will restart automatically'
            : errored
            ? 'Tap to try again'
            : 'Tap to install the latest version'}
        </Text>
      </View>
      {isDownloading ? (
        <ActivityIndicator size="small" color="#0061bd" />
      ) : (
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{errored ? 'Retry' : 'Update'}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: '#0c4a6e' },
  subtitle: { fontSize: 12, color: '#3b6ea5', marginTop: 1 },
  cta: {
    backgroundColor: '#0061bd',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ctaText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
