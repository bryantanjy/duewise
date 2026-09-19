import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import './support/register-typescript.mjs';

// Only the platform/database boundary is replaced; planning exports are real.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const stubs = {
      expo: 'export const isRunningInExpoGo = () => false;',
      'react-native': "export const Platform = { OS: 'web' };",
      '@/db': 'export const db = {};',
    };
    if (specifier in stubs) {
      return { url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}`, shortCircuit: true };
    }
    if (specifier.startsWith('@/')) {
      return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const service = await import('../src/services/items.ts');

test('old notification IDs discard null and duplicate IDs', () => {
  assert.equal(typeof service.oldNotificationIds, 'function');
  assert.deepEqual(service.oldNotificationIds([
    { notificationId: null }, { notificationId: 'old-a' },
    { notificationId: 'old-a' }, { notificationId: 'old-b' },
  ]), ['old-a', 'old-b']);
});

test('operation result reports scheduled and skipped counts', () => {
  assert.equal(typeof service.itemOperationResult, 'function');
  assert.deepEqual(service.itemOperationResult(42, {
    createdNotificationIds: ['new-a', 'new-b'], skippedReminderCount: 1,
  }), { itemId: 42, scheduledReminderCount: 2, skippedReminderCount: 1 });
});
