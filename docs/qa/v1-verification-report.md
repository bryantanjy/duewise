# Duewise V1 Verification Report

Status: **Code complete; device acceptance pending**

Verified on 2026-09-18 in the Windows development workspace.

## Automated verification

| Check | Result | Evidence |
|---|---|---|
| Unit and integration tests | Pass | 54 passed, 0 failed |
| TypeScript | Pass | `npx tsc --noEmit` |
| Expo SDK configuration | Pass | SDK 57 public config resolved |
| Expo dependency compatibility | Pass | `npx expo install --check` reported dependencies up to date |
| Android production export | Pass | Hermes bundle generated at 5.8 MB |
| iOS production export | Pass | Hermes bundle generated at 5.6 MB |
| Whitespace/error check | Pass | `git diff --check` exited successfully |

Run the same gate with:

```powershell
npm run verify:v1
```

## Device acceptance

No Android device/emulator or iOS simulator was available in this workspace. All 53 cases for each platform in [v1-acceptance.md](./v1-acceptance.md) remain `Not run`; there are no recorded `Fail` rows. The remaining groups are:

- Database and item flows: fresh install, category seeding, create, validation, edit, delete, persistence, reminder-day variants, skipped past reminders, and leap-day renewal.
- Navigation and calendar: home/items/details navigation, both month arrows, event dots/cards, recurring occurrences, Today, and every add-item entry point.
- Notifications: permissions, test delivery, create/edit/renew/archive/restore/delete scheduling, all app-state tap paths, deduplication, and deleted targets.
- Archive and renewal history: list/count behavior, action visibility, restore/delete, renewal ordering, and persistence.
- Visual and accessibility: Duewise palette, category visuals, errors, touch targets, labels, keyboard behavior, and non-blank cards.

The focused notification matrix in [notification-navigation.md](./notification-navigation.md) also remains `Not run` for foreground, background, terminated, test-notification, and deleted-item tap behavior.

## Browser diagnostic

Playwright was used as an additional diagnostic, not as native acceptance. SPA mode loads the web client, but Expo SQLite's SDK 57 alpha web implementation times out when Drizzle opens the synchronous database during module evaluation. Android and iOS do not use that web worker path. Web is therefore not accepted as a V1 target.

## Release decision

The source, database migrations, notification lifecycle logic, and Android/iOS JavaScript bundles pass automated verification. Release acceptance still requires completing the device matrix on current Android and iOS development builds, especially notification delivery and tap behavior.
