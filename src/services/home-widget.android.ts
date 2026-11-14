import { isRunningInExpoGo } from 'expo';
import { TurboModuleRegistry } from 'react-native';
import { readWidgetItems } from './widget-data';
import { buildWidgetModel, HOME_WIDGET_NAME } from '@/utils/widget-model';

function supported() { return !isRunningInExpoGo() && Boolean(TurboModuleRegistry.get('AndroidWidget')); }

export async function refreshHomeWidget(): Promise<void> {
  if (!supported()) return;
  const { getWidgetInfo, requestWidgetUpdateById } = await import('react-native-android-widget');
  const widgets = await getWidgetInfo(HOME_WIDGET_NAME);
  if (!widgets.length) return;
  const model = buildWidgetModel(await readWidgetItems());
  const { widgetRepresentation } = await import('@/widgets/UpcomingWidget.android');
  for (const info of widgets) {
    await requestWidgetUpdateById({ widgetName: HOME_WIDGET_NAME, widgetId: info.widgetId,
      renderWidget: (currentInfo) => widgetRepresentation(model, currentInfo) });
  }
}

export async function addHomeWidget(): Promise<string> {
  if (!supported()) return 'Install the new Duewise build to use the home-screen widget.';
  const { requestPinWidget } = await import('react-native-android-widget');
  const requested = await requestPinWidget({ widgetName: HOME_WIDGET_NAME });
  return requested ? 'Confirm Add on your home screen. You can also find Duewise in your phone’s widget picker.'
    : 'Long-press an empty area on your home screen, choose Widgets, then select Duewise.';
}
