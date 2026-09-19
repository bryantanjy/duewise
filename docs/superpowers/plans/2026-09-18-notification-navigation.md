# Notification Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the correct Duewise item exactly once when a valid reminder notification is tapped in warm, background, or terminated app states.

**Architecture:** Keep payload parsing and duplicate suppression in platform-neutral utilities. The root layout dynamically imports Expo Notifications, subscribes before reading the cold-start response, queues valid routes until database setup completes, and then navigates with Expo Router.

**Tech Stack:** Expo SDK 57, Expo Router 57, Expo Notifications 57, React 19, TypeScript 6, Node test runner

**Spec:** `docs/superpowers/specs/2026-09-18-v1-functional-completion-design.md`

## Global Constraints

- Android Expo Go must not statically load the unsupported notification runtime.
- Only `item-reminder` payloads with positive integer item IDs may navigate.
- Never follow an arbitrary URL supplied by notification data.
- Navigation must wait for migrations and category seeding.
- Use the Expo SDK 57 notification-response APIs documented at `https://docs.expo.dev/versions/v57.0.0/sdk/notifications/`.
- Work test-first and leave all existing tests green.

---

### Task 1: Notification route parsing and duplicate suppression

**Files:**
- Create: `src/utils/notification-routing.ts`
- Create: `tests/notification-routing.test.mjs`

**Interfaces:**
- Consumes: unknown notification data and response identifiers.
- Produces: `notificationItemRoute(data: unknown): /item/${number} | undefined` and `createResponseDeduper(): { accept(id: string): boolean }`.

- [ ] **Step 1: Write the failing parser tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';

let createResponseDeduper;
let notificationItemRoute;
try {
  ({ createResponseDeduper, notificationItemRoute } = await import('../src/utils/notification-routing.ts'));
} catch {}

test('valid item reminder becomes an internal item route', () => {
  assert.equal(notificationItemRoute({ type: 'item-reminder', itemId: 42 }), '/item/42');
  assert.equal(notificationItemRoute({ type: 'item-reminder', itemId: '7' }), '/item/7');
});

test('test, malformed, and arbitrary URL payloads do not navigate', () => {
  assert.equal(notificationItemRoute({ type: 'notification-test' }), undefined);
  assert.equal(notificationItemRoute({ type: 'item-reminder', itemId: 0 }), undefined);
  assert.equal(notificationItemRoute({ type: 'item-reminder', itemId: '7x' }), undefined);
  assert.equal(notificationItemRoute({ type: 'item-reminder', url: 'https://example.com' }), undefined);
});

test('a response identifier is accepted only once', () => {
  const deduper = createResponseDeduper();
  assert.equal(deduper.accept('response-1'), true);
  assert.equal(deduper.accept('response-1'), false);
  assert.equal(deduper.accept('response-2'), true);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --experimental-strip-types --test tests/notification-routing.test.mjs`

Expected: FAIL because both exports are missing.

- [ ] **Step 3: Implement the minimal routing utility**

```ts
type NotificationData = { itemId?: unknown; type?: unknown };

export function notificationItemRoute(data: unknown): `/item/${number}` | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const { itemId, type } = data as NotificationData;
  if (type !== 'item-reminder') return undefined;
  if (typeof itemId !== 'number' && typeof itemId !== 'string') return undefined;
  if (typeof itemId === 'string' && !/^\d+$/.test(itemId)) return undefined;
  const parsedId = Number(itemId);
  if (!Number.isSafeInteger(parsedId) || parsedId <= 0) return undefined;
  return `/item/${parsedId}`;
}

export function createResponseDeduper() {
  const handled = new Set<string>();
  return {
    accept(id: string) {
      if (!id || handled.has(id)) return false;
      handled.add(id);
      return true;
    },
  };
}
```

- [ ] **Step 4: Run the focused and full tests**

Run: `node --experimental-strip-types --test tests/notification-routing.test.mjs`

Expected: 3 tests pass.

Run: `node --experimental-strip-types --test tests/*.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Commit the utility**

```bash
git add src/utils/notification-routing.ts tests/notification-routing.test.mjs
git commit -m "feat: validate notification item routes"
```

### Task 2: Root notification observer

**Files:**
- Modify: `src/app/_layout.tsx`
- Modify: `src/services/notifications.ts`

**Interfaces:**
- Consumes: `notificationItemRoute`, `createResponseDeduper`, Expo `NotificationResponse`, database readiness.
- Produces: one queued internal route and one `router.push()` per accepted response.

- [ ] **Step 1: Add a development-only response scheduler**

Extend `scheduleTestNotification` to accept optional content data while preserving its current caller:

```ts
export async function scheduleTestNotification(
  delayInSeconds = 10,
  data: Record<string, string | number> = { type: 'notification-test' },
) {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Duewise reminder test',
      body: 'Local notifications are working on this device.',
      data,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delayInSeconds,
      channelId: Platform.OS === 'android' ? REMINDERS_CHANNEL_ID : undefined,
    },
  });
}
```

- [ ] **Step 2: Add queued-response state to the root layout**

Add imports for `router`, `useRef`, the routing utilities, and the erased type-only import `import type { NotificationResponse } from 'expo-notifications'`. Add:

```ts
const [pendingNotificationRoute, setPendingNotificationRoute] = useState<`/item/${number}`>();
const responseDeduper = useRef(createResponseDeduper());
```

- [ ] **Step 3: Register listener before reading the cold-start response**

Replace the notification import effect with a guarded dynamic import. The response request identifier is the dedupe key; only the default action is accepted:

```ts
useEffect(() => {
  if (Platform.OS === 'android' && isRunningInExpoGo()) return;

  let active = true;
  let removeListener: (() => void) | undefined;

  void import('expo-notifications').then((Notifications) => {
    if (!active) return;

    const handleResponse = (response: NotificationResponse) => {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const requestId = response.notification.request.identifier;
      if (!responseDeduper.current.accept(requestId)) return;
      const route = notificationItemRoute(response.notification.request.content.data);
      if (route) setPendingNotificationRoute(route);
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    removeListener = () => subscription.remove();
    const initialResponse = Notifications.getLastNotificationResponse();
    if (initialResponse) handleResponse(initialResponse);
  });

  return () => {
    active = false;
    removeListener?.();
  };
}, []);
```

- [ ] **Step 4: Navigate only after application setup**

```ts
useEffect(() => {
  if (!success || !seedComplete || !pendingNotificationRoute) return;
  router.push(pendingNotificationRoute);
  setPendingNotificationRoute(undefined);
  if (!(Platform.OS === 'android' && isRunningInExpoGo())) {
    void import('expo-notifications').then(({ clearLastNotificationResponse }) => {
      clearLastNotificationResponse();
    });
  }
}, [pendingNotificationRoute, seedComplete, success]);
```

- [ ] **Step 5: Run static verification**

Run: `npx.cmd tsc --noEmit`

Expected: exit 0.

Run: `node --experimental-strip-types --test tests/*.test.mjs`

Expected: all tests pass.

- [ ] **Step 6: Commit notification observation**

```bash
git add src/app/_layout.tsx src/services/notifications.ts
git commit -m "feat: open items from reminder notifications"
```

### Task 3: Notification navigation acceptance checkpoint

**Files:**
- Create: `docs/qa/notification-navigation.md`

**Interfaces:**
- Consumes: a development build with at least one item and notification permission.
- Produces: recorded pass/fail evidence for Android and iOS notification interactions.

- [ ] **Step 1: Write the exact device checklist**

Document these cases with `Pass`, `Fail`, or `Not run` fields:

```md
# Notification Navigation QA

| Platform | State | Expected result | Result |
|---|---|---|---|
| Android | Foreground | Tap opens the matching item once | Not run |
| Android | Background | Tap opens the matching item once | Not run |
| Android | Terminated | App initializes, then opens the matching item once | Not run |
| iOS | Foreground | Tap opens the matching item once | Not run |
| iOS | Background | Tap opens the matching item once | Not run |
| iOS | Terminated | App initializes, then opens the matching item once | Not run |
| Both | Test notification | Tap does not navigate to an item | Not run |
| Both | Deleted item | Tap shows the existing Item Not Found state | Not run |
```

- [ ] **Step 2: Verify the Android production bundle**

Run: `npx.cmd expo export --platform android`

Expected: `Exported: dist` and exit 0.

- [ ] **Step 3: Commit the checklist**

```bash
git add docs/qa/notification-navigation.md
git commit -m "docs: add notification navigation QA"
```
