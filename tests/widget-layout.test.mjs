import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { transformFileSync } from '@babel/core';
import { buildWidgetModel } from '../src/utils/widget-model.ts';

// Exercise Expo's real serialization transform in a fresh runtime, where app
// imports/state do not exist. Native SwiftUI rendering still needs device QA.
const { code } = transformFileSync('src/widgets/UpcomingWidget.ios.tsx', {
  configFile: false, babelrc: false, presets: ['babel-preset-expo'],
  caller: { name: 'metro', platform: 'ios', isDev: false },
});
let layout;
vm.runInNewContext(code, {
  exports: {}, require: (name) => name === 'expo-widgets'
    ? { createWidget: (_name, source) => { layout = source; return {}; } } : {},
});
assert.equal(typeof layout, 'string');
const jsx = (type, props) => ({ type, props });
const runtime = { _jsx: jsx, _jsxs: jsx };
for (const name of ['Link', 'Spacer', 'Text', 'VStack']) runtime[name] = name;
for (const name of ['containerBackground', 'font', 'foregroundStyle', 'frame', 'lineLimit', 'widgetURL']) {
  runtime[name] = (...args) => ({ name, args });
}
const render = vm.runInNewContext(`(${layout})`, runtime);
const model = buildWidgetModel([1, 2, 3].map((id) => ({ id, name: `Reminder ${id}`, targetDate: '2026-11-09', archived: false })), new Date(2026, 10, 8));

test('serialized iOS layout renders each size without app-runtime globals', () => {
  for (const [widgetFamily, count] of [['systemSmall', 1], ['systemMedium', 2], ['systemLarge', 3]]) {
    for (const colorScheme of ['light', 'dark']) {
      const tree = render(model, { widgetFamily, colorScheme });
      const rowLinks = tree.props.children.flat(Infinity).filter((node) => node?.type === 'Link' && node.props.destination.includes('/item/'));
      assert.equal(rowLinks.length, count);
      assert.equal(rowLinks[0].props.destination, 'lifereminder://item/1');
    }
  }
});

test('serialized layout handles its initial empty snapshot and the overdue filter', () => {
  const empty = render({}, { widgetFamily: 'systemSmall', colorScheme: 'light' });
  assert.ok(JSON.stringify(empty).includes('Nothing upcoming'));
  const overdue = render({ ...model, overdueCount: 2 }, { widgetFamily: 'systemLarge', colorScheme: 'dark' });
  assert.ok(JSON.stringify(overdue).includes('lifereminder://items?status=overdue'));
});
