<p align="center">
  <img src="assets/images/icon.png" alt="Duewise app icon" width="88" />
</p>

# Duewise

Keep expiry dates, renewals, and important moments in one place.

Duewise is a local-first reminder app built with Expo and React Native. Track what is coming up, choose when to be reminded, and manage reminders without creating an account or running a backend.

**Version:** 1.1.0 ? **Primary testing target:** Android

## Features

- **Home dashboard:** next reminder, overdue count, and upcoming items.
- **Reminder library:** search names, categories, and notes; filter by date, category, priority, or repeat rule; change the sort order.
- **Calendar:** reminder indicators, selected-day agenda, recurring occurrence previews, and creation with the selected date prefilled.
- **Flexible scheduling:** target date, local reminder time, and multiple advance alerts.
- **Repeat rules:** one-time, daily, weekly, monthly, yearly, or every N days.
- **Reminder actions:** mark done, snooze for one hour, edit, archive, restore, or delete. Supported notifications also offer completion and snooze actions.
- **Details and history:** next requested alert, per-alert schedule status, notes, and renewal history.
- **Backup and restore:** save a JSON backup to a chosen folder, preview an import, and skip matching items.
- **Appearance:** light, dark, or system theme, with reduced-motion support for page transitions.

Built-in categories cover vehicles, documents, food, subscriptions, warranties, medicine, products, and other items.

## How reminders work

Repeating reminders advance **when you mark the current occurrence complete**. They do not continuously create new occurrences in the background. The next date follows the existing due-date schedule, and missed dates are skipped. Calendar previews do not mean every future occurrence already has an alert scheduled.

Reminder times use the device's local time zone when scheduled. On Android, delivery is approximate: alerts may arrive after the selected time, especially while the phone is idle. Duewise does not request exact-alarm special access.

Notifications require app permission and an enabled **Duewise reminders** notification channel on Android. Details checks the device queue and channel state, offers recovery actions, and distinguishes elapsed alert times from missing future alerts. A queued alert is not proof that it was delivered.

Use a development build or an installed APK for notification acceptance testing. The app intentionally disables notification functionality in Android Expo Go.

## Tech stack

| Area | Technology |
| --- | --- |
| App | Expo SDK 57, React Native 0.86, React 19, TypeScript |
| Navigation | Expo Router |
| Storage | Expo SQLite with Drizzle ORM and SQL migrations |
| Notifications | Expo Notifications |
| Styling | Uniwind, Tailwind CSS, and React Native styles |
| Backup validation | Zod |
| Tests | Node.js test runner and SQLite integration tests |

## Development setup

Requirements:

- Node.js 24+ and npm for the development and test commands below.
- Android Studio, an Android SDK, and a compatible JDK for local Android builds, or an Expo account for EAS cloud builds.
- macOS and Xcode for local iOS builds.

From the repository root:

```sh
npm ci
npm start
```

To compile and run a local native development build:

```sh
npm run android
# On macOS:
npm run ios
```

Once a development build is installed, start Metro for that client:

```sh
npx expo start --dev-client
```

Database migrations and default-category setup run at startup. There is no backend service or application API key to configure for the local reminder flows.

Android is the primary device-testing target. iOS source and bundle checks are available, but physical-device acceptance is still required. Web is experimental; its synchronous SQLite startup is not an accepted release target.

## Build an Android APK

Install EAS CLI if needed, sign in, and use the existing preview profile:

```sh
npm install --global eas-cli
eas login
eas build --platform android --profile preview
```

EAS provides a download link when the build finishes. The preview profile produces an installable APK and increments the Android build number. EAS cloud builds upload project source and configuration to Expo's build service.

The repository is linked to an existing Expo project. If you fork it, configure your own Expo project and application identifiers in `app.json` before building.

Build profiles in `eas.json`:

| Profile | Purpose |
| --- | --- |
| `development` | Internal development client; use with Metro |
| `preview` | Internal Android APK for installation and phone testing |
| `production` | Store build; Android produces an AAB by default |

For an Android store build:

```sh
eas build --platform android --profile production
```

Set the user-facing version in `app.json` and keep `package.json` / `package-lock.json` aligned. EAS manages build numbers remotely; preview and production profiles auto-increment them. The Settings version label reads the Expo configuration.

Changes to permissions, native plugins, or backup rules require rebuilding the app. Reloading JavaScript cannot update those parts of an installed APK. iOS distribution additionally requires a bundle identifier and Apple signing configuration.

See [Expo's APK build guide](https://docs.expo.dev/build-reference/apk/) for build and installation details.

## Verification

Run the automated tests and source checks:

```sh
node --experimental-strip-types --test tests/*.test.mjs
npx tsc --noEmit
npm run lint
```

Verify that both native JavaScript bundles export:

```sh
npx expo export --platform android --platform ios --output-dir .expo/verify-native
```

The existing Windows-oriented verification script is also available:

```sh
npm run verify:v1
```

Despite its historical name, it runs the current tests, TypeScript, public Expo configuration, Android/iOS exports, and whitespace checks. Run lint separately. On PowerShell installations that block npm/npx scripts, use `npm.cmd` and `npx.cmd` instead.

Tests cover reminder scheduling and mutation failures, notification routing, recurrence, search/filter behavior, backup validation and restore, Android release policy, and database upgrades. Migration tests exercise the installed Drizzle Expo driver against real SQLite databases, including legacy upgrades and rollback on invalid references.

Automated checks and bundle exports do not replace testing an installed app. Before wider distribution, verify notification delivery with the app backgrounded and closed, channel/permission recovery, reboot behavior, backup pickers, upgrades, large text, keyboard handling, and back navigation.

## Data and privacy

- Reminders are stored in a local SQLite database. The app does not require an account or its own server.
- The database is not application-encrypted. Exported JSON backups are also **not encrypted**; keep them somewhere private.
- Android configuration disables automatic cloud backup and excludes app data from device-to-device transfer. **Save a manual backup before uninstalling or changing phones.** This Android policy does not describe iOS system-backup behavior or erase previously saved copies.
- Manual backups include active and archived reminders, categories, notes, repeat rules, and history. Temporary snoozes stay on the current phone.
- Restore validates the file, previews additions, keeps existing reminders, and skips matching items. Future alerts are recreated on the destination phone when permission allows; past alert times are skipped.
- Backup files are limited to 10 MB. Backup and restore are supported in the native Android/iOS app.
- Broad overlay and legacy external-storage permissions are blocked in Expo configuration. File access uses system pickers.

## Repository layout

```text
src/
  app/          Expo Router tabs, details, reminder form, settings, archive
  components/   Shared UI and reminder components
  constants/    Theme and category definitions
  contexts/     Appearance preferences
  db/           SQLite connection, schema, and category seeding
  hooks/        Startup migrations and device reminder status
  services/     Reminder mutations, notifications, cleanup, and backup I/O
  utils/        Recurrence, validation, filtering, and integrity checks
plugins/        Android backup-policy config plugin
```

Additional directories:

- `drizzle/`: versioned SQL migrations and the bundled migration index.
- `tests/`: unit/integration tests and SQLite adapters.
- `docs/`: acceptance checklists, architecture notes, and review reports.
- `assets/`: app icons and splash assets.

Native `android/` and `ios/` directories are generated and ignored by Git. Keep persistent native configuration in `app.json` and config plugins.

## Database changes

Edit `src/db/schema.ts`, then generate a migration:

```sh
npx drizzle-kit generate
```

Review the generated SQL and bundled migration index. Keep deployed migrations unchanged, and run migration tests against both fresh and populated databases before releasing. Startup migration execution checks references before commit and restores foreign-key enforcement afterward.

## Project documentation

- [Reminder and release-hardening checks](docs/reminder-improvements-testing.md)
- [Backup and restore testing](docs/backup-restore-testing.md)
- [Navigation testing](docs/navigation-testing.md)
- [Device acceptance checklist](docs/qa/v1-acceptance.md)
- [ECC production review and remediation notes](docs/qa/ecc-production-review-1.1.md)

For framework APIs, use the [versioned Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/) as required by this repository's `AGENTS.md`.

## License

See [LICENSE](LICENSE) for the repository's MIT license and existing copyright notice.
