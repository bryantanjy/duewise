import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

export async function openNotificationSettings() {
  const packageName = Constants.expoConfig?.android?.package;
  if (Platform.OS === 'android' && packageName) {
    try {
      await Linking.sendIntent('android.settings.CHANNEL_NOTIFICATION_SETTINGS', [
        { key: 'android.provider.extra.APP_PACKAGE', value: packageName },
        { key: 'android.provider.extra.CHANNEL_ID', value: 'duewise-reminders' },
      ]);
      return;
    } catch {
      // Some Android vendors do not expose channel settings through this intent.
    }
  }
  await Linking.openSettings();
}
