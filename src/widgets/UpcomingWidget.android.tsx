'use no memo';

import { FlexWidget, TextWidget, type WidgetInfo } from 'react-native-android-widget';
import { HOME_WIDGET_NAME, type WidgetModel } from '@/utils/widget-model';

export { HOME_WIDGET_NAME };

export function UpcomingWidget({ model, info, dark = false, error = false }: {
  model: WidgetModel; info: WidgetInfo; dark?: boolean; error?: boolean;
}) {
  const background = dark ? '#1A212D' : '#FFFFFF';
  const text = dark ? '#F1F4FF' : '#182C49';
  const muted = dark ? '#AAB7CE' : '#55647E';
  const primary = dark ? '#ACA6FF' : '#4445BB';
  const scale = Math.max(1, info.screenInfo.fontScale);
  const rowLimit = Math.max(0, Math.min(3, Math.floor((info.height - 32 - 96 * scale) / (52 * scale))));
  const rows = model.rows.slice(0, rowLimit);
  return <FlexWidget style={{ width: 'match_parent', height: 'match_parent', padding: 16, borderRadius: 20, backgroundColor: background }}>
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'lifereminder://items' }}
      accessibilityLabel="Duewise, open all reminders" style={{ width: 'match_parent', height: 48 * scale }}>
      <TextWidget text="Duewise" style={{ fontSize: 18, fontWeight: 'bold', color: primary }} />
      <TextWidget text={`${model.upcomingCount} upcoming`} style={{ fontSize: 12, color: muted }} />
    </FlexWidget>
    {error ? <TextWidget text="Open Duewise to refresh reminders." style={{ fontSize: 13, color: muted }} />
      : !model.rows.length ? <TextWidget text="Nothing upcoming. Add a reminder in Duewise." style={{ fontSize: 13, color: muted }} />
      : !rows.length ? <TextWidget text={`${model.rows[0].name} — ${model.rows[0].status}`}
        clickAction="OPEN_URI" clickActionData={{ uri: model.rows[0].url }} maxLines={2} truncate="END" style={{ fontSize: 13, color: text }} />
      : rows.map((row) => <FlexWidget key={row.id} clickAction="OPEN_URI" clickActionData={{ uri: row.url }}
        accessibilityLabel={`${row.name}, ${row.date}, ${row.status}`} style={{ width: 'match_parent', height: 52 * scale, paddingVertical: 6 }}>
        <TextWidget text={row.name} maxLines={1} truncate="END" style={{ fontSize: 14, fontWeight: 'bold', color: text }} />
        <TextWidget text={`${row.date} · ${row.status}`} maxLines={1} truncate="END" style={{ fontSize: 12, color: muted }} />
      </FlexWidget>)}
    <FlexWidget style={{ flex: 1 }} />
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: model.overdueCount ? 'lifereminder://items?status=overdue' : 'lifereminder://items' }}
      accessibilityLabel={model.overdueCount ? `${model.overdueCount} overdue reminders` : 'View all reminders'} style={{ width: 'match_parent', height: 48 * scale, justifyContent: 'center' }}>
      <TextWidget text={model.overdueCount ? `${model.overdueCount} overdue · View reminders` : `View all · ${model.updatedLabel}`}
        maxLines={1} truncate="END" style={{ fontSize: 12, color: primary }} />
    </FlexWidget>
  </FlexWidget>;
}

export function widgetRepresentation(model: WidgetModel, info: WidgetInfo, error = false) {
  return { light: <UpcomingWidget model={model} info={info} error={error} />,
    dark: <UpcomingWidget model={model} info={info} dark error={error} /> };
}
