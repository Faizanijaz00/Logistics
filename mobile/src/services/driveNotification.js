// The persistent "you're currently driving X" notification (Google-Maps style):
// posted when a drive starts, cleared when it stops. On Android it's an ongoing
// (sticky) notification; iOS shows one that lingers in the notification centre.
//
// Uses a FIXED identifier so re-posting REPLACES (never stacks two cars) and so
// clearing works reliably even after an app restart (a module-level id would be
// lost). clearDrivingNotification also sweeps any lingering "Currently driving"
// notifications (e.g. stale ones from older builds) so they can't get stuck.
//
// All native access is behind dynamic import() + try/catch so this is safe to
// ship over-the-air onto a binary that lacks expo-notifications.
import { Platform } from 'react-native';

const NOTIF_ID = 'currently-driving';

export async function showDrivingNotification(vehicleName) {
  try {
    const Notifications = await import('expo-notifications');
    const { ensureNotificationsReady } = await import('./notifications');
    if (!(await ensureNotificationsReady())) return;
    await clearDrivingNotification();
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID,
      content: {
        title: `Currently driving ${vehicleName || 'a vehicle'}`,
        body: 'Tap "Stop Driving" in the app when you park.',
        sticky: true,
        autoDismiss: false,
        ...(Platform.OS === 'android' ? { channelId: 'drives' } : {}),
      },
      trigger: null,
    });
  } catch { /* native module absent (OTA on old binary) — no-op */ }
}

export async function clearDrivingNotification() {
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID).catch(() => {});
    await Notifications.dismissNotificationAsync(NOTIF_ID).catch(() => {});
    // Sweep any lingering "Currently driving" notifications (incl. legacy ones
    // posted with random ids by older builds) so nothing gets stuck on-screen.
    const presented = await Notifications.getPresentedNotificationsAsync().catch(() => []);
    for (const n of (presented || [])) {
      const title = n?.request?.content?.title || '';
      if (title.startsWith('Currently driving')) {
        await Notifications.dismissNotificationAsync(n.request.identifier).catch(() => {});
      }
    }
  } catch { /* no-op */ }
}
