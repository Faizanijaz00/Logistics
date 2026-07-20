// The persistent "you're currently driving X" notification (Google-Maps style):
// posted when a drive starts, cleared when it stops. On Android it's an ongoing
// (sticky, non-dismissible) notification; iOS shows a normal notification that
// lingers in the notification centre (iOS has no true sticky notifications).
//
// All native access is behind dynamic import() + try/catch so this is safe to
// ship over-the-air onto a binary that lacks expo-notifications — it just
// no-ops there instead of crashing. authStore imports this statically, which is
// fine because THIS module never statically imports a native one.
import { Platform } from 'react-native';

let _drivingNotifId = null;

export async function showDrivingNotification(vehicleName) {
  try {
    const Notifications = await import('expo-notifications');
    const { ensureNotificationsReady } = await import('./notifications');
    const ready = await ensureNotificationsReady();
    if (!ready) return;
    await clearDrivingNotification();
    _drivingNotifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Currently driving ${vehicleName || 'a vehicle'}`,
        body: 'Tap "Stop Driving" in the app when you park.',
        sticky: true,        // Android: ongoing / can't be swiped away
        autoDismiss: false,
        ...(Platform.OS === 'android' ? { channelId: 'drives' } : {}),
      },
      trigger: null,         // show immediately
    });
  } catch { /* native module absent (OTA on old binary) — no-op */ }
}

export async function clearDrivingNotification() {
  try {
    const Notifications = await import('expo-notifications');
    if (_drivingNotifId) {
      await Notifications.dismissNotificationAsync(_drivingNotifId).catch(() => {});
      await Notifications.cancelScheduledNotificationAsync(_drivingNotifId).catch(() => {});
      _drivingNotifId = null;
    }
  } catch { /* no-op */ }
}
