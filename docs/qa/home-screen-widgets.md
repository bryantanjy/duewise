# Home-screen widget verification

Implemented for Android and iOS. This feature adds native code and an iOS widget extension; an OTA update or Expo Go cannot add it to an existing binary.

## Build and add

- Android: use `npm run android` to regenerate native configuration before building/installing. Calling `npx expo run:android` directly can reuse stale native files. For an EAS build, omit generated native folders from the uploaded source so EAS runs prebuild.
- iOS: build on macOS or EAS with the new widget extension. The app bundle is `com.bryan.duewise`, the extension is `com.bryan.duewise.widgets`, and the app group is `group.com.bryan.duewise`. Provision the app and extension with the same app group.
- Open Duewise once after installation so migrations finish and the widget receives data.
- Open Settings → Home-screen widget. Android requests the launcher's Add prompt when supported; iOS shows instructions for the widget gallery.

## Expected behavior

- Widget rows contain active reminders due today or later, sorted by due date. Dates match the app; recurring reminders advance when marked done.
- Android shows up to three rows according to widget height and font scale. iOS shows one row in small, two in medium, and three in large.
- Overdue reminders have a separate count. Tapping that count opens the overdue filter. iOS small widgets use one tap destination: the first upcoming reminder, or the reminders list when empty.
- Both light and dark device appearances are supported. Reminder names are visible on the home screen; notes and notification IDs are not sent to the widget.
- Mutations and backup imports trigger a debounced refresh while the app runs. Foregrounding the app retries refreshes.
- Android requests background refresh every 30 minutes, subject to launcher/OS scheduling. iOS receives 32 daily timeline entries on refresh. Open the app to refresh after the timeline expires or after a timezone change. OS refresh timing is not exact.

## Device checklist

1. Add reminders with different dates, plus an archived and an overdue reminder. Verify order, archived exclusion and overdue count.
2. Add multiple widgets. Resize Android instances; test all three iOS sizes. Test light/dark mode and large text; enlarge Android widgets when necessary.
3. Tap rows and the overdue count with the app open, backgrounded and terminated. Verify the intended reminder/filter opens.
4. Create, edit, complete, archive, restore and delete reminders. Import a backup. Verify widgets reflect committed data.
5. Leave the widget installed across midnight with the app closed. Verify labels and overdue counts advance when the OS renders the next update.
6. Remove every upcoming reminder. Confirm the empty state and overdue access remain usable.
7. Open an older binary or Expo Go. Confirm the main app still opens and Settings explains that a new build is needed.

JavaScript exports and config introspection do not prove native compilation or launcher rendering. Complete this checklist on new Android and iOS binaries.
