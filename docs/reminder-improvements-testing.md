# Testing reminder improvements

Run `npm run android` with an Android device connected and USB debugging enabled. For an installed development client, use `npx expo start --dev-client`.

## Repeat options

Create or edit an item and choose Never, Daily, Weekly, Monthly, Yearly, or Every N days (1-3650). Save, reopen, and confirm the selection is retained.

Repeats advance when you mark the current occurrence done. Repeating items schedule the next occurrence; one-time items move to the archive. Overdue repeat dates are skipped to the next current or future date. Short months clamp to their last day. The selected reminder time is retained.

The calendar projects repeat dates. Future occurrences become scheduled notifications when the current occurrence is completed.

## Notification actions

Create a reminder due today with its time a few minutes ahead and select the on-the-day alert. Allow notification permission and save. Background the app and wait for the notification. Expand the notification to reveal the buttons.

- Snooze 1 hour schedules a new alert one hour from the tap. The item details should show that alert as the next reminder.
- Mark done archives a one-time item or advances a repeating item.
- Repeat with the app closed to check cold-start handling.
- Old notifications from a previous occurrence must not complete the new occurrence.
- Archive or delete a snoozed item and confirm its snoozed alert is cancelled.

Actions bring the app to the foreground to finish processing. Existing notifications created before this update need an edit and save to gain the new actions.

## Reminder status

Open item details and check the next reminder date/time and per-alert status. Turn off notification permission in device settings, return to the app, and confirm it offers Open notification settings. Re-enable permission, review the reminder dates, and save to schedule future alerts again. Past or already-delivered alerts must not remain labelled Scheduled just because their IDs are in the database.

## Automated checks

- `node --experimental-strip-types --test tests/*.test.mjs`
- `npx tsc --noEmit`
- `npx expo export --platform android --platform ios --output-dir .expo/verify-reminder-improvements`

Native delivery and notification button presentation still require a real-device check.


## Reminder clarity

- Open an active reminder and expand its schedule. Each configured alert should show a local date and time. The next alert must come from the phone notification queue, including snoozes.
- Disable notification permission in device settings and return. Details should offer Open notification settings; after enabling permission, return and retry missing future alerts if needed.
- For a reminder with past and future alert times, missing past alerts should say Time passed. Only missing future alerts should offer a scheduling retry.
- If queue verification fails, Check schedule again should recheck without recreating alerts.
- Complete a repeating reminder. Stay on Details and show Completed with the actual next due date. Confirm it matches the updated due-date card, including overdue reminders that skip missed dates.
- Complete a one-time reminder and accept confirmation. It should stay visible as archived, show completion feedback, and offer Restore reminder.
- Verify recurrence explanation for daily, weekly, monthly, yearly, and custom intervals. Completing early advances from the due date, rather than from the completion date.
