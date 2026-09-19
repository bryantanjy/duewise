import assert from 'node:assert/strict';
import test from 'node:test';

import { scrollOffsetToShowField } from '../src/utils/keyboard-scroll.ts';

test('pushes a focused field above the shortened keyboard viewport', () => {
  assert.equal(scrollOffsetToShowField({
    currentOffset: 100,
    fieldTop: 340,
    fieldHeight: 52,
    viewportTop: 80,
    viewportHeight: 300,
  }), 128);
});

test('leaves a visible field in place and can reveal one above the viewport', () => {
  assert.equal(scrollOffsetToShowField({
    currentOffset: 100,
    fieldTop: 180,
    fieldHeight: 52,
    viewportTop: 80,
    viewportHeight: 300,
  }), 100);
  assert.equal(scrollOffsetToShowField({
    currentOffset: 100,
    fieldTop: 70,
    fieldHeight: 52,
    viewportTop: 80,
    viewportHeight: 300,
  }), 74);
});
