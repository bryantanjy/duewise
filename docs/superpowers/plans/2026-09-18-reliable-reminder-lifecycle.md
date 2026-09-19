# Reliable Reminder Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make item mutations preserve committed data and durably clean up native notifications across success and failure paths.

**Architecture:** Keep reminder-day rows as persistent configuration, stage new native notifications before destructive database changes, and enqueue obsolete notification IDs in SQLite. A cleanup worker cancels queued IDs and retains failures for retry.

**Tech Stack:** Expo SDK 57, Expo SQLite, Drizzle ORM 1 RC, Expo Notifications 57, TypeScript 6, Node test runner

**Spec:** `docs/superpowers/specs/2026-09-18-v1-functional-completion-design.md`

## Global Constraints

- Device notification APIs are external side effects and cannot be part of SQLite transactions.
- Existing item and reminder state must remain committed until replacement notifications are staged.
- Archive must preserve `daysBefore` reminder configuration.
- Every cancellation failure must remain durable for retry.
- Permission denial and past trigger dates are skipped outcomes, not exceptions.
- Use exact Expo SDK 57 and installed Drizzle APIs.
- Work test-first and run the full suite after each task.

---

### Task 1: Cleanup queue schema and migration

**Files:**
- Modify: `src/db/schema.ts`
- Create: the migration SQL file in the new directory printed by `npx.cmd drizzle-kit generate`
- Create: the snapshot JSON file in that same generated directory
- Modify: `drizzle/migrations.js`
- Create: `tests/notification-cleanup-model.test.mjs`
- Create: `src/utils/notification-cleanup-model.ts`

**Interfaces:**
- Produces: `notificationCleanup` table and `uniqueNotificationIds(ids: Array<string | null>): string[]`.
- Consumed by: cleanup worker and all item mutations.

- [ ] **Step 1: Write the failing cleanup-model test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';

let uniqueNotificationIds;
try {
  ({ uniqueNotificationIds } = await import('../src/utils/notification-cleanup-model.ts'));
} catch {}

test('cleanup IDs exclude nulls, blanks, and duplicates', () => {
  assert.deepEqual(
    uniqueNotificationIds(['native-1', null, '', 'native-1', 'native-2']),
    ['native-1', 'native-2'],
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --experimental-strip-types --test tests/notification-cleanup-model.test.mjs`

Expected: FAIL because the utility is missing.

- [ ] **Step 3: Implement ID normalization**

```ts
export function uniqueNotificationIds(ids: Array<string | null>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id?.trim())))];
}
```

- [ ] **Step 4: Add the cleanup table**

```ts
export const notificationCleanup = sqliteTable('notification_cleanup', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  notificationId: text('notification_id').notNull().unique(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
```

- [ ] **Step 5: Generate and register the migration**

Run: `npx.cmd drizzle-kit generate`

Expected: one new migration containing `CREATE TABLE notification_cleanup` with a unique constraint on `notification_id`.

Add the generated SQL import and migration entry to `drizzle/migrations.js`, following the existing `m0000` and `m0001` pattern. Do not edit earlier migrations.

- [ ] **Step 6: Verify migration compilation and tests**

Run: `node --experimental-strip-types --test tests/notification-cleanup-model.test.mjs`

Expected: 1 test passes.

Run: `npx.cmd tsc --noEmit`

Expected: exit 0.

- [ ] **Step 7: Commit schema and model**

```bash
git add src/db/schema.ts src/utils/notification-cleanup-model.ts tests/notification-cleanup-model.test.mjs drizzle
git commit -m "feat: add durable notification cleanup queue"
```

### Task 2: Notification adapter and cleanup worker

**Files:**
- Modify: `src/services/notifications.ts`
- Create: `src/services/notification-cleanup.ts`
- Create: `tests/notification-cleanup.test.mjs`

**Interfaces:**
- Produces: `NotificationAdapter`, `deviceNotificationAdapter`, `enqueueNotificationCleanup(ids)`, and `processNotificationCleanup(cancel?)`.
- Consumed by: item operations and root startup.

- [ ] **Step 1: Write the failing cleanup behavior test**

Use a platform-neutral exported worker helper:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

let processCleanupRows;
try {
  ({ processCleanupRows } = await import('../src/utils/notification-cleanup-model.ts'));
} catch {}

test('cleanup reports successful and failed native cancellations', async () => {
  const result = await processCleanupRows(
    [
      { id: 1, notificationId: 'ok' },
      { id: 2, notificationId: 'fail' },
    ],
    async (id) => {
      if (id === 'fail') throw new Error('offline');
    },
  );

  assert.deepEqual(result.completedIds, [1]);
  assert.deepEqual(result.failures, [{ id: 2, message: 'offline' }]);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --experimental-strip-types --test tests/notification-cleanup.test.mjs`

Expected: FAIL because `processCleanupRows` is missing.

- [ ] **Step 3: Implement the platform-neutral worker helper**

```ts
type CleanupRow = { id: number; notificationId: string };

export async function processCleanupRows(
  rows: CleanupRow[],
  cancel: (notificationId: string) => Promise<void>,
) {
  const completedIds: number[] = [];
  const failures: Array<{ id: number; message: string }> = [];
  for (const row of rows) {
    try {
      await cancel(row.notificationId);
      completedIds.push(row.id);
    } catch (error) {
      failures.push({
        id: row.id,
        message: error instanceof Error ? error.message : 'Unable to cancel notification.',
      });
    }
  }
  return { completedIds, failures };
}
```

- [ ] **Step 4: Export a narrow device adapter**

```ts
export type NotificationAdapter = {
  cancel(notificationId: string): Promise<void>;
  schedule(input: ItemReminderInput): Promise<string | null>;
};

export const deviceNotificationAdapter: NotificationAdapter = {
  cancel: Notifications.cancelScheduledNotificationAsync,
  schedule: scheduleItemReminder,
};
```

Make `ItemReminderInput` exported. Remove `cancelScheduledNotifications`; all cancellation goes through the cleanup worker.

- [ ] **Step 5: Implement persistent cleanup processing**

`enqueueNotificationCleanup` inserts normalized IDs with `onConflictDoNothing`. `processNotificationCleanup` selects all queue rows, calls `processCleanupRows`, deletes completed rows, and increments `attempts` plus `lastError` for failures.

Use exact Drizzle operations:

```ts
await db.insert(notificationCleanup).values(
  ids.map((notificationId) => ({ notificationId })),
).onConflictDoNothing();
```

Update and delete each returned row by `id` so failure metadata remains attached to the correct native identifier.

- [ ] **Step 6: Run focused, full, and type tests**

Run: `node --experimental-strip-types --test tests/notification-cleanup.test.mjs`

Expected: 1 test passes.

Run: `node --experimental-strip-types --test tests/*.test.mjs`

Expected: all tests pass.

Run: `npx.cmd tsc --noEmit`

Expected: exit 0.

- [ ] **Step 7: Commit the cleanup worker**

```bash
git add src/services/notifications.ts src/services/notification-cleanup.ts src/utils/notification-cleanup-model.ts tests/notification-cleanup.test.mjs
git commit -m "feat: retry failed notification cancellations"
```

### Task 3: Testable reminder staging

**Files:**
- Create: `src/services/reminder-staging.ts`
- Create: `tests/reminder-staging.test.mjs`

**Interfaces:**
- Consumes: `NotificationAdapter.schedule`, item ID/name/date, reminder days.
- Produces: `stageReminders(input, schedule): Promise<StagedReminderResult>` or `ReminderStagingError` containing already-created IDs.

- [ ] **Step 1: Write failing staging tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';

let ReminderStagingError;
let stageReminders;
try {
  ({ ReminderStagingError, stageReminders } = await import('../src/services/reminder-staging.ts'));
} catch {}

const input = {
  itemId: 4,
  itemName: 'Road tax',
  reminderDays: [30, 7, 0],
  targetDate: '2027-09-18',
};

test('staging retains configured days and scheduled versus skipped counts', async () => {
  const result = await stageReminders(input, async ({ daysBefore }) =>
    daysBefore === 7 ? null : `native-${daysBefore}`,
  );
  assert.deepEqual(result.rows, [
    { daysBefore: 30, notificationId: 'native-30' },
    { daysBefore: 7, notificationId: null },
    { daysBefore: 0, notificationId: 'native-0' },
  ]);
  assert.deepEqual(result.createdNotificationIds, ['native-30', 'native-0']);
  assert.equal(result.skippedReminderCount, 1);
});

test('staging error exposes identifiers already created for compensation', async () => {
  await assert.rejects(
    stageReminders(input, async ({ daysBefore }) => {
      if (daysBefore === 7) throw new Error('native failure');
      return `native-${daysBefore}`;
    }),
    (error) => {
      assert.equal(error instanceof ReminderStagingError, true);
      assert.deepEqual(error.createdNotificationIds, ['native-30']);
      return true;
    },
  );
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --experimental-strip-types --test tests/reminder-staging.test.mjs`

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement staging and typed compensation error**

Implement sequential scheduling so each created ID is recorded before the next call. `ReminderStagingError` extends `Error`, stores `createdNotificationIds`, and uses the original error message. The successful result contains `rows`, `createdNotificationIds`, and `skippedReminderCount` exactly as asserted.

- [ ] **Step 4: Run focused and full tests**

Run: `node --experimental-strip-types --test tests/reminder-staging.test.mjs`

Expected: 2 tests pass.

Run: `node --experimental-strip-types --test tests/*.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Commit reminder staging**

```bash
git add src/services/reminder-staging.ts tests/reminder-staging.test.mjs
git commit -m "refactor: stage item reminders safely"
```

### Task 4: Failure-safe create, edit, and renew

**Files:**
- Modify: `src/services/items.ts`
- Create: `src/services/item-operations.ts`
- Modify: `src/utils/dates.ts`
- Create: `tests/item-service-planning.test.mjs`
- Create: `tests/item-operations.integration.test.mjs`
- Create: `tests/support/sqlite-item-repository.mjs`
- Create: `tests/dates.test.mjs`

**Interfaces:**
- Consumes: `stageReminders`, `enqueueNotificationCleanup`, `processNotificationCleanup`, Drizzle transactions.
- Produces: `createItemOperations(dependencies)` plus unchanged public `createItem`, `updateItem`, and `renewItem` wrappers, now with compensation.

- [ ] **Step 1: Add leap-year regression tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { nextYearDate } from '../src/utils/dates.ts';

test('yearly renewal preserves month and clamps leap day', () => {
  assert.equal(nextYearDate('2028-02-29'), '2029-02-28');
  assert.equal(nextYearDate('2027-10-31'), '2028-10-31');
});
```

- [ ] **Step 2: Run the date test**

Run: `node --experimental-strip-types --test tests/dates.test.mjs`

Expected: 1 test passes, characterizing existing correct behavior before service refactoring.

- [ ] **Step 3: Extract item mutation plans for testability**

Create pure helpers in `tests/item-service-planning.test.mjs` expectations and then export implementations from `src/services/items.ts`:

```ts
export function oldNotificationIds(
  rows: Array<{ notificationId: string | null }>,
) {
  return uniqueNotificationIds(rows.map(({ notificationId }) => notificationId));
}

export function itemOperationResult(
  itemId: number,
  staged: { createdNotificationIds: string[]; skippedReminderCount: number },
): CreateItemResult {
  return {
    itemId,
    scheduledReminderCount: staged.createdNotificationIds.length,
    skippedReminderCount: staged.skippedReminderCount,
  };
}
```

Test literal inputs for null/duplicate old IDs and scheduled/skipped counts. Run the test once before adding the exports to verify RED, then add the helpers and verify GREEN.

- [ ] **Step 4: Define the injected operation boundary**

Create `src/services/item-operations.ts` with these exact public contracts:

```ts
export type StoredReminder = { daysBefore: number; notificationId: string | null };
export type StoredItemBundle = {
  item: {
    archived: boolean;
    id: number;
    name: string;
    repeatType: string;
    targetDate: string;
  };
  reminders: StoredReminder[];
};

export type ItemOperationRepository = {
  createItemRecord(input: CreateItemInput): Promise<number>;
  getItemBundle(itemId: number): Promise<StoredItemBundle | undefined>;
  commitCreatedReminders(itemId: number, rows: StoredReminder[]): Promise<void>;
  commitEdit(args: {
    input: CreateItemInput;
    itemId: number;
    oldNotificationIds: string[];
    reminders: StoredReminder[];
  }): Promise<void>;
  commitRenew(args: {
    itemId: number;
    newTargetDate: string;
    oldNotificationIds: string[];
    previousTargetDate: string;
    reminders: StoredReminder[];
  }): Promise<void>;
  commitArchive(args: { itemId: number; oldNotificationIds: string[] }): Promise<void>;
  commitRestore(args: { itemId: number; reminders: StoredReminder[] }): Promise<void>;
  commitDelete(args: { itemId: number; oldNotificationIds: string[] }): Promise<void>;
  deleteProvisionalItem(itemId: number): Promise<void>;
};

export type ItemOperationDependencies = {
  cleanup(ids: string[]): Promise<void>;
  repository: ItemOperationRepository;
  schedule: NotificationAdapter['schedule'];
};

export type ItemOperations = {
  createItem(input: CreateItemInput): Promise<CreateItemResult>;
  updateItem(itemId: number, input: CreateItemInput): Promise<CreateItemResult>;
  renewItem(itemId: number): Promise<CreateItemResult>;
  archiveItem(itemId: number): Promise<void>;
  restoreItem(itemId: number): Promise<CreateItemResult>;
  deleteItem(itemId: number): Promise<void>;
};
```

Export `createItemOperations(dependencies: ItemOperationDependencies): ItemOperations`. Steps 5–7 provide create/edit/renew; Task 5 provides archive/restore/delete. `src/services/items.ts` implements the Expo Drizzle repository methods with transactions and exports wrappers bound to `deviceNotificationAdapter`. This keeps native modules out of Node integration tests.

- [ ] **Step 5: Rewrite create with compensation**

Insert the item first, stage reminders, then use a Drizzle transaction to insert reminder rows. On `ReminderStagingError` or transaction failure:

1. enqueue `createdNotificationIds`;
2. process cleanup;
3. delete the provisional item;
4. rethrow the original error.

Do not delete an item after returning a valid skipped result.

- [ ] **Step 6: Rewrite edit as stage then swap**

Read the existing item and reminders. Throw `Item not found.` before scheduling when absent. Stage replacements. In one Drizzle transaction:

1. update item fields;
2. delete old reminder rows;
3. insert staged reminder rows;
4. enqueue old native IDs using the transaction object.

If the transaction fails, enqueue the staged IDs and process them; old committed state stays unchanged. After commit, process old cleanup IDs.

- [ ] **Step 7: Rewrite renew as stage then transact**

Reject non-yearly and archived items with `Only active yearly items can be renewed.` Stage against `nextYearDate`. In one transaction:

1. insert the `renewed` history row;
2. update target date and timestamp;
3. replace reminder rows;
4. enqueue old native IDs.

Use the same staged-ID compensation and post-commit cleanup as edit.

- [ ] **Step 8: Add isolated SQLite integration coverage**

Use Node 24 `DatabaseSync(':memory:')` in `tests/support/sqlite-item-repository.mjs`. Create the `items`, `reminders`, `item_history`, and `notification_cleanup` tables with the same columns and foreign keys as the application schema, enable `PRAGMA foreign_keys = ON`, and implement every `ItemOperationRepository` method with prepared SQL and explicit `BEGIN`/`COMMIT`/`ROLLBACK`.

In `tests/item-operations.integration.test.mjs`, bind `createItemOperations` to that repository and deterministic adapters. Cover these literal scenarios:

1. Create stores `[30, 0]`, schedules one ID, and reports one skipped reminder.
2. Edit scheduling throws after one native ID; the old item name, target date, reminder rows, and IDs remain unchanged, and the staged ID is passed to cleanup.
3. Successful edit replaces stored state and passes old IDs to cleanup.
4. Renewing `2028-02-29` writes history from `2028-02-29` to `2029-02-28` and preserves reminder days.

Run the integration test before the operation factory exists to verify RED, then after implementation to verify GREEN.

- [ ] **Step 9: Run all verification for mutation services**

Run: `node --experimental-strip-types --test tests/*.test.mjs`

Expected: all tests pass.

Run: `npx.cmd tsc --noEmit`

Expected: exit 0.

- [ ] **Step 10: Commit mutation hardening**

```bash
git add src/services/items.ts src/services/item-operations.ts src/utils/dates.ts tests/item-service-planning.test.mjs tests/item-operations.integration.test.mjs tests/support/sqlite-item-repository.mjs tests/dates.test.mjs
git commit -m "fix: preserve item state during reminder updates"
```

### Task 5: Archive, restore, and delete service behavior

**Files:**
- Modify: `src/services/items.ts`
- Create: `tests/archive-service-model.test.mjs`

**Interfaces:**
- Extends: `createItemOperations` with archive/restore/delete implementations through the repository contracts defined in Task 4.
- Produces: `archiveItem(id)`, `restoreItem(id): Promise<CreateItemResult>`, and `deleteItem(id)` using durable cleanup.
- Consumed by: archived UI plan.

- [ ] **Step 1: Write failing archive-model tests**

Add pure exported helpers and tests proving:

```js
assert.deepEqual(
  archivedReminderRows([
    { daysBefore: 30, notificationId: 'native-30' },
    { daysBefore: 0, notificationId: null },
  ]),
  [
    { daysBefore: 30, notificationId: null },
    { daysBefore: 0, notificationId: null },
  ],
);
```

Also assert that the original old ID list is `['native-30']`. Run once and verify RED before implementing.

- [ ] **Step 2: Implement archive transaction**

Read reminder IDs. In one transaction mark `archived: true`, set all reminder `notificationId` values to null without deleting rows, and enqueue old IDs. Process cleanup after commit.

- [ ] **Step 3: Implement restore stage then transaction**

Require an existing archived item. Read retained `daysBefore` values, stage eligible notifications, then transact `archived: false`, replace reminder rows with staged rows, and update `updatedAt`. Compensate staged IDs on transaction failure. Return scheduled/skipped counts.

- [ ] **Step 4: Implement permanent delete transaction**

Read existing native IDs. In one transaction enqueue them and delete the item. Let foreign-key cascades delete reminders and history. Process cleanup after commit.

- [ ] **Step 5: Extend isolated SQLite integration coverage**

Add these cases to `tests/item-operations.integration.test.mjs`:

1. Archive sets `archived = 1`, retains the same `days_before` rows, nulls native IDs, and sends old IDs to cleanup.
2. Restore stages eligible reminders, sets `archived = 0`, and stores replacement native IDs.
3. Restore transaction failure passes staged IDs to cleanup and leaves the item archived.
4. Permanent delete removes the item, reminders, and history while sending the active native IDs to cleanup.

- [ ] **Step 6: Run full tests and TypeScript**

Run: `node --experimental-strip-types --test tests/*.test.mjs`

Expected: all tests pass.

Run: `npx.cmd tsc --noEmit`

Expected: exit 0.

- [ ] **Step 7: Commit archive services**

```bash
git add src/services/items.ts src/services/item-operations.ts tests/archive-service-model.test.mjs tests/item-operations.integration.test.mjs tests/support/sqlite-item-repository.mjs
git commit -m "feat: preserve reminders across archive restore"
```

### Task 6: Startup cleanup and persistence verification

**Files:**
- Modify: `src/app/_layout.tsx`
- Create: `tests/database-cleanup-schema.test.mjs`

**Interfaces:**
- Consumes: completed database setup and `processNotificationCleanup`.
- Produces: automatic retry of pending cancellations after startup.

- [ ] **Step 1: Execute the new migration against in-memory SQLite**

Use Node 24 `DatabaseSync` in the test. Read the generated cleanup migration SQL, replace `--> statement-breakpoint` markers with newlines, execute it, insert a row, reject a duplicate native ID, and assert `attempts` defaults to zero. This tests SQLite behavior rather than source text.

- [ ] **Step 2: Run and verify the schema test**

Run: `node --test tests/database-cleanup-schema.test.mjs`

Expected: PASS with one successful row and one unique-constraint rejection.

- [ ] **Step 3: Start cleanup after database readiness**

In the root layout, after `success && seedComplete`, dynamically import `processNotificationCleanup` outside Android Expo Go and invoke it without blocking UI. Catch and retain failures in the queue; do not turn cleanup failure into a database setup failure.

- [ ] **Step 4: Run full verification**

Run: `node --experimental-strip-types --test tests/*.test.mjs`

Expected: all tests pass.

Run: `npx.cmd tsc --noEmit`

Expected: exit 0.

Run: `git diff --check`

Expected: exit 0; line-ending warnings are acceptable.

- [ ] **Step 5: Commit startup cleanup**

```bash
git add src/app/_layout.tsx tests/database-cleanup-schema.test.mjs
git commit -m "feat: retry notification cleanup at startup"
```
