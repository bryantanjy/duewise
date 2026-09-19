import assert from 'node:assert/strict';
import test from 'node:test';

let formatDateForDisplay;
let parseStoredDate;
let toStoredDate;
let validateItemForm;

try {
  ({
    formatDateForDisplay,
    parseStoredDate,
    toStoredDate,
    validateItemForm,
  } = await import('../src/utils/item-form.ts'));
} catch {
  // The first run intentionally proves the form utility does not exist yet.
}

test('selected local calendar day is stored without a timezone shift', () => {
  assert.equal(typeof toStoredDate, 'function');

  const selectedDate = new Date(2026, 8, 17, 23, 45);

  assert.equal(toStoredDate(selectedDate), '2026-09-17');
});

test('stored date hydrates as the same local calendar day', () => {
  assert.equal(typeof parseStoredDate, 'function');

  const parsedDate = parseStoredDate('2026-09-17');

  assert.equal(parsedDate?.getFullYear(), 2026);
  assert.equal(parsedDate?.getMonth(), 8);
  assert.equal(parsedDate?.getDate(), 17);
  assert.equal(parseStoredDate('2026-02-30'), undefined);
});

test('selected date has a readable display label', () => {
  assert.equal(typeof formatDateForDisplay, 'function');

  assert.equal(formatDateForDisplay('2026-09-17', 'en-GB'), '17 September 2026');
});

test('valid form input normalizes reminder days', () => {
  assert.equal(typeof validateItemForm, 'function');

  assert.deepEqual(
    validateItemForm({
      categoryId: 2,
      name: 'Car road tax',
      reminderDays: '7, 30, 7, 0',
      targetDate: '2026-09-17',
    }),
    {
      fieldErrors: {},
      parsedReminderDays: [30, 7, 0],
    },
  );
});

test('invalid form input reports errors beside each affected field', () => {
  assert.equal(typeof validateItemForm, 'function');

  assert.deepEqual(
    validateItemForm({
      categoryId: undefined,
      name: '   ',
      reminderDays: '7, tomorrow',
      targetDate: '2026-02-30',
    }),
    {
      fieldErrors: {
        category: 'Choose a category.',
        name: 'Enter an item name.',
        reminderDays: 'Use whole numbers separated by commas.',
        targetDate: 'Choose a valid target date.',
      },
    },
  );
});
