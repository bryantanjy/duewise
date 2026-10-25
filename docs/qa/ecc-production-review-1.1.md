# Duewise 1.1.0 ? ECC production review

Review date: 2026-10-25. Commit: e2852e0. Workflow: ECC production-audit (installed version 2.2.3).

**Assessment: 68/100, suitable for private testing; resolve notification reliability and permission policy before a public release.** This is an engineering judgment, not a security certification. Source and locally generated configuration were reviewed; the installed APK and Google Play Protect verdict were not available.

## Findings

### 1. High ? Scheduled does not mean an exact delivery time on Android

Evidence: `app.json` has no exact-alarm permission or access configuration. `src/services/notifications.ts:104-123` schedules date notifications; `src/hooks/use-reminder-status.ts:24-31` treats global notification permission and queue membership as readiness. The installed Expo Android scheduling delegate uses `setAndAllowWhileIdle` when `canScheduleExactAlarms()` is false, instead of its exact-alarm path.

Impact: on modern Android, an alert can be accepted and displayed as Scheduled while arriving later than the chosen time. Queue existence does not prove exact-time access or delivery.

Recommendation: define whether the product promises approximate or exact alerts. If exact alerts are required, implement the appropriate permission/access check and recovery UI, with permission-policy review for the intended distribution channel. If approximate is intentional, explain possible delays. Test on a physical device with exact-alarm access unavailable and the device idle.

Reference: https://docs.expo.dev/versions/v57.0.0/sdk/notifications/#android

### 2. High ? Disabled reminder channel is not detected

Evidence: `src/hooks/use-reminder-status.ts:24-31` checks `getPermissionsAsync()` and scheduled requests, but never reads the `duewise-reminders` channel. `src/services/notifications.ts:27` creates that channel. Android users can disable a channel while leaving app-wide notification permission enabled.

Impact: Details can show a scheduled/ready alert, with no permission recovery action, even though Android suppresses the reminder channel.

Recommendation: read channel settings on Android and distinguish a disabled channel from global permission denial. Offer a route to notification settings and recheck after returning. Verify by disabling only Duewise reminders, not all app notifications.

### 3. Medium ? Generated release configuration carries unnecessary permissions

Evidence: both `android/app/src/main/AndroidManifest.xml:3-6` and `expo config --type introspect` include SYSTEM_ALERT_WINDOW, READ_EXTERNAL_STORAGE, and WRITE_EXTERNAL_STORAGE. Storage permissions are capped at API 32. `app.json` does not explicitly block them; user-selected backup files use system pickers.

Impact: the app declares more access than its reminder and picker-based backup flows appear to need. This does not show that access was granted, or explain the user's Play Protect warning.

Recommendation: remove or block unneeded permissions in Expo configuration so the change survives cloud prebuild. Confirm the merged release APK manifest, then retest backup and restore on supported Android versions. Do not remove notification or reboot permissions required for reminders.

### 4. Medium ? Cloud-backup behavior needs an explicit privacy decision

Evidence: generated application configuration has `android:allowBackup="true"`; no project backup-exclusion rules were found. Settings describes reminders as staying with the user/on the phone. Android Auto Backup can include internal files, databases, and shared preferences when device backup is enabled.

Impact: a reader may understand the privacy copy as strictly device-only, while Android can include the data in Google-managed backups. This is not evidence that Duewise itself uploads reminder data to a server. Restoring OS-managed data also needs testing separately from the app's JSON import flow.

Recommendation: either document OS-managed backup accurately or configure cloud/device-transfer exclusions consistent with the desired policy. Test a device restore and verify notification reconciliation.

Reference: https://developer.android.com/identity/data/autobackup

### 5. Medium, conditional ? Earliest populated schema cannot complete its category migration

Evidence: `drizzle/20260915154301_yummy_photon/migration.sql:1-13` disables foreign keys inside the transaction and drops the referenced categories table. The installed Drizzle synchronous migrator wraps pending statements in BEGIN/COMMIT; changing foreign_keys inside a transaction does not disable enforcement.

Reproduction: create the first migration's schema with foreign keys enabled, insert a category and an item referencing it, begin a transaction, and run the category migration statement by statement. Result: `FOREIGN KEY constraint failed`. Rollback retained the original item.

Scope: relevant only if users have a database still at the first schema. The finalized 1.0 schema already includes the category migration. A seeded finalized-1.0-to-1.1 probe passed, as did a fresh installation schema probe.

Recommendation: establish whether this legacy upgrade is supported; if so, fix and test migration orchestration without silently editing an already-applied migration's history. Never recommend uninstalling as a migration fix without a verified backup.

## Evidence checked

- Working tree was clean at review start; latest commit e2852e0, app/package version 1.1.0.
- All 103 automated tests passed; TypeScript and Expo lint passed.
- Expo config introspection completed; generated permission and backup configuration inspected.
- Actual notification implementation, response routing, durable cancellation queue, mutation serialization, backup schemas/import transactions, and migration SQL inspected.
- In-memory SQLite probes: fresh schema passed, seeded finalized 1.0 to 1.1 passed, earliest populated schema upgrade failed as described.
- Backup implementation validates size/schema, previews changes, deduplicates at the write boundary, and keeps imported rows durable if notification scheduling fails.
- No checked-in signing-key files, .env files, or credentials.json were returned by the limited tracked-filename check. This was not a full secret or dependency-vulnerability scan.

## Evidence missing

- Exact Play Protect warning and final APK/merged manifest/signature.
- Physical-device delivery, idle/reboot, channel-disabled, timezone-change, backup/restore, and upgrade acceptance for this release.
- No repository CI workflow was found. Existing acceptance documentation records native cases as not run; prior bundle exports and browser component previews do not establish native acceptance.
- No cloud build or external scanner was invoked for this audit. No repository source was uploaded by this review.

## Next action

First fix notification readiness checks (channel state and exact-time capability/wording). Then reduce permissions, decide the OS-backup policy, and run the phone acceptance checklist against a rebuilt APK before wider distribution.


## Remediation implemented after this review

The original findings above describe the pre-fix snapshot. The authorized fixes now:

- Check Android reminder-channel state in addition to app permission and queue contents. Disabled channels do not claim readiness, offer channel settings, and prevent new test/item/snooze scheduling from reporting success. A missing channel offers setup or editing as appropriate.
- Describe Android dates as requested delivery times and explain possible idle-time delays in Details, Settings, and the reminder form. This deliberately keeps approximate alarms rather than introducing exact-alarm special access. Exact-to-the-minute delivery is not promised.
- Block overlay and legacy broad storage permissions in Expo configuration. Android prebuild generated `tools:node="remove"` directives, so library manifests cannot silently reintroduce those declarations during merging.
- Disable Android Auto Backup and generate explicit exclusions for cloud backup and device-to-device transfer, including credential- and device-protected storage. Manual JSON backups remain available. Users must save one before uninstalling or changing phones. This does not delete copies exported previously or establish that older OS-managed backup datasets have been erased.
- Wrap startup migration execution without changing historical SQL. Foreign keys are disabled before Drizzle opens its migration transaction; a guarded commit validates all references before commit, and enforcement is restored afterward. A single shared startup promise prevents duplicate work across React mounts.

Verification: 116 tests passed, including real SQLite tests using the installed Drizzle Expo migrator for fresh, earliest populated, and finalized-1.0 databases; repeat startup; SQL-error rollback; and rollback when a migration would orphan records. TypeScript and lint passed. Android prebuild completed and its manifest/XML policy files were inspected. Both native JavaScript exports passed. Local component checks cover disabled-channel recovery and missing-channel setup.

Still required: rebuild the APK, inspect its final merged manifest, and run physical-device notification/channel, idle-time, picker, and backup-policy acceptance. The source/config fixes cannot change the APK already installed on the phone. The earlier readiness score is not a post-device-test certification.
