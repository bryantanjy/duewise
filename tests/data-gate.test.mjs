import test from 'node:test';
import assert from 'node:assert/strict';
import { withDataGate, assertLocalWritesAllowed } from '../src/services/data-gate.ts';
test('sync excludes local async mutations and rejects synchronous writes until its gate releases', async () => {
  const events=[]; let release;
  const waiting=new Promise(resolve=>{release=resolve});
  const sync=withDataGate(async()=>{events.push('sync');assert.throws(assertLocalWritesAllowed);await waiting;events.push('commit')},true);
  const edit=withDataGate(async()=>{assertLocalWritesAllowed();events.push('edit')});
  await Promise.resolve();assert.deepEqual(events,['sync']);release();await Promise.all([sync,edit]);
  assert.deepEqual(events,['sync','commit','edit']);
  await assert.rejects(withDataGate(async()=>{throw new Error('offline')},true));
  assert.doesNotThrow(assertLocalWritesAllowed);
});
