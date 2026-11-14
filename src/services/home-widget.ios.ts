import { isRunningInExpoGo, requireOptionalNativeModule } from 'expo';
import { readWidgetItems } from './widget-data';
import { buildWidgetTimeline } from '@/utils/widget-model';

function supported() { return !isRunningInExpoGo() && Boolean(requireOptionalNativeModule('ExpoWidgets')); }

export async function refreshHomeWidget(): Promise<void> {
  if (!supported()) return;
  const { default: widget } = await import('@/widgets/UpcomingWidget.ios');
  widget.updateTimeline(buildWidgetTimeline(await readWidgetItems()));
}

export async function addHomeWidget(): Promise<string> {
  if (!supported()) return 'Install the new Duewise build to use the home-screen widget.';
  await refreshHomeWidget();
  return 'Touch and hold your home screen, tap Edit, then Add Widget. Search for Duewise and choose a size.';
}
