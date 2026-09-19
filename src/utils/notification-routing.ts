type NotificationData = { itemId?: unknown; type?: unknown };

export function notificationItemRoute(data: unknown): `/item/${number}` | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const { itemId, type } = data as NotificationData;
  if (type !== 'item-reminder') return undefined;
  if (typeof itemId !== 'number' && typeof itemId !== 'string') return undefined;
  if (typeof itemId === 'string' && !/^\d+$/.test(itemId)) return undefined;
  const parsedId = Number(itemId);
  if (!Number.isSafeInteger(parsedId) || parsedId <= 0) return undefined;
  return `/item/${parsedId}`;
}

export function createResponseDeduper() {
  const handled = new Set<string>();
  return {
    accept(id: string) {
      if (!id || handled.has(id)) return false;
      handled.add(id);
      return true;
    },
  };
}

type NotificationResponseInput = {
  actionIdentifier: string;
  data: unknown;
  defaultActionIdentifier: string;
  requestIdentifier: string;
};

export function createNotificationResponseCoordinator(
  navigate: (route: `/item/${number}`) => void,
) {
  const deduper = createResponseDeduper();
  const pendingRoutes: `/item/${number}`[] = [];
  let ready = false;

  const drain = () => {
    if (!ready) return;
    while (pendingRoutes.length > 0) navigate(pendingRoutes.shift()!);
  };

  return {
    handleResponse({
      actionIdentifier,
      data,
      defaultActionIdentifier,
      requestIdentifier,
    }: NotificationResponseInput) {
      if (actionIdentifier !== defaultActionIdentifier) return;
      const route = notificationItemRoute(data);
      if (!route || !deduper.accept(requestIdentifier)) return;
      pendingRoutes.push(route);
      drain();
    },
    setReady(nextReady: boolean) {
      ready = nextReady;
      drain();
    },
  };
}
