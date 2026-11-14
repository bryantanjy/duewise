import test from 'node:test';
import assert from 'node:assert/strict';
import './support/register-typescript.mjs';
const { reminderShareContent } = await import('../src/utils/share-reminder.ts');
const source = {name: 'Insurance renewal', targetDate: '2027-02-01', repeatType: 'yearly', repeatInterval: 1, archived: false, costMinor: 2990, costCurrency: 'MYR', notes: 'private policy number', attachments: ['private.pdf'], id: 123, notificationId: 'secret'};

test('sharing contains date and cost without private data or internal identifiers', () => {
  const result = reminderShareContent(source);
  assert.equal(result.title, source.name);
  assert.match(result.message, /2027-02-01/);
  assert.match(result.message, /MYR/);
  assert.match(result.message, /29.90/);
  assert.match(result.message, /later changes are not synced/);
  for (const value of ['private policy number', 'private.pdf', 'secret', '123']) assert.equal(result.message.includes(value), false);
  assert.equal(result.message.includes('Archived'), false);
});
test('archived reminders are labelled and absent costs omitted; free costs remain visible', () => {
  assert.match(reminderShareContent({...source, archived: true}).message, /Status: Archived/);
  assert.equal(reminderShareContent({...source, costMinor: null}).message.includes('Cost:'), false);
  assert.match(reminderShareContent({...source, costMinor: 0}).message, /Cost:.*0.00/);
  assert.match(reminderShareContent({...source, repeatType: 'custom', repeatInterval: 14}).message, /14/);
});
