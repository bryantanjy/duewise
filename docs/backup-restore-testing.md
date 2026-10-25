# Backup and restore

Rebuild the app with `npm run android` to include the native file picker. Then open Settings > Backup & Restore.

1. Save a backup to a folder you choose. Confirm the JSON file appears in that folder. Cancelling folder selection should create no file.
2. Choose the saved file to restore. Review the active, archived, and matching-item counts. Cancel once to verify no records change.
3. Restore on another installation. Confirm dates, times, recurrence, notes, categories, archive state, and renewal history.
4. Import the same file again. Matching items should be skipped. Existing reminders should be kept.
5. Try malformed JSON and a file larger than 10 MB. Both should be rejected before any database changes.
6. Disable notification permission and restore a new item. Its data should remain saved while the result reports unscheduled alerts. Enable permission, then edit and save the item to schedule future alerts.

Backups are unencrypted JSON files containing reminder details. Device notification IDs, cleanup records, temporary snoozes, and appearance preferences are not included. Alerts are recreated on the destination phone; past alerts are skipped. Restoring adds data rather than replacing the database. Reminders that have changed since the backup can be imported as separate items.

Automated checks: `node --experimental-strip-types --test tests/*.test.mjs`, `npx tsc --noEmit`, and native Expo exports. Folder permissions and OS notification delivery still require a real-device check.
