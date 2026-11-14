import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import './support/register-typescript.mjs';

globalThis.__calendar = { platform: 'android', native: true, expoGo: false, permission: true, action: 'saved', calls: [] };
registerHooks({ resolve(specifier, context, nextResolve) {
  const stubs = {
    expo: `export const isRunningInExpoGo=()=>globalThis.__calendar.expoGo;
      export const requireOptionalNativeModule=()=>globalThis.__calendar.native?{}:null;`,
    'react-native': `export const Platform={get OS(){return globalThis.__calendar.platform}};`,
    'expo-calendar/legacy': `export const createEventInCalendarAsync=async(event,options)=>{globalThis.__calendar.calls.push({event,options});return {action:'done',id:null}};`,
    'expo-calendar': `export const requestCalendarPermissions=async(writeOnly)=>{globalThis.__calendar.calls.push({writeOnly});return {granted:globalThis.__calendar.permission}};
      export const getDefaultCalendarSync=()=>({addEventWithForm:async(event)=>{globalThis.__calendar.calls.push({event});return {action:globalThis.__calendar.action,id:'event-id'}}});`,
  };
  if (specifier in stubs) return { url: 'data:text/javascript,' + encodeURIComponent(stubs[specifier]), shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { buildCalendarExport } = await import('../src/utils/calendar-export.ts');
const { exportReminderToCalendar } = await import('../src/services/calendar-export.ts');
const item = { id: 4, name: 'Passport', targetDate: '2028-02-29', reminderTime: '23:45', notes: 'Bring documents', repeatType: 'yearly' };
test.beforeEach(() => { Object.assign(globalThis.__calendar, { platform: 'android', native: true, expoGo: false, permission: true, action: 'saved', calls: [] }); });

test('export uses the local due date and selected time, with a 30-minute duration across midnight', () => {
  const event = buildCalendarExport(item);
  assert.equal(event.startDate.getDate(), 29);
  assert.equal(event.startDate.getHours(), 23);
  assert.equal(event.startDate.getMinutes(), 45);
  assert.equal(event.endDate.getMonth(), 2);
  assert.equal(event.endDate.getDate(), 1);
  assert.equal(event.endDate - event.startDate, 1800000);
  assert.ok(event.notes.includes('Bring documents'));
  assert.equal('recurrenceRule' in event, false);
  assert.throws(() => buildCalendarExport({ ...item, targetDate: '2027-02-29' }), /valid due date/);
});

test('Android opens an editable form without requesting calendar access or claiming it was saved', async () => {
  const message = await exportReminderToCalendar(item);
  assert.equal(globalThis.__calendar.calls.length, 1);
  assert.equal(globalThis.__calendar.calls[0].options.startNewActivityTask, false);
  assert.match(message, /confirm the event was saved/);
});

test('iOS requests write-only access and reports saved or canceled accurately', async () => {
  globalThis.__calendar.platform = 'ios';
  assert.match(await exportReminderToCalendar(item), /Added to your calendar/);
  assert.equal(globalThis.__calendar.calls[0].writeOnly, true);
  globalThis.__calendar.action = 'canceled';
  assert.equal(await exportReminderToCalendar(item), undefined);
});

test('permission denial does not open an event form', async () => {
  Object.assign(globalThis.__calendar, { platform: 'ios', permission: false });
  await assert.rejects(exportReminderToCalendar(item), /device settings/);
  assert.equal(globalThis.__calendar.calls.length, 1);
});

test('web and missing native modules provide recovery instructions before opening a form', async () => {
  globalThis.__calendar.platform = 'web';
  await assert.rejects(exportReminderToCalendar(item), /Android and iOS app/);
  Object.assign(globalThis.__calendar, { platform: 'android', native: false });
  await assert.rejects(exportReminderToCalendar(item), /new Duewise build/);
  assert.equal(globalThis.__calendar.calls.length, 0);
});
