import assert from 'node:assert/strict';
import test from 'node:test';
import { REMINDER_TEMPLATES, templateFormValues } from '../src/utils/reminder-templates.ts';

test('templates resolve category IDs by name and preserve a personalized name', () => {
  const values = templateFormValues('subscription', [{ id: 42, name: 'Subscription' }],
    { name: 'Music plan', categoryId: 1 });
  assert.equal(values.name, 'Music plan');
  assert.equal(values.categoryId, 42);
  assert.equal(values.repeatType, 'monthly');
  assert.deepEqual(values.reminderDays, [3, 1, 0]);
  assert.equal('targetDate' in values, false);
  assert.equal('reminderTime' in values, false);
  assert.equal('notes' in values, false);
});

test('missing template categories retain the current category instead of inventing an ID', () => {
  assert.equal(templateFormValues('passport', [], { name: '', categoryId: 19 }).categoryId, 19);
  assert.equal(templateFormValues('passport', [], { name: '', categoryId: undefined }).categoryId, undefined);
  assert.equal(templateFormValues('unknown', [], { name: '', categoryId: 19 }), undefined);
});

test('switching templates updates the suggested name but retains a customized name', () => {
  assert.equal(templateFormValues('birthday', [], {
    name: 'Passport expiry', categoryId: 1, previousTemplateId: 'passport',
  }).name, 'Birthday');
  assert.equal(templateFormValues('birthday', [], {
    name: 'My passport', categoryId: 1, previousTemplateId: 'passport',
  }).name, 'My passport');
});

test('expiry templates are one-time and birthday repeats annually', () => {
  for (const id of ['passport', 'warranty']) {
    assert.equal(templateFormValues(id, [], { name: '', categoryId: 1 }).repeatType, 'none');
  }
  const birthday = templateFormValues('birthday', [], { name: '  ', categoryId: 1 });
  assert.equal(birthday.name, 'Birthday');
  assert.equal(birthday.dateType, 'birthday');
  assert.equal(birthday.repeatType, 'yearly');
});

test('each application owns its reminder days and presets have unique stable IDs', () => {
  assert.equal(new Set(REMINDER_TEMPLATES.map(({ id }) => id)).size, REMINDER_TEMPLATES.length);
  const first = templateFormValues('passport', [], { name: '', categoryId: 1 });
  first.reminderDays.pop();
  assert.deepEqual(templateFormValues('passport', [], { name: '', categoryId: 1 }).reminderDays, [180, 90, 30, 0]);
});
