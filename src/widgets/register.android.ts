import { isRunningInExpoGo } from 'expo';
import { TurboModuleRegistry } from 'react-native';

if (!isRunningInExpoGo() && TurboModuleRegistry.get('AndroidWidget')) {
  // Keep Expo Go and binaries built before widgets were added usable.
  // Registration must be synchronous, before Expo Router starts the app.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { registerWidgetTaskHandler } = require('react-native-android-widget') as typeof import('react-native-android-widget');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { widgetTaskHandler } = require('./widget-task.android') as typeof import('./widget-task.android');
  registerWidgetTaskHandler(widgetTaskHandler);
}
