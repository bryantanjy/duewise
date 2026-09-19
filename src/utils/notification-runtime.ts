type NotificationRuntimeOptions<Runtime> = {
  load: () => Promise<Runtime>;
  onLoaded: (runtime: Runtime) => Promise<void> | void;
  platform: string;
  runningInExpoGo: boolean;
};

export function notificationRuntimeSupported(platform: string, runningInExpoGo: boolean) {
  return (platform === 'android' && !runningInExpoGo) || platform === 'ios';
}

export async function runWithNotificationRuntime<Runtime>({
  load,
  onLoaded,
  platform,
  runningInExpoGo,
}: NotificationRuntimeOptions<Runtime>) {
  if (!notificationRuntimeSupported(platform, runningInExpoGo)) return;

  try {
    const runtime = await load();
    await onLoaded(runtime);
  } catch {}
}
