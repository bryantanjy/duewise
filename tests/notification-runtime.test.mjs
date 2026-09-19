import assert from 'node:assert/strict';
import test from 'node:test';

let runWithNotificationRuntime;
try {
  ({ runWithNotificationRuntime } = await import('../src/utils/notification-runtime.ts'));
} catch {}

test('unsupported platforms skip notification runtime loading and use', async () => {
  assert.equal(typeof runWithNotificationRuntime, 'function');
  const events = [];

  for (const boundary of [
    { platform: 'web', runningInExpoGo: false },
    { platform: 'android', runningInExpoGo: true },
  ]) {
    await runWithNotificationRuntime({
      ...boundary,
      load: async () => {
        events.push('load');
        return { available: true };
      },
      onLoaded: () => {
        events.push('use');
      },
    });
  }

  assert.deepEqual(events, []);
});

test('supported native platforms load and use the notification runtime', async () => {
  assert.equal(typeof runWithNotificationRuntime, 'function');
  const events = [];

  for (const boundary of [
    { platform: 'android', runningInExpoGo: false },
    { platform: 'ios', runningInExpoGo: true },
  ]) {
    await runWithNotificationRuntime({
      ...boundary,
      load: async () => {
        events.push(`load:${boundary.platform}`);
        return { platform: boundary.platform };
      },
      onLoaded: (runtime) => {
        events.push(`use:${runtime.platform}`);
      },
    });
  }

  assert.deepEqual(events, ['load:android', 'use:android', 'load:ios', 'use:ios']);
});

test('notification load rejection is contained before navigation and clearing', async () => {
  assert.equal(typeof runWithNotificationRuntime, 'function');
  const effects = [];

  await assert.doesNotReject(
    runWithNotificationRuntime({
      platform: 'ios',
      runningInExpoGo: false,
      load: async () => {
        throw new Error('native module unavailable');
      },
      onLoaded: () => {
        effects.push('navigate', 'clear');
      },
    }),
  );

  assert.deepEqual(effects, []);
});

test('notification runtime consumer failure is contained', async () => {
  assert.equal(typeof runWithNotificationRuntime, 'function');

  await assert.doesNotReject(
    runWithNotificationRuntime({
      platform: 'android',
      runningInExpoGo: false,
      load: async () => ({ available: true }),
      onLoaded: () => {
        throw new Error('notification API unavailable');
      },
    }),
  );
});
