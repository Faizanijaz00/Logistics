// Local-notification plumbing for the drive-detection prompts. Two categories,
// each with a single "Yes" action button so the driver can start/stop a drive
// straight from the notification without opening the app.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const CATEGORY_DRIVE_START = 'DRIVE_START';
export const CATEGORY_DRIVE_END = 'DRIVE_END';
export const ACTION_START_DRIVE = 'START_DRIVE';
export const ACTION_END_DRIVE = 'END_DRIVE';

// Show the alert even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let _configured = false;

// Request permission + register the action-button categories. Safe to call
// repeatedly; only does the work once.
export async function ensureNotificationsReady() {
  if (_configured) return true;
  try {
    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      });
      granted = req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    }
    if (!granted) return false;

    await Notifications.setNotificationCategoryAsync(CATEGORY_DRIVE_START, [
      { identifier: ACTION_START_DRIVE, buttonTitle: 'Yes, start drive', options: { opensAppToForeground: false } },
    ]);
    await Notifications.setNotificationCategoryAsync(CATEGORY_DRIVE_END, [
      { identifier: ACTION_END_DRIVE, buttonTitle: "Yes, I'm done", options: { opensAppToForeground: false } },
    ]);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('drives', {
        name: 'Drive detection',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    _configured = true;
    return true;
  } catch {
    return false;
  }
}

// Schedule a prompt after `delaySeconds`. Returns the scheduled id (to cancel
// later) or null.
export async function scheduleDrivePrompt({ category, title, body, data, delaySeconds }) {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        categoryIdentifier: category,
        ...(Platform.OS === 'android' ? { channelId: 'drives' } : {}),
      },
      trigger: { seconds: Math.max(1, delaySeconds) },
    });
  } catch {
    return null;
  }
}

export async function cancelPrompt(id) {
  if (!id) return;
  try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
}
