import { isRunningInExpoGo, requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { buildCalendarExport, type CalendarExportSource } from '../utils/calendar-export';

export async function exportReminderToCalendar(item: CalendarExportSource): Promise<string | undefined> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') throw new Error('Calendar export is available in the Android and iOS app.');
  const moduleName = Platform.OS === 'ios' ? 'CalendarNext' : 'ExpoCalendar';
  if (isRunningInExpoGo() || !requireOptionalNativeModule(moduleName)) {
    throw new Error('Install the new Duewise build to use calendar export.');
  }
  const event = buildCalendarExport(item);
  if (Platform.OS === 'android') {
    // The supported legacy system-intent entry point avoids reading calendars
    // or requesting calendar access just to show Android's editable event form.
    const Calendar = await import('expo-calendar/legacy');
    await Calendar.createEventInCalendarAsync(event, { startNewActivityTask: false });
    // Android does not report whether the user actually saved or canceled.
    return 'Calendar form closed. Check your calendar to confirm the event was saved. Changes in Duewise do not sync to it.';
  }
  const Calendar = await import('expo-calendar');
  const permission = await Calendar.requestCalendarPermissions(true);
  if (!permission.granted) throw new Error('Allow Duewise to add calendar events in device settings, then try again.');
  const result = await Calendar.getDefaultCalendarSync().addEventWithForm(event);
  if (result.action !== 'saved') return undefined;
  return 'Added to your calendar. This event is a copy; changes in Duewise do not sync to it.';
}
