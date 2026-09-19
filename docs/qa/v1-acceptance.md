# Duewise V1 Acceptance

Use `Pass`, `Fail`, or `Not run`. A row changes to `Pass` only after the behavior is observed on that platform's current development build.

## Environment

| Field | Android | iOS |
|---|---|---|
| Device/model | Not run | Not run |
| OS version | Not run | Not run |
| Build identifier | Not run | Not run |
| Test date | Not run | Not run |
| Tester | Not run | Not run |

## Database and item flows

| Case | Android | iOS | Notes |
|---|---|---|---|
| Fresh install applies migrations and seeds categories | Not run | Not run | |
| Seeded categories show database icons and colors | Not run | Not run | |
| Create an item with valid values | Not run | Not run | |
| Required-field errors appear beside affected fields | Not run | Not run | |
| Edit every item field | Not run | Not run | |
| Permanently delete an active item | Not run | Not run | |
| Items persist after app restart | Not run | Not run | |
| Create with no reminder days | Not run | Not run | |
| Create with custom reminder days | Not run | Not run | |
| Select several reminder-day presets and save them all | Not run | Not run | |
| Edit an item and retain selected and custom reminder days | Not run | Not run | |
| Past reminder times are retained as skipped | Not run | Not run | |
| Leap-day yearly renewal clamps to 28 February | Not run | Not run | |

## Navigation and calendar

| Case | Android | iOS | Notes |
|---|---|---|---|
| Home shows the next active item | Not run | Not run | |
| All Items is ordered by target date | Not run | Not run | |
| Item row opens matching details | Not run | Not run | |
| Calendar previous-month button is visible and works | Not run | Not run | |
| Calendar next-month button is visible and works | Not run | Not run | |
| Dates with items show event dots | Not run | Not run | |
| Selected date shows a populated event card | Not run | Not run | |
| Yearly item appears in its future occurrence | Not run | Not run | |
| Today action returns to the current month/day | Not run | Not run | |
| Home add-item entry opens the form | Not run | Not run | |
| Items add-item entry opens the form | Not run | Not run | |
| Calendar add-item entry opens the form | Not run | Not run | |

## Notifications

| Case | Android | iOS | Notes |
|---|---|---|---|
| Notification permission allowed | Not run | Not run | Development build required for final acceptance. |
| Notification permission denied remains a skipped outcome | Not run | Not run | |
| 10-second test notification appears | Not run | Not run | |
| Create schedules eligible reminders | Not run | Not run | |
| Edit replaces old reminder schedules | Not run | Not run | |
| Renew replaces old reminder schedules | Not run | Not run | |
| Archive cancels active native schedules | Not run | Not run | |
| Restore reschedules eligible reminders | Not run | Not run | |
| Delete cancels active native schedules | Not run | Not run | |
| Foreground notification tap opens matching item once | Not run | Not run | |
| Background notification tap opens matching item once | Not run | Not run | |
| Terminated notification tap waits for setup, then opens item once | Not run | Not run | |
| Duplicate response is suppressed | Not run | Not run | |
| Deleted notification target shows Item Not Found | Not run | Not run | |

## Archive and renewal history

| Case | Android | iOS | Notes |
|---|---|---|---|
| Archived item disappears from active lists/calendar | Not run | Not run | |
| Archived item retains reminder-day configuration | Not run | Not run | |
| Archived screen count matches visible rows | Not run | Not run | |
| Archived details hide Edit, Renew, and Archive | Not run | Not run | |
| Restore feedback reports scheduled and skipped counts | Not run | Not run | |
| Permanent delete asks for confirmation and cascades data | Not run | Not run | |
| One renewal displays one history entry | Not run | Not run | |
| Multiple renewals display newest-first | Not run | Not run | |
| History persists through archive and restore | Not run | Not run | |

## Visual and accessibility

| Case | Android | iOS | Notes |
|---|---|---|---|
| Calendar/date picker uses the Duewise light palette | Not run | Not run | |
| Dark mode covers every screen, card, and date picker | Not run | Not run | |
| System theme follows device changes; light and dark overrides persist | Not run | Not run | |
| Category icons and colors remain readable | Not run | Not run | |
| Validation and operation errors are readable | Not run | Not run | |
| Interactive actions have at least 44-point targets | Not run | Not run | |
| Icon-only buttons have screen-reader labels | Not run | Not run | |
| Item form remains usable with keyboard open | Not run | Not run | On Add and Edit, focus Name, Reminder days, and Notes: the form and Save bar move above the keyboard, the focused field and typed text stay visible, and Done dismisses the keyboard. |
| No event, form, list, or archive card renders blank | Not run | Not run | |
