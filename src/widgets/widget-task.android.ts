import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { readWidgetItems } from '@/services/widget-data';
import { buildWidgetModel, HOME_WIDGET_NAME } from '@/utils/widget-model';
import { widgetRepresentation } from './UpcomingWidget.android';

export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetInfo.widgetName !== HOME_WIDGET_NAME || widgetAction === 'WIDGET_DELETED') return;
  try {
    renderWidget(widgetRepresentation(buildWidgetModel(await readWidgetItems()), widgetInfo));
  } catch {
    renderWidget(widgetRepresentation(buildWidgetModel([]), widgetInfo, true));
  }
}
