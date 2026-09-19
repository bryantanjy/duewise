# Archive and Renewal History UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users find, restore, and permanently delete archived items, and inspect yearly renewal history from item details.

**Architecture:** Add one Expo Router screen backed by a live archived-items query. Reuse item-row presentation while keeping restore/delete actions in the archived screen and archived item details. Query history separately so renewal records update live without expanding the main item query.

**Tech Stack:** Expo SDK 57, Expo Router 57, React Native 0.86, Drizzle live queries, Lucide icons, TypeScript 6

**Spec:** `docs/superpowers/specs/2026-09-18-v1-functional-completion-design.md`

## Global Constraints

- V1 remains light-only and must use existing Duewise tokens.
- Archived items retain reminder-day configuration but have no active native IDs.
- Archived items cannot be edited or renewed until restored.
- Permanent delete removes reminders and history through foreign-key cascades.
- All destructive actions require native confirmation.
- Touch targets must remain at least 44 points high.
- Work test-first for presentation models and run TypeScript after each screen.

---

### Task 1: Archived-item presentation model

**Files:**
- Create: `src/utils/archived-item-model.ts`
- Create: `tests/archived-item-model.test.mjs`

**Interfaces:**
- Consumes: archived item query row and current date key.
- Produces: `buildArchivedItemModel(row)` with safe name/category/color and reminder summary.

- [ ] **Step 1: Write the failing model test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';

let buildArchivedItemModel;
try {
  ({ buildArchivedItemModel } = await import('../src/utils/archived-item-model.ts'));
} catch {}

test('archived item model retains identity and reminder configuration', () => {
  assert.deepEqual(
    buildArchivedItemModel({
      categoryColor: '#4F6BED',
      categoryName: 'Vehicle',
      id: 4,
      importance: 'high',
      name: 'Road tax',
      reminderCount: 3,
      repeatType: 'yearly',
      targetDate: '2027-09-18',
    }),
    {
      categoryColor: '#4F6BED',
      categoryName: 'Vehicle',
      id: 4,
      importance: 'high',
      name: 'Road tax',
      reminderLabel: '3 reminder days saved',
      repeatType: 'yearly',
      targetDate: '2027-09-18',
    },
  );
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --experimental-strip-types --test tests/archived-item-model.test.mjs`

Expected: FAIL because the model is missing.

- [ ] **Step 3: Implement the model**

Normalize blank names to `Untitled item`, null category names to `Uncategorized`, null/invalid colors to `#737373`, and format reminder counts as `No reminder days saved`, `1 reminder day saved`, or `${count} reminder days saved`.

- [ ] **Step 4: Run focused and full tests**

Run: `node --experimental-strip-types --test tests/archived-item-model.test.mjs`

Expected: PASS.

Run: `node --experimental-strip-types --test tests/*.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Commit the model**

```bash
git add src/utils/archived-item-model.ts tests/archived-item-model.test.mjs
git commit -m "feat: model archived item presentation"
```

### Task 2: Archived Items screen

**Files:**
- Create: `src/app/archived.tsx`
- Modify: `src/app/settings.tsx`

**Interfaces:**
- Consumes: `restoreItem`, `deleteItem`, archived items/reminder count live query.
- Produces: `/archived` route and Settings navigation entry.

- [ ] **Step 1: Add the archived live query**

Query archived items, left join categories, left join reminders, count reminder IDs by item, group by item columns, filter `items.archived = true`, and order by `items.updatedAt` descending. Map each row through `buildArchivedItemModel`.

- [ ] **Step 2: Build screen states**

The screen must include:

```tsx
<SafeAreaView className="flex-1 bg-app-bg" edges={['top', 'bottom']}>
  <View className="flex-row items-center justify-between px-4 py-2">
    <Pressable accessibilityRole="button" className="h-11 flex-row items-center pr-4" onPress={() => router.back()}>
      <ChevronLeft color="#635BFF" size={22} />
      <Text className="font-semibold text-app-primary">Settings</Text>
    </Pressable>
    <Text className="text-sm font-medium text-app-muted">{models.length} archived</Text>
  </View>
  <ScrollView contentContainerClassName="px-5 pb-12 pt-3">
    <Text className="text-3xl font-bold tracking-tight text-app-text">Archived items</Text>
  </ScrollView>
</SafeAreaView>
```

Add a calm empty card explaining that archived items appear here. For each item, show its name, category dot/name, target date, reminder summary, an `Open details` action, and a primary-soft `Restore` action. Disable all actions for the item whose operation is running.

- [ ] **Step 3: Add restore behavior**

Call `restoreItem(id)`, then route to item details:

```ts
router.replace({
  pathname: '/item/[id]',
  params: {
    id: String(result.itemId),
    restored: '1',
    scheduled: String(result.scheduledReminderCount),
    skipped: String(result.skippedReminderCount),
  },
});
```

Display service failures inline without leaving the screen.

- [ ] **Step 4: Add permanent delete behavior**

Use `Alert.alert('Delete this item permanently?', 'This also removes its renewal history.', ...)`. On confirmation call `deleteItem(id)`. The live query removes the row. Keep errors inline and clear the active state in `finally`.

- [ ] **Step 5: Link from Settings**

Add an `Archive` icon row below Stored locally. Its copy is `Archived items` and `Restore or permanently remove archived dates.`; pressing it routes to `/archived`.

- [ ] **Step 6: Run TypeScript and Android export**

Run: `npx.cmd tsc --noEmit`

Expected: exit 0.

Run: `npx.cmd expo export --platform android`

Expected: `Exported: dist`.

- [ ] **Step 7: Commit archived UI**

```bash
git add src/app/archived.tsx src/app/settings.tsx
git commit -m "feat: add archived item management"
```

### Task 3: Archived item-detail behavior

**Files:**
- Modify: `src/app/item/[id].tsx`

**Interfaces:**
- Consumes: `items.archived`, `restoreItem`, existing route feedback params.
- Produces: active and archived management states on one details route.

- [ ] **Step 1: Extend query and route parameters**

Select `archived: items.archived`. Add `restored?: string` to `useLocalSearchParams`. Include restored in the success banner condition and use `Item restored` as its title.

- [ ] **Step 2: Restrict active-only actions**

Render Edit only when `!item.archived`. Render Renew only when `!item.archived && item.repeatType === 'yearly'`. Render Archive only when `!item.archived`.

- [ ] **Step 3: Add archived status and restore action**

When archived, show a soft warning card after the title:

```tsx
<View className="mt-5 rounded-2xl bg-app-warning-soft p-4">
  <Text className="font-semibold text-app-warning">Archived</Text>
  <Text className="mt-1 text-sm leading-5 text-app-muted">
    Reminder days are saved, but notifications are inactive until this item is restored.
  </Text>
</View>
```

Add `restore` to the `activeAction` union. The Restore action calls `restoreItem`, then replaces the route with restored/scheduled/skipped feedback parameters. Keep permanent delete available.

- [ ] **Step 4: Route after archive/delete according to state**

After archive, route to `/archived`. After deleting an archived item, route to `/archived`; after deleting an active item, route to `/items`.

- [ ] **Step 5: Run TypeScript and full tests**

Run: `npx.cmd tsc --noEmit`

Expected: exit 0.

Run: `node --experimental-strip-types --test tests/*.test.mjs`

Expected: all tests pass.

- [ ] **Step 6: Commit detail states**

```bash
git add src/app/item/[id].tsx
git commit -m "feat: restore archived items from details"
```

### Task 4: Renewal history model and UI

**Files:**
- Create: `src/utils/item-history-model.ts`
- Create: `tests/item-history-model.test.mjs`
- Modify: `src/app/item/[id].tsx`

**Interfaces:**
- Consumes: `item_history` rows.
- Produces: readable newest-first renewal entries.

- [ ] **Step 1: Write the failing history model test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';

let buildRenewalHistoryModel;
try {
  ({ buildRenewalHistoryModel } = await import('../src/utils/item-history-model.ts'));
} catch {}

test('renewal history exposes readable previous and new dates', () => {
  assert.deepEqual(
    buildRenewalHistoryModel({
      action: 'renewed',
      createdAt: '2026-09-18T01:30:00.000Z',
      id: 3,
      newDate: '2027-10-31',
      previousDate: '2026-10-31',
    }, 'en-GB', 'Asia/Kuala_Lumpur'),
    {
      id: 3,
      changedAt: '18 September 2026, 09:30',
      newDate: '31 October 2027',
      previousDate: '31 October 2026',
    },
  );
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --experimental-strip-types --test tests/item-history-model.test.mjs`

Expected: FAIL because the model is missing.

- [ ] **Step 3: Implement locale-aware history formatting**

Use `parseStoredDate` plus `Intl.DateTimeFormat` for stored calendar dates. Use a second formatter with date, hour, and minute for `createdAt`, accepting optional locale and time-zone arguments so tests remain deterministic. Ignore non-`renewed` actions by returning `undefined`.

- [ ] **Step 4: Add the live history query**

Query `itemHistory` by item ID, filter `action = 'renewed'`, and order by `createdAt` descending. Map valid rows through the model.

- [ ] **Step 5: Render renewal history**

When entries exist, render a `Renewal history` card after Notes. Each row shows `{previousDate} → {newDate}` and `Renewed {changedAt}`, separated by low-contrast borders. Add accessibility text that reads the transition without relying on the arrow glyph.

- [ ] **Step 6: Run focused, full, and type tests**

Run: `node --experimental-strip-types --test tests/item-history-model.test.mjs`

Expected: PASS.

Run: `node --experimental-strip-types --test tests/*.test.mjs`

Expected: all tests pass.

Run: `npx.cmd tsc --noEmit`

Expected: exit 0.

- [ ] **Step 7: Commit history UI**

```bash
git add src/utils/item-history-model.ts tests/item-history-model.test.mjs src/app/item/[id].tsx
git commit -m "feat: show item renewal history"
```
