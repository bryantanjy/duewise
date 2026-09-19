# Duewise V1 Functional Completion Design

Date: 2026-09-18
Status: Approved on 2026-09-18

## Objective

Complete the remaining Duewise V1 functionality without replacing the working application architecture. The completion pass covers notification-tap navigation, failure-safe item and reminder operations, archive restoration, renewal history, and automated verification.

The implementation must preserve the current local-first product model: no account, no server, and no remote data storage.

## Scope

### Included

- Open an item when its notification is tapped while the app is running, backgrounded, or terminated.
- Validate and deduplicate notification navigation requests.
- Make create, edit, renew, archive, restore, and delete operations resilient to partial database or notification failures.
- Preserve reminder-day configuration while an item is archived.
- Add an Archived Items screen with restore and permanent-delete actions.
- Display renewal history on item details.
- Add unit and service-level integration tests for the new behavior and existing high-risk operations.
- Produce Android and TypeScript build evidence plus a manual Android/iOS acceptance checklist.

### Excluded

- Cloud synchronization, accounts, sharing, backup, or export.
- Remote push notifications.
- Automatic background renewal without a user action.
- Dark-mode activation. Dark tokens remain prepared, but V1 stays light-only.
- Category creation or editing.
- A guarantee of zero defects. The target is evidence-backed risk reduction and documented device acceptance.

## Approach

Use incremental hardening around the existing Expo Router, Drizzle, Expo SQLite, and Expo Notifications implementation.

Rejected alternatives:

1. A full repository/service rewrite would improve isolation but introduces unnecessary regression risk before V1.
2. A UI-only completion would leave notification navigation, partial updates, and data-loss paths unresolved.
3. Incremental hardening keeps working screens and schema concepts while adding explicit orchestration boundaries and tests. This is the selected approach.

## Architecture

### Notification navigation

A pure notification-route parser accepts unknown notification data and returns an item route only when all conditions are true:

- `type` is `item-reminder`.
- `itemId` is a positive integer or an equivalent numeric string.
- The route is constructed internally as `/item/{id}`. Arbitrary payload URLs are never followed.

The root layout owns a notification observer because it is mounted for every route. The observer:

1. Registers the response listener before reading the last response, minimizing the startup race window.
2. Handles the last response for a terminated-app launch.
3. Handles response events while the app is running or backgrounded.
4. Records response/request identifiers in memory to prevent duplicate navigation.
5. Queues a valid route until migrations and category seeding complete.
6. Navigates with Expo Router only after the route tree and database are ready.
7. Clears the native last-response value after handling it.
8. Ignores test notifications, malformed data, and non-default notification actions.

The existing Expo Go guard remains because the current project already avoids importing notification runtime code in unsupported Android Expo Go contexts.

### Reminder lifecycle and cleanup queue

Database transactions cannot include operating-system notification APIs. Duewise will therefore use staged operations with compensation and a durable cleanup queue.

A new `notification_cleanup` table stores native notification identifiers that still need cancellation. Each row contains:

- primary key
- unique notification identifier
- creation time
- attempt count
- last error text, when available

The cleanup worker runs after database setup and after mutating item operations. It tries to cancel queued identifiers and deletes only successfully processed rows. Failed rows remain for the next startup or operation.

Reminder rows remain the source of truth for reminder-day configuration. `notificationId` represents only the currently scheduled native notification.

### Create

1. Insert the item and reminder configuration.
2. Schedule native notifications, collecting every new identifier.
3. Store the identifiers on their corresponding reminder rows.
4. If a database or scheduling exception occurs, cancel all newly created native notifications, enqueue any cancellation failures, and remove the provisional item through compensation.
5. Dates in the past or denied notification permission remain supported outcomes: the reminder row is retained with a null native identifier and reported as skipped.

### Edit

1. Read and retain the current item, reminder configuration, and native identifiers.
2. Schedule replacement notifications before modifying the stored item.
3. In one database transaction, update the item, replace reminder configuration, store replacement identifiers, and enqueue the old native identifiers for cleanup.
4. If replacement scheduling or the transaction fails, cancel/enqueue the new identifiers and preserve the previous database state and notification set.
5. Run cleanup after commit.

### Renew

1. Read the item and reminder-day configuration.
2. Calculate the next year while clamping leap-day and end-of-month dates safely.
3. Schedule replacement notifications first.
4. In one transaction, add the history row, update the target date, update reminder identifiers, and enqueue old identifiers.
5. Compensate new notifications if the transaction fails.
6. Run cleanup after commit.

Only items configured for yearly repetition may use the renewal operation.

### Archive

1. In one transaction, mark the item archived, retain reminder-day rows, set their current notification identifiers to null, and enqueue existing identifiers for cleanup.
2. Run cleanup after commit.

Archive therefore hides the item and disables active reminders without losing the configuration needed for restoration.

### Restore

1. Read the archived item and retained reminder days.
2. Schedule eligible reminders before changing archive state.
3. In one transaction, mark the item active and store the new native identifiers.
4. If the transaction fails, cancel/enqueue newly scheduled identifiers and leave the item archived.
5. Return scheduled and skipped counts so the UI can explain past reminder dates or denied permission.

### Permanent delete

1. Read active native identifiers.
2. In one transaction, enqueue those identifiers and delete the item. Existing foreign-key cascades remove reminders and history.
3. Run cleanup after commit.

## User Interface

### Archived Items

Add `/archived` and link it from Settings under Privacy & Storage.

The screen includes:

- archived item count
- empty state
- rows using the existing item visual language
- open-details navigation
- restore action
- permanent-delete confirmation
- inline operation errors and disabled/loading states

### Item details

The item query includes `archived`.

Active items retain Edit, Renew when yearly, Archive, and Delete. Archived items show Restore and Delete; Edit, Renew, and Archive are hidden to prevent ambiguous state changes.

Renewal history appears newest-first below the item metadata. Each entry shows the previous target date, the new target date, and the local renewal timestamp. An empty history section is omitted.

### Operation feedback

Create, update, renew, and restore route to item details with scheduled/skipped counts. Archive and delete return to the appropriate list. Failures remain on the current screen and use explicit, user-readable messages.

## Data Model

Add one migration for `notification_cleanup`. No destructive migration is required.

Existing tables retain their meaning:

- `items.archived` controls active versus archived visibility.
- `reminders.daysBefore` persists reminder configuration.
- `reminders.notificationId` tracks a currently scheduled native notification, if any.
- `item_history` records renewal events.

Foreign keys and delete behavior must be enabled and verified during tests.

## Error Handling and Consistency

- Native notification calls are treated as external side effects and never assumed to participate in a database transaction.
- Replacement notifications are created before replacing valid stored state.
- Every newly scheduled identifier is tracked immediately for compensation.
- Cancellation failures are durable cleanup work, not silently discarded.
- Unexpected database failures leave the last committed item state readable.
- Malformed notification payloads cause no navigation and no crash.
- Missing/deleted notification targets land on the existing Item Not Found state.
- Concurrent button presses are prevented by screen-level action state.

## Testing Strategy

### Unit tests

- valid and invalid notification payload routing
- duplicate response suppression logic
- next-year calculations, including leap day
- operation result counts and validation
- cleanup queue planning

### Service integration tests

Use an isolated SQLite database and deterministic notification adapter to cover:

- create with scheduled and skipped reminders
- edit success and replacement behavior
- edit scheduling failure preserves prior state
- renew writes history and retains the month/day rule
- archive retains reminder-day configuration and removes active identifiers
- restore schedules eligible reminders and reactivates the item
- delete cascades reminders and history
- cancellation failures remain queued and can succeed on retry

The service boundary will accept a notification adapter so tests exercise real orchestration and database behavior without invoking device notification APIs.

### Static and bundle verification

- all Node tests
- TypeScript with no emit
- Expo public configuration validation
- Android production export
- diff whitespace validation

### Manual device acceptance

Android and iOS checklists cover:

- permission allowed and denied
- create/edit/renew notification rescheduling
- tap notification while foregrounded, backgrounded, and terminated
- cold-start navigation after database initialization
- archive removes pending notifications
- restore reschedules eligible reminders
- permanent deletion removes the item and history
- light picker appearance

Device-only checks remain explicitly unverified until run on the corresponding physical device or supported simulator.

## Delivery Sequence

1. Notification route parser and root observer.
2. Cleanup-queue schema and runtime worker.
3. Failure-safe item service orchestration.
4. Archive/restore service and Archived Items UI.
5. Renewal-history UI.
6. Integration tests and regression fixes.
7. Static verification, Android export, and manual acceptance handoff.

Each stage uses test-first development and must leave the existing test suite green before the next stage starts.

## Completion Criteria

The code portion of V1 is complete when:

- every included flow is implemented;
- automated unit and service integration tests pass;
- TypeScript and Android export pass;
- no known severity-high data-loss or navigation defect remains;
- the device acceptance checklist is supplied with unverified platform checks clearly marked.

Release readiness additionally requires the manual Android and iOS acceptance checklist to pass on target devices.
