import assert from 'node:assert/strict';
import test from 'node:test';

let buildCalendarEventModel;
try {
  ({ buildCalendarEventModel } = await import('../src/utils/calendar-event-model.ts'));
} catch {
  // The first run intentionally proves the missing calendar presentation boundary.
}

test('selected due item keeps visible event-card content', () => {
  assert.equal(typeof buildCalendarEventModel, 'function');

  const model = buildCalendarEventModel(
    {
      categoryColor: '#4F6BED',
      categoryName: 'Vehicle',
      id: 7,
      importance: 'high',
      name: 'Car road tax',
      repeatType: 'yearly',
      targetDate: '2026-09-17',
    },
    '2027-09-17',
  );

  assert.deepEqual(model, {
    categoryColor: '#4F6BED',
    categoryLabel: 'Vehicle · Yearly',
    date: '2027-09-17',
    highImportance: true,
    id: 7,
    title: 'Car road tax',
  });
});

test('event card always has readable fallback content', () => {
  assert.equal(typeof buildCalendarEventModel, 'function');

  const model = buildCalendarEventModel(
    {
      categoryColor: null,
      categoryName: null,
      id: 8,
      importance: 'normal',
      name: '   ',
      repeatType: 'none',
      targetDate: '2026-09-18',
    },
    '2026-09-18',
  );

  assert.equal(model.title, 'Untitled item');
  assert.equal(model.categoryLabel, 'Uncategorized');
  assert.equal(model.categoryColor, '#737373');
});
