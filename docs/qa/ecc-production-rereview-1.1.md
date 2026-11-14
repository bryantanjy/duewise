# Duewise 1.1.0 ? ECC production re-review

Date: 2026-10-25. Reviewed commit: `5fa90fb` (README), including hardening commit `9942e13`. The working tree was clean at review start. Workflow: ECC production-audit 2.2.3. No application code was modified and no source was uploaded to an external audit service.

**Assessment: 76/100 ? improved readiness, with two reminder-correctness issues to fix before wider distribution.** This is a prioritization judgment, not a security certification or evidence of native-device acceptance.

## Previously reported findings

| Earlier finding | Re-review result |
| --- | --- |
| Android exact-time claims | Addressed through explicit approximate-delivery wording in the form, Details, and Settings. Exact-to-the-minute delivery remains outside the current design. |
| Disabled Android reminder channel not detected | Addressed in status and scheduling paths; blocked/missing channels have distinct recovery. Tests pass. |
| Extra overlay/legacy storage permissions | Blocking entries confirmed in the current Expo configuration and generated manifest introspection. Final APK manifest still requires inspection. |
| Android system backups/privacy mismatch | Automatic backup is disabled and legacy/cloud/device-transfer exclusions are configured; manual-backup guidance is present. Actual OEM backup behavior is not verified. |
| Earliest populated schema migration failure | Migration regression tests pass for fresh, earliest populated, and finalized-1.0 databases, plus failure/foreign-key rollback cases. |

## Remaining findings

### 1. High ? A stale UI completion can advance an already-completed occurrence again

Evidence: the repeating-reminder handler at `src/app/item/[id].tsx:124-130` calls `renewItem(item.id)` without the displayed target date. `src/services/items.ts:207-209` serializes renewals, but has no expected-occurrence guard. In contrast, notification completion uses `completeItem(itemId, expectedTargetDate)` at lines 224-230, which checks the occurrence date.

Reproduction: using the production services, installed Drizzle Expo driver, and an isolated SQLite database, create a monthly reminder due 2099-01-01. Queue `completeItem(id, '2099-01-01')` followed immediately by `renewItem(id)`, representing a notification completion followed by an already-triggered stale Details action. The stored due date becomes **2099-03-01**, with **two** renewal-history entries. One completion would produce 2099-02-01.

Impact: serialization prevents overlapping writes but does not make two actions for the same displayed occurrence idempotent. The next occurrence can be skipped in this race. The UI's local busy lock does not cover a separate notification action.

Recommendation: make every completion entry point carry and validate the expected target date inside the per-item mutation lock. Preserve accurate scheduling counts and feedback for successful and stale/no-op completions. Add a production-service regression covering notification/UI ordering and repeated stale completion.

### 2. Medium ? Retrying future alerts silently cancels an active snooze

Evidence: `src/services/item-operations.ts:135-145` collects all old notification IDs, schedules only non-snooze rows, replaces reminder rows, and cancels all old IDs. The repository implementation replaces the complete reminder set, including snoozes. Details uses this operation for Retry future alerts.

Reproduction: create a reminder with a regular alert and a stored active snooze. Invoke the production `rescheduleItem(id)` service with mocked native scheduling/cancellation and real isolated SQLite persistence. The active snooze ID is cancelled and zero snooze rows remain afterward. The replacement regular alert does not preserve the snoozed delivery time.

Impact: recovering a missing regular alert can remove an independent one-hour reminder that the user still expects to receive, without warning.

Recommendation: preserve valid snooze rows and exclude their IDs from cancellation during a repair-only retry, or explicitly warn that retrying resets snoozes. Keep edit, completion, and archive semantics separate from repair semantics. Add a production-service regression with both regular and snoozed alerts.

### 3. Medium ? Time-zone changes have no floating-local-time reconciliation

Evidence: date notifications store an absolute Date and `scheduledFor` ISO timestamp in `src/services/notifications.ts:104-123`. `src/hooks/use-reminder-status.ts` refreshes permission/queue status but does not reschedule when the device time zone changes. No time-zone reconciliation path was found.

Local date probe: scheduling 2099-01-02 at 09:00 in Asia/Kuala_Lumpur produces 2099-01-02T01:00:00Z. Under America/Los_Angeles, the same queued instant is 17:00 on the preceding local date. Re-saving the requested 09:00 in the new zone would produce a different instant.

Scope: this is a product-policy limitation, not proof of a native delivery failure. README already states that local time is evaluated when scheduled. Users expecting the selected hour to follow them while travelling need clearer behavior.

Recommendation: explicitly choose fixed-instant or floating-local-time semantics. If reminders should follow device-local time, detect zone changes and safely rebuild regular future alerts while preserving snooze semantics; otherwise show the scheduling zone/instant clearly. Verify on a device across a zone change and daylight-saving boundary where applicable.

### 4. Release validation remains incomplete

All automated checks below pass, but the repository acceptance matrix still records native cases as Not run. No final APK, merged release manifest, Play Protect warning details, or physical-device test results were supplied for this review. No repository CI workflow was found.

Before public distribution, verify the rebuilt APK on a phone: channel-only disable/re-enable, idle delivery, reboot, notification actions while Details is open, backup picker behavior, populated-version upgrades, and Android backup/transfer exclusions. Bundle exports and Node mocks cannot establish these outcomes. Consider CI for tests, TypeScript, lint, and configuration checks.

## Evidence checked

- `node --experimental-strip-types --test tests/*.test.mjs`: **116 passed, 0 failed**.
- TypeScript and Expo lint: passed.
- `expo config --type introspect`: generated manifest still has `allowBackup=false`, both backup-rule references, and all three permission-removal entries.
- Production-service probes used isolated SQLite persistence and mocked native scheduling/cancellation. Results: retry cancelled the active snooze; queued notification/UI completion advanced twice. No real reminder or phone data was used.
- JavaScript time-zone probe confirmed fixed-instant conversion as described.
- Migration/backup-policy regression coverage, current notifications, completion paths, build configuration, and release documentation inspected.
- No new native export was necessary for this review: the only commit after the previously verified source was documentation. The prior Android/iOS export results are historical evidence, not newly run device tests.
- No dependency-vulnerability scanner, full binary/security scan, or external source upload was performed.

## Next action

First make UI and notification completion share an expected-occurrence guard. Then preserve snoozes during alert repair, add regressions for both, rebuild the APK, and complete the phone acceptance pass. Treat time-zone semantics as an explicit product decision rather than assuming queue refresh changes scheduled times.
