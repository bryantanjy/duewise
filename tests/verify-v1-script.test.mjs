import assert from 'node:assert/strict';
import test from 'node:test';

const { runSteps, verificationSteps } = await import('../scripts/verify-v1.mjs');

test('verification exports both native targets', () => {
  assert.ok(verificationSteps.some((step) => step.includes('--platform android')));
  assert.ok(verificationSteps.some((step) => step.includes('--platform ios')));
});

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
