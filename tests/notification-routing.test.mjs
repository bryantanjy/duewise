import assert from 'node:assert/strict';
import test from 'node:test';

let createResponseDeduper;
let createNotificationResponseCoordinator;
let notificationItemRoute;
try {
  ({ createNotificationResponseCoordinator, createResponseDeduper, notificationItemRoute } =
    await import('../src/utils/notification-routing.ts'));
} catch {}

test('valid item reminder becomes an internal item route', () => {
  assert.equal(notificationItemRoute({ type: 'item-reminder', itemId: 42 }), '/item/42');
  assert.equal(notificationItemRoute({ type: 'item-reminder', itemId: '7' }), '/item/7');
});

test('test, malformed, and arbitrary URL payloads do not navigate', () => {
  assert.equal(notificationItemRoute({ type: 'notification-test' }), undefined);
  assert.equal(notificationItemRoute({ type: 'item-reminder', itemId: 0 }), undefined);
  assert.equal(notificationItemRoute({ type: 'item-reminder', itemId: '7x' }), undefined);
  assert.equal(notificationItemRoute({ type: 'item-reminder', url: 'https://example.com' }), undefined);
});

test('a response identifier is accepted only once', () => {
  const deduper = createResponseDeduper();
  assert.equal(deduper.accept('response-1'), true);
  assert.equal(deduper.accept('response-1'), false);
  assert.equal(deduper.accept('response-2'), true);
});

test('the response coordinator filters non-default actions and invalid payloads', () => {
  assert.equal(typeof createNotificationResponseCoordinator, 'function');
  const navigated = [];
  const coordinator = createNotificationResponseCoordinator((route) => navigated.push(route));
  coordinator.setReady(true);

  coordinator.handleResponse({
    actionIdentifier: 'custom-action',
    data: { type: 'item-reminder', itemId: 1 },
    defaultActionIdentifier: 'default-action',
    requestIdentifier: 'request-1',
  });
  coordinator.handleResponse({
    actionIdentifier: 'default-action',
    data: { type: 'notification-test' },
    defaultActionIdentifier: 'default-action',
    requestIdentifier: 'request-2',
  });

  assert.deepEqual(navigated, []);
});

test('the response coordinator deduplicates and buffers routes in FIFO order', () => {
  assert.equal(typeof createNotificationResponseCoordinator, 'function');
  const navigated = [];
  const coordinator = createNotificationResponseCoordinator((route) => navigated.push(route));

  coordinator.handleResponse({
    actionIdentifier: 'default-action',
    data: { type: 'item-reminder', itemId: 11 },
    defaultActionIdentifier: 'default-action',
    requestIdentifier: 'request-11',
  });
  coordinator.handleResponse({
    actionIdentifier: 'default-action',
    data: { type: 'item-reminder', itemId: 11 },
    defaultActionIdentifier: 'default-action',
    requestIdentifier: 'request-11',
  });
  coordinator.handleResponse({
    actionIdentifier: 'default-action',
    data: { type: 'item-reminder', itemId: 12 },
    defaultActionIdentifier: 'default-action',
    requestIdentifier: 'request-12',
  });

  assert.deepEqual(navigated, []);
  coordinator.setReady(true);
  assert.deepEqual(navigated, ['/item/11', '/item/12']);
});

test('the response coordinator drains accepted routes immediately after readiness', () => {
  assert.equal(typeof createNotificationResponseCoordinator, 'function');
  const navigated = [];
  const coordinator = createNotificationResponseCoordinator((route) => navigated.push(route));
  coordinator.setReady(true);

  coordinator.handleResponse({
    actionIdentifier: 'default-action',
    data: { type: 'item-reminder', itemId: 21 },
    defaultActionIdentifier: 'default-action',
    requestIdentifier: 'request-21',
  });
  coordinator.handleResponse({
    actionIdentifier: 'default-action',
    data: { type: 'item-reminder', itemId: 22 },
    defaultActionIdentifier: 'default-action',
    requestIdentifier: 'request-22',
  });

  assert.deepEqual(navigated, ['/item/21', '/item/22']);
});
