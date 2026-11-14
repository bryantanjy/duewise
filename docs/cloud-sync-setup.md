# Optional cloud sync ? Duewise 1.9.0

## Create and configure the project

1. Create a new project at https://supabase.com/dashboard. Choose the region you want to host your reminders in (Singapore is close to Malaysia). Keep the database password in your password manager.
2. Open SQL Editor and run `supabase/migrations/202611130001_cloud_sync.sql` from this repository. This creates the account-isolated snapshot table, read policy and atomic revision-checked save function. Do not disable RLS or grant direct client writes.   
3. Under Authentication, enable the Email provider and new user signups. In Email Templates ? Magic Link, replace the link with a code message containing `{{ .Token }}` (for example `<h2>Your Duewise sign-in code</h2><p>{{ .Token }}</p>`). This app uses email codes, not callback links. Choose an OTP expiry, keep Supabase rate limits enabled, and configure your own SMTP provider for real users; the built-in sender is restricted.
4. Copy `.env.example` to `.env.local`. Fill in the project HTTPS URL and **publishable** key from Project Settings ? API Keys. Never use a secret/service-role key, database password, or an access token in an `EXPO_PUBLIC_` value. No credentials are included in the repository.
5. Set the same two `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` values in the EAS environment used by the preview/production build. Public variables are bundled into the app; they are not secrets. RLS and the RPC enforce user ownership.
6. Build a new native binary: `npx eas-cli@latest build --platform android --profile preview` (or select iOS). SecureStore and Crypto need a new binary; restarting an old app cannot add them.
7. On both phones, open Settings ? Optional cloud sync, enter the same email, verify the emailed code, then choose **Enable sync and merge reminders**. Sign-in alone does not upload reminders. A replacement phone downloads the account's reminders and recreates notification schedules locally.

## Behavior and limits

- Local use stays available without an account. Enabling sync uploads reminders, categories used by reminders, notes, costs, history and attachments. Snapshot traffic uses HTTPS and Supabase account isolation; there is no end-to-end encryption.
- Sync runs on app launch/foreground and every 60 seconds while open and enabled, or with Sync now. It is not an OS background-sync task and does not guarantee delivery while the app is closed. Offline changes remain local until a successful sync.
- Stable per-reminder sync IDs are separate from phone database IDs and aren't copied by manual backups. An exact restored backup is matched to an existing cloud reminder during first sync.
- Three-way merging compares the last successful baseline with local and remote state. One-sided edits and deletes propagate. Concurrent edits keep the remote version and create a local conflict copy. An edit wins over a concurrent delete. Revision checks retry up to three times instead of overwriting newer cloud data.
- Sync baseline, local reminders and pending notification work are committed in one SQLite transaction. Native notification IDs and temporary snoozes never leave the phone; changing or deleting a reminder cancels obsolete alerts. Failed notification scheduling is retried on later sync; skipped alerts may need notification permissions or manual review.
- Current limits: 10,000 reminders, 50 MB serialized snapshot, 25 MB decoded attachments total. This first version exchanges whole account snapshots when the cloud revision or local content changes; unchanged remote revisions reuse the local baseline. Large attachments increase transfer size. There is no realtime subscription.
- Pausing keeps local and cloud copies. Signing out pauses sync, removes the local refresh credential, and retains downloaded reminders. The phone remains bound to its original account and project, preventing accidental upload to another account. Keep the phone private. To use another account on the same installation, a reviewed local-data reset flow is still needed; do not manually erase only the binding.
- A single refresh token is stored in native SecureStore; access tokens/session JSON remain in memory. Web cloud authentication is unavailable. iOS keychain credentials can survive uninstall; sign-in alone never enables uploads on a fresh installation.
- Cloud rows are deleted when their auth account is deleted by the Supabase administrator. A self-service account-deletion flow and production email delivery setup are deployment follow-ups, not implemented by this client.

## Verification

Run `npm run verify:v1` and `npm run lint`. Pure merge tests cover edits, deletes, conflicts and retry identities; real SQLite tests cover attachment/history preservation, rollback, durable checkpoints and notification cancellation. Coordinator tests cover stale revisions, retry exhaustion, account binding and protocol rejection.

Before enabling for real users, run `supabase/tests/cloud_sync.sql` against a disposable project with psql (use `-v ON_ERROR_STOP=1`). It exercises two users, CAS and anonymous/cross-user denial inside a rolled-back transaction. This requires a live Postgres project; it cannot be verified with SQLite tests.

Use two physical devices to test initial merge, offline edits, simultaneous edits, deletion, replacement-phone recovery, attachment recovery, pause/sign-out, expired email codes and notification permissions. Verify that one account cannot fetch another account's row. Check SMTP delivery and provider quotas. Keep manual backups during rollout.

No Supabase project, remote SQL migration, email service or cloud build has been provisioned by the local implementation. The project owner must complete the setup steps above to activate the feature.

Dependency review: npm audit reports advisories in the existing Expo/toolchain dependency tree (including expo-router and transitive decoding packages); the newly added Supabase and native credential packages were not listed in that report. Review these advisories before production distribution. No forced dependency upgrades were applied.

## Sign-in email troubleshooting

If the app cannot send a code, open Supabase Authentication logs and inspect the failed OTP request. The default sender only delivers to email addresses belonging to members of the project's Supabase organization; other recipients fail with `email_address_not_authorized`. For initial testing, use your existing Supabase organization member email. For other users, configure Custom SMTP under Authentication settings using your email provider's verified sender/domain. Do not invite app users to your Supabase administration team as a workaround. Default delivery limits are very low; `over_email_send_rate_limit` requires waiting or configuring appropriate SMTP delivery and rate limits. A valid API key and enabled email provider do not prove SMTP delivery is configured.

Server-side SMTP and email-template changes take effect without rebuilding the app. Duewise 1.9.2 adds distinct user messages for recipient restrictions, disabled email sign-in, rate limits, network failures, and rejected configuration. It does not change or provision the project's SMTP settings.
