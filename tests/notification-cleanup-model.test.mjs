import assert from 'node:assert/strict';
import test from 'node:test';

let uniqueNotificationIds;
try {
  ({ uniqueNotificationIds } = await import('../src/utils/notification-cleanup-model.ts'));
} catch {}

test('cleanup IDs exclude nulls, blanks, and duplicates', () => {
  assert.deepEqual(
    uniqueNotificationIds(['native-1', null, '', 'native-1', 'native-2']),
    ['native-1', 'native-2'],
  );
});
