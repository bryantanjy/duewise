import assert from 'node:assert/strict';
import test from 'node:test';

let processCleanupRows;
try {
  ({ processCleanupRows } = await import('../src/utils/notification-cleanup-model.ts'));
} catch {}

test('cleanup reports successful and failed native cancellations', async () => {
  const result = await processCleanupRows(
    [
      { id: 1, notificationId: 'ok' },
      { id: 2, notificationId: 'fail' },
    ],
    async (id) => {
      if (id === 'fail') throw new Error('offline');
    },
  );

  assert.deepEqual(result.completedIds, [1]);
  assert.deepEqual(result.failures, [{ id: 2, message: 'offline' }]);
});
