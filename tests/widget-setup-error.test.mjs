import assert from 'node:assert/strict';
import test from 'node:test';
import { widgetSetupErrorMessage } from '../src/utils/widget-setup-error.ts';

test('missing native provider explains a rebuild rather than suggesting an ineffective restart', () => {
  const error = Object.assign(new Error('No widget provider named DuewiseUpcoming was found'), { code: 'E_WIDGET_NOT_FOUND' });
  assert.match(widgetSetupErrorMessage(error), /Install a build/);
  assert.match(widgetSetupErrorMessage(error), /reopening the app will not fix it/);
});

test('launcher pinning failures offer the manual widget picker', () => {
  assert.match(widgetSetupErrorMessage({ code: 'E_REQUEST_PIN_WIDGET' }), /choose Widgets/);
});

test('older native modules require a fresh binary', () => {
  assert.match(widgetSetupErrorMessage(new TypeError('requestPinWidget is not a function')), /newly rebuilt/);
});

test('unexpected native errors remain visible for diagnosis', () => {
  assert.match(widgetSetupErrorMessage(new Error('App group unavailable')), /App group unavailable/);
  assert.match(widgetSetupErrorMessage(undefined), /widget picker/);
});
