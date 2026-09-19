import assert from 'node:assert/strict';
import test from 'node:test';

let buildDefaultCategoryRepairs;
let resolveCategoryVisual;

try {
  ({ buildDefaultCategoryRepairs } = await import('../src/constants/categories.ts'));
  ({ resolveCategoryVisual } = await import('../src/utils/category-visual.ts'));
} catch {
  // The first run intentionally proves the presentation boundary is missing.
}

test('database category icon and color are preserved for presentation', () => {
  assert.equal(typeof resolveCategoryVisual, 'function');

  assert.deepEqual(resolveCategoryVisual('car-front', '#4F6BED'), {
    color: '#4F6BED',
    icon: 'car-front',
  });
});

test('unknown or incomplete category visuals use safe fallbacks', () => {
  assert.equal(typeof resolveCategoryVisual, 'function');

  assert.deepEqual(resolveCategoryVisual('not-a-real-icon', 'blue'), {
    color: '#737373',
    icon: 'circle-ellipsis',
  });
});

test('startup repairs only missing visual fields on default categories', () => {
  assert.equal(typeof buildDefaultCategoryRepairs, 'function');

  assert.deepEqual(
    buildDefaultCategoryRepairs([
      { color: null, icon: null, id: 1, name: 'Vehicle' },
      { color: null, icon: 'file-text', id: 2, name: 'Document' },
      { color: null, icon: null, id: 9, name: 'Personal' },
    ]),
    [
      { color: '#4F6BED', icon: 'car-front', id: 1 },
      { color: '#7C5CFC', icon: 'file-text', id: 2 },
    ],
  );
});
