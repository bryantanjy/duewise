# V1 Verification and Acceptance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce fresh automated, bundle, and device acceptance evidence for every Duewise V1 flow and fix any reproduced regression test-first.

**Architecture:** Use one deterministic command sequence for code-level evidence and one explicit platform matrix for native-only behavior. A failed check becomes a focused regression task; no completion claim is made from partial evidence.

**Tech Stack:** Node 24 test runner, TypeScript 6, Expo SDK 57 CLI, Expo Router, Android/iOS development builds

**Spec:** `docs/superpowers/specs/2026-09-18-v1-functional-completion-design.md`

## Global Constraints

- Do not claim release readiness until Android and iOS manual checks are recorded.
- Do not convert `Not run` into `Pass` without observing the target behavior.
- Every reproduced defect gets a failing automated test before its fix when the behavior is automatable.
- Preserve all user work in the dirty worktree and inspect only task-related diffs.
- V1 remains local-only and light-only.

---

### Task 1: Automated V1 verification command

**Files:**
- Modify: `package.json`
- Create: `scripts/verify-v1.mjs`
- Create: `tests/verify-v1-script.test.mjs`

**Interfaces:**
- Produces: `npm.cmd run verify:v1`, which exits nonzero at the first failed verification stage.

- [ ] **Step 1: Write the failing script-runner test**

Export a platform-neutral `runSteps(steps, run)` from the script and test it with injected commands:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

let runSteps;
try {
  ({ runSteps } = await import('../scripts/verify-v1.mjs'));
} catch {}

test('verification stops at the first failed stage', async () => {
  const calls = [];
  await assert.rejects(
    runSteps(['tests', 'types', 'config'], async (step) => {
      calls.push(step);
      if (step === 'types') throw new Error('type failure');
    }),
    /type failure/,
  );
  assert.deepEqual(calls, ['tests', 'types']);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/verify-v1-script.test.mjs`

Expected: FAIL because the script is missing.

- [ ] **Step 3: Implement the verification script**

Use `spawnSync` with `shell: true`, `stdio: 'inherit'`, and the project root as `cwd`. The production steps are:

```js
export const verificationSteps = [
  'node --experimental-strip-types --test tests/*.test.mjs',
  'npx.cmd tsc --noEmit',
  'npx.cmd expo config --type public',
  'npx.cmd expo export --platform android',
  'git diff --check',
];
```

`runSteps` awaits each injected runner sequentially and rethrows failures. When executed as the main module, run every production command and set `process.exitCode = 1` on failure.

- [ ] **Step 4: Add the package script**

```json
"verify:v1": "node scripts/verify-v1.mjs"
```

- [ ] **Step 5: Run focused test and full verification**

Run: `node --test tests/verify-v1-script.test.mjs`

Expected: PASS.

Run: `npm.cmd run verify:v1`

Expected: all five stages exit 0 and Android export prints `Exported: dist`.

- [ ] **Step 6: Commit verification automation**

```bash
git add package.json scripts/verify-v1.mjs tests/verify-v1-script.test.mjs
git commit -m "test: automate V1 verification"
```

### Task 2: Full product acceptance matrix

**Files:**
- Create: `docs/qa/v1-acceptance.md`

**Interfaces:**
- Consumes: cleanly installed current Android and iOS development builds.
- Produces: auditable Pass/Fail/Not run evidence with device/build metadata.

- [ ] **Step 1: Record the test environment template**

```md
# Duewise V1 Acceptance

## Environment

| Field | Android | iOS |
|---|---|---|
| Device/model | Not run | Not run |
| OS version | Not run | Not run |
| Build identifier | Not run | Not run |
| Test date | Not run | Not run |
| Tester | Not run | Not run |
```

- [ ] **Step 2: Add database and item-flow cases**

Add rows for fresh install/migrations, category icons, create with valid values, required-field errors, edit every field, delete, restart persistence, empty reminders, custom reminders, past reminders skipped, and leap-day renewal. Each row has Android result, iOS result, and Notes.

- [ ] **Step 3: Add navigation and calendar cases**

Add rows for Home next item, All Items ordering, open details, previous/next calendar month, event dots, selected event card, yearly future occurrence, Today action, and every add-item entry point.

- [ ] **Step 4: Add notification cases**

Add rows for permission allowed, permission denied, 10-second test, create scheduling, edit replacement, renew replacement, archive cancellation, restore rescheduling, delete cancellation, foreground tap, background tap, terminated tap, duplicate suppression, and deleted-item target.

- [ ] **Step 5: Add archive and history cases**

Add rows for archive visibility, retained reminder days, archived list count, archived details restrictions, restore feedback, permanent-delete confirmation/cascade, one renewal history entry, multiple entries newest-first, and history persistence through archive/restore.

- [ ] **Step 6: Add visual/accessibility cases**

Add rows for light calendar picker, category icons/colors, readable validation, 44-point actions, screen-reader labels on icon-only buttons, keyboard-safe form scrolling, and no blank cards/components.

- [ ] **Step 7: Commit the acceptance matrix**

```bash
git add docs/qa/v1-acceptance.md
git commit -m "docs: add V1 acceptance matrix"
```

### Task 3: Regression closure loop

**Files:**
- Modify: only files implicated by failed acceptance rows
- Test: `tests/*.test.mjs`
- Modify: `docs/qa/v1-acceptance.md`

**Interfaces:**
- Consumes: Fail results from the acceptance matrix.
- Produces: passing regression evidence or a documented external/device blocker.

- [ ] **Step 1: Process one failed row at a time**

For each failure, record exact reproduction steps, expected result, actual result, platform, and logs in the Notes column. Do not batch unrelated failures.

- [ ] **Step 2: Add a failing regression test when automatable**

Name the test after the user-visible failure and assert the smallest stable behavior boundary. Run only that test and confirm it fails for the observed reason.

- [ ] **Step 3: Implement the smallest root-cause fix**

Change only the responsible component or service. Re-run the focused test, then `npm.cmd run verify:v1`.

- [ ] **Step 4: Re-run the device case**

Change the matrix result to Pass only after observing the expected behavior on the same platform. If external tooling prevents execution, leave `Not run` and document the missing emulator/device/build capability.

- [ ] **Step 5: Commit each independent regression**

Stage only the regression test, the responsible source file, and `docs/qa/v1-acceptance.md`. Use a `fix:` commit message naming the exact observed behavior from that row. Never stage unrelated workspace changes.

### Task 4: Final evidence report

**Files:**
- Create: `docs/qa/v1-verification-report.md`

**Interfaces:**
- Consumes: `verify:v1` output and completed acceptance matrix.
- Produces: release decision with no ambiguous completion language.

- [ ] **Step 1: Record automated evidence**

Include command, timestamp, exit code, test count, TypeScript result, Expo SDK/config result, Android bundle filename, and diff-check result.

- [ ] **Step 2: Summarize device evidence**

Count Pass, Fail, and Not run separately for Android and iOS. Link to `v1-acceptance.md` and list every remaining Fail or Not run row by name.

- [ ] **Step 3: State one release decision**

Use exactly one of:

- `Ready for release`: all automated checks and all Android/iOS acceptance rows pass.
- `Code complete; device acceptance pending`: automated checks pass and no row fails, but at least one device row is Not run.
- `Not ready`: any automated check or acceptance row fails.

- [ ] **Step 4: Commit the evidence report**

```bash
git add docs/qa/v1-verification-report.md
git commit -m "docs: record V1 verification evidence"
```
