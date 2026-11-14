import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
const plugin = config.plugins.find((entry) => Array.isArray(entry) && entry[0] === 'react-native-android-widget');

test('Android widgets are discoverable by the home-screen-only AppWidgetManager query', () => {
  assert.ok(plugin, 'Android widget config plugin must be present');
  for (const widget of plugin[1].widgets) {
    // HOME_SCREEN is bit 1; NOT_KEYGUARD is bit 8 and does not enable discovery.
    const flags = (widget.widgetCategory ?? 'home_screen').split('|');
    assert.ok(flags.includes('home_screen'), `${widget.name} must opt into home-screen discovery`);
    assert.ok(flags.includes('not_keyguard'), `${widget.name} must retain its lock-screen restriction`);
  }
});
