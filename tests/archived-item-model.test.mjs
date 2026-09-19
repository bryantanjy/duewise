import assert from 'node:assert/strict';
import test from 'node:test';

const { buildArchivedItemModel } = await import('../src/utils/archived-item-model.ts');

test('archived item model retains identity and reminder configuration', () => {
  assert.deepEqual(
    buildArchivedItemModel({
      categoryColor: '#4F6BED',
      categoryName: 'Vehicle',
      id: 4,
      importance: 'high',
      name: 'Road tax',
      reminderCount: 3,
      repeatType: 'yearly',
      targetDate: '2027-09-18',
    }),
    {
      categoryColor: '#4F6BED',
      categoryName: 'Vehicle',
      id: 4,
      importance: 'high',
      name: 'Road tax',
      reminderLabel: '3 reminder days saved',
      repeatType: 'yearly',
      targetDate: '2027-09-18',
    },
  );
});

test('archived item model supplies safe presentation fallbacks', () => {
  assert.deepEqual(
    buildArchivedItemModel({
      categoryColor: 'not-a-color',
      categoryName: null,
      id: 5,
      importance: 'normal',
      name: '   ',
      reminderCount: 0,
      repeatType: 'none',
      targetDate: '2027-09-19',
    }),
    {
      categoryColor: '#737373',
      categoryName: 'Uncategorized',
      id: 5,
      importance: 'normal',
      name: 'Untitled item',
      reminderLabel: 'No reminder days saved',
      repeatType: 'none',
      targetDate: '2027-09-19',
    },
  );
});
