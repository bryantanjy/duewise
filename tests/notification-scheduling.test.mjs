import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import './support/register-typescript.mjs';

globalThis.__scheduled = [];
globalThis.__categories = [];
globalThis.__permissionGranted = true;
globalThis.__channel = { importance: 4 };
registerHooks({
  resolve(specifier, context, nextResolve) {
    const stubs = {
      'react-native': "export const Platform = { OS: 'android' };",
      'expo-notifications': `
        export const AndroidImportance = { HIGH: 4, NONE: 2 };
        export const SchedulableTriggerInputTypes = { DATE: 'date', TIME_INTERVAL: 'timeInterval' };
        export const setNotificationHandler = () => {};
        export const setNotificationChannelAsync = async () => {};
        export const getNotificationChannelAsync = async () => globalThis.__channel;
        export const getAllScheduledNotificationsAsync = async () => globalThis.__scheduled.map((request, index) => ({ ...request, identifier: request.identifier ?? ('id-' + index) }));
        export const getPermissionsAsync = async () => ({ granted: globalThis.__permissionGranted });
        export const requestPermissionsAsync = getPermissionsAsync;
        export const setNotificationCategoryAsync = async (id, actions) => { globalThis.__categories.push({ id, actions }); };
        export const scheduleNotificationAsync = async (request) => { globalThis.__scheduled.push(request); return request.identifier ?? 'notification-id'; };
        export const cancelScheduledNotificationAsync = async () => {};
      `,
    };
    if (specifier in stubs) return { url: 'data:text/javascript,' + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const service = await import('../src/services/notifications.ts');
test.beforeEach(() => { globalThis.__scheduled = []; globalThis.__categories = []; globalThis.__permissionGranted = true; globalThis.__channel = { importance: 4 }; });

test('scheduled reminders include native actions, the chosen local time, and occurrence identity', async () => {
  await service.scheduleItemReminder({ daysBefore: 1, itemId: 2, itemName: 'Passport', targetDate: '2099-01-02', reminderTime: '18:45' });
  const request = globalThis.__scheduled[0];
  assert.equal(request.trigger.date.getDate(), 1);
  assert.equal(request.trigger.date.getHours(), 18);
  assert.equal(request.trigger.date.getMinutes(), 45);
  assert.equal(request.content.categoryIdentifier, 'duewise_reminder');
  assert.equal(request.content.data.targetDate, '2099-01-02');
  assert.equal(request.content.data.scheduledFor, request.trigger.date.toISOString());
  assert.deepEqual(globalThis.__categories[0].actions.map((action) => action.identifier), ['duewise_snooze_hour', 'duewise_complete']);
});

test('snooze schedules one hour ahead and includes actions again', async () => {
  const before = Date.now();
  await service.scheduleSnoozedReminder({ itemId: 2, itemName: 'Passport', targetDate: '2099-01-02', requestId: 'original' });
  const request = globalThis.__scheduled[0];
  assert.equal(request.identifier, 'duewise_snooze_original');
  assert.ok(request.trigger.date.getTime() >= before + 3600000);
  assert.ok(request.trigger.date.getTime() <= Date.now() + 3600000);
  assert.equal(request.content.categoryIdentifier, 'duewise_reminder');
});

test('permission denial and past times never claim to schedule a notification', async () => {
  globalThis.__permissionGranted = false;
  assert.equal(await service.scheduleItemReminder({ daysBefore: 0, itemId: 2, itemName: 'Passport', targetDate: '2099-01-02' }), null);
  await assert.rejects(service.scheduleSnoozedReminder({ itemId: 2, itemName: 'Passport', targetDate: '2099-01-02', requestId: 'original' }));
  assert.equal(await service.scheduleItemReminder({ daysBefore: 0, itemId: 2, itemName: 'Passport', targetDate: '2000-01-02' }), null);
  assert.equal(globalThis.__scheduled.length, 0);
});


test('a disabled channel prevents scheduling even when app permission is granted', async () => {
  globalThis.__channel = { importance: 2 };
  assert.equal(await service.scheduleTestNotification(), null);
  assert.equal(await service.scheduleItemReminder({ daysBefore: 0, itemId: 1, itemName: 'Test', targetDate: '2099-01-01' }), null);
  await assert.rejects(service.scheduleSnoozedReminder({ itemId: 1, itemName: 'Test', targetDate: '2099-01-01', requestId: 'blocked' }));
  assert.equal(globalThis.__scheduled.length, 0);
  const status = await service.getReminderDeviceStatus(new Set());
  assert.equal(status.state, 'blocked');
  assert.equal(status.blockedReason, 'channel');
});

test('readiness distinguishes missing channels and app permission from a working channel', async () => {
  globalThis.__channel = null;
  assert.equal((await service.getReminderDeviceStatus(new Set())).blockedReason, 'channel-missing');
  globalThis.__permissionGranted = false;
  assert.equal((await service.getReminderDeviceStatus(new Set())).blockedReason, 'permission');
  globalThis.__permissionGranted = true;
  globalThis.__channel = { importance: 4 };
  await service.scheduleTestNotification();
  const status = await service.getReminderDeviceStatus(new Set(['id-0']));
  assert.equal(status.state, 'ready');
  assert.equal(status.timing, 'may-be-delayed');
  assert.deepEqual(status.notifications, [{ id: 'id-0', scheduledFor: undefined }]);
  assert.deepEqual((await service.getReminderDeviceStatus(new Set(['other']))).notifications, []);
});
