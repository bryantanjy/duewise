import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWidgetModel, buildWidgetTimeline, widgetDateKey } from '../src/utils/widget-model.ts';

const item = (id, targetDate, archived = false) => ({ id, targetDate, archived, name: `Reminder ${id}` });
const now = new Date(2026, 10, 8, 23, 50);

test('widget selects the next three dates and counts overdue items without displaying archived items', () => {
  const source = [item(4, '2026-12-01'), item(2, '2026-11-09'), item(1, '2026-11-08'),
    item(3, '2026-11-10'), item(5, '2026-11-01'), item(6, '2026-11-08', 1)];
  const model = buildWidgetModel(source, now);
  assert.deepEqual(model.rows.map(({ id }) => id), [1, 2, 3]);
  assert.deepEqual(model.rows.map(({ status }) => status), ['Today', 'Tomorrow', 'In 2 days']);
  assert.equal(model.upcomingCount, 4);
  assert.equal(model.overdueCount, 1);
  assert.equal(source[0].id, 4);
});

test('widget only exposes names, dates and app links, not notes or notification identifiers', () => {
  const model = buildWidgetModel([{ ...item(7, '2026-11-08'), notes: 'private note', notificationId: 'native-id' }], now);
  assert.equal(model.rows[0].url, 'lifereminder://item/7');
  assert.equal(JSON.stringify(model).includes('private note'), false);
  assert.equal(JSON.stringify(model).includes('native-id'), false);
});

test('bad dates and IDs are excluded; an all-overdue list retains its overdue count', () => {
  const model = buildWidgetModel([item(1, '2026-11-07'), item(2, '2026-02-30'), item(-1, '2026-11-09')], now);
  assert.deepEqual(model.rows, []);
  assert.equal(model.overdueCount, 1);
  assert.equal(model.upcomingCount, 0);
});

test('timeline updates at local midnight and moves elapsed dates into the overdue count', () => {
  const timeline = buildWidgetTimeline([item(1, '2026-11-08'), item(2, '2026-11-09')], now);
  assert.equal(timeline.length, 32);
  assert.equal(timeline[0].date.getTime(), now.getTime());
  assert.equal(widgetDateKey(timeline[1].date), '2026-11-09');
  assert.equal(timeline[1].date.getHours(), 0);
  assert.deepEqual(timeline[1].props.rows.map(({ id }) => id), [2]);
  assert.equal(timeline[1].props.rows[0].status, 'Today');
  assert.equal(timeline[1].props.overdueCount, 1);
  for (let i = 1; i < timeline.length; i++) assert.ok(timeline[i].date > timeline[i - 1].date);
});
