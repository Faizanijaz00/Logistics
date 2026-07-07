// Shows which OTA update the app is currently running (match the ID to the EAS
// dashboard to confirm you're on the latest), plus a button to pull + apply the
// newest update on demand. Handy for testers to verify they're up to date.
import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as Updates from 'expo-updates';

export default function UpdateInfo() {
  const [checking, setChecking] = useState(false);

  const id = Updates.updateId ? Updates.updateId.slice(0, 8) : null;
  const created = Updates.createdAt
    ? new Date(Updates.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;
  const label = Updates.isEmbeddedLaunch || !id
    ? 'Running built-in version (no OTA applied yet)'
    : `Update ${id} · ${created}`;

  async function check() {
    setChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert('Update found', 'Reloading to apply the latest version…', [
          { text: 'OK', onPress: () => Updates.reloadAsync() },
        ]);
      } else {
        Alert.alert('Up to date', "You're on the latest version.");
      }
    } catch (e) {
      Alert.alert('Update check failed', e.message || 'Could not check for updates.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <View style={{ alignItems: 'center', paddingVertical: 18, gap: 10 }}>
      <Text style={{ fontSize: 11, color: '#aaa' }}>{label}</Text>
      <TouchableOpacity
        onPress={check}
        disabled={checking}
        activeOpacity={0.8}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
          paddingHorizontal: 16, paddingVertical: 9,
        }}
      >
        {checking ? <ActivityIndicator size="small" color="#666" /> : <Text style={{ fontSize: 13, color: '#333', fontWeight: '600' }}>Check for updates</Text>}
      </TouchableOpacity>
    </View>
  );
}
