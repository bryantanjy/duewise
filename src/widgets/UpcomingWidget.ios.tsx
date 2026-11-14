import { Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, lineLimit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetModel } from '@/utils/widget-model';

const UpcomingWidget = (props: WidgetModel, environment: WidgetEnvironment) => {
  'widget';
  // Everything used by this function must live inside the isolated widget runtime.
  const dark = environment.colorScheme === 'dark';
  const primary = dark ? '#ACA6FF' : '#4445BB';
  const text = dark ? '#F1F4FF' : '#182C49';
  const muted = dark ? '#AAB7CE' : '#55647E';
  const small = environment.widgetFamily === 'systemSmall';
  const limit = small ? 1 : environment.widgetFamily === 'systemMedium' ? 2 : 3;
  const rows = props.rows ?? [];
  const overdue = props.overdueCount ?? 0;
  const rootUrl = small && rows[0] ? rows[0].url : 'lifereminder://items';
  return <VStack alignment="leading" spacing={8} modifiers={[
    frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
    containerBackground(dark ? '#1A212D' : '#FFFFFF', 'widget'), widgetURL(rootUrl),
  ]}>
    <Text modifiers={[font({ size: 17, weight: 'bold' }), foregroundStyle(primary)]}>Duewise</Text>
    {rows.slice(0, limit).map((row) => <Link key={row.id} destination={row.url}>
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(text), lineLimit(1)]}>{row.name}</Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}>{row.status} · {row.date}</Text>
      </VStack>
    </Link>)}
    {!rows.length ? <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>Nothing upcoming. Open Duewise to add a reminder.</Text> : null}
    <Spacer />
    <Link destination={overdue ? 'lifereminder://items?status=overdue' : 'lifereminder://items'}
      label={overdue ? `${overdue} overdue · View all` : 'View all reminders'}
      modifiers={[font({ size: 12 }), foregroundStyle(primary), lineLimit(1)]} />
  </VStack>;
};

export default createWidget<WidgetModel>('DuewiseUpcoming', UpcomingWidget);
