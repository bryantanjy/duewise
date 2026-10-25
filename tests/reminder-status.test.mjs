import assert from 'node:assert/strict';
import test from 'node:test';
import { reminderStatusLabel, nextScheduledReminder, alertScheduleStatus, isMissingFutureAlert } from '../src/utils/reminder-status.ts';

test('status reflects permission and actual device queue rather than stale database IDs', () => {
  assert.equal(reminderStatusLabel('old', { state: 'ready', notifications: [] }), 'Not scheduled');
  assert.equal(reminderStatusLabel('id', { state: 'blocked', notifications: [{ id: 'id' }] }), 'Notifications disabled');
  assert.equal(reminderStatusLabel('id', { state: 'ready', notifications: [{ id: 'id' }] }), 'Scheduled');
  assert.equal(reminderStatusLabel('id', { state: 'unsupported', notifications: [] }), 'Unavailable here');
  assert.equal(reminderStatusLabel('id', { state: 'error', notifications: [] }), 'Unable to verify');
});

test('next reminder excludes other items and past notifications, including snoozes', () => {
  const status = { state: 'ready', notifications: [
    { id: 'other', scheduledFor: '2027-01-01T01:00:00Z' },
    { id: 'past', scheduledFor: '2026-01-01T00:00:00Z' },
    { id: 'normal', scheduledFor: '2027-02-01T00:00:00Z' },
    { id: 'snooze', scheduledFor: '2027-01-01T02:00:00Z' },
  ] };
  assert.equal(nextScheduledReminder(status, ['past', 'normal', 'snooze'], Date.parse('2027-01-01T00:00:00Z')), '2027-01-01T02:00:00Z');
});

const now = Date.parse('2027-01-01T00:00:00Z');
const alert = { notificationId: 'missing', enabled: true, archived: false, isSnooze: false,
  scheduledFor: '2027-01-02T09:00:00Z', deviceStatus: { state: 'ready', notifications: [] }, now };

test('recovery targets missing future alerts without treating elapsed times as failures', () => {
  assert.equal(isMissingFutureAlert(alert), true);
  assert.equal(isMissingFutureAlert({ ...alert, scheduledFor: '2026-12-31T09:00:00Z' }), false);
  assert.equal(alertScheduleStatus({ ...alert, scheduledFor: '2026-12-31T09:00:00Z' }), 'Time passed');
  assert.equal(alertScheduleStatus(alert), 'Not scheduled');
  assert.equal(isMissingFutureAlert({ ...alert, scheduledFor: 'invalid' }), false);
});

test('disabled, archived, snoozed, and unverified alerts do not offer a scheduling retry', () => {
  for (const change of [{ enabled: false }, { archived: true }, { isSnooze: true },
    { deviceStatus: undefined }, ...['blocked', 'error', 'unsupported'].map(state => ({ deviceStatus: { state, notifications: [] } }))]) {
    assert.equal(isMissingFutureAlert({ ...alert, ...change }), false);
  }
  assert.equal(alertScheduleStatus({ ...alert, archived: true }), 'Paused');
  assert.equal(alertScheduleStatus({ ...alert, enabled: false }), 'Off');
  assert.equal(alertScheduleStatus({ ...alert, deviceStatus: { state: 'blocked', notifications: [] } }), 'Notifications disabled');
});

test('an actual queued notification suppresses missing-alert recovery', () => {
  const queued = { ...alert, deviceStatus: { state: 'ready', notifications: [{ id: 'missing' }] } };
  assert.equal(isMissingFutureAlert(queued), false);
  assert.equal(alertScheduleStatus(queued), 'Scheduled');
});


test('disabled reminder channels never claim scheduled alerts or a next delivery time', () => {
  const status = { state: 'blocked', blockedReason: 'channel', notifications: [{ id: 'queued', scheduledFor: '2027-02-01T00:00:00Z' }] };
  assert.equal(reminderStatusLabel('queued', status), 'Reminder channel disabled');
  assert.equal(nextScheduledReminder(status, ['queued'], now), undefined);
  assert.equal(isMissingFutureAlert({ ...alert, deviceStatus: status }), false);
  assert.equal(reminderStatusLabel(null, { ...status, blockedReason: 'channel-missing' }), 'Reminder channel unavailable');
});
