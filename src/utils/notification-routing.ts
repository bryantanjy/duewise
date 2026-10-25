import { COMPLETE_ACTION, SNOOZE_ACTION, reminderActionData } from './notification-actions';

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
    release(id: string) { handled.delete(id); },
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
  performAction?: (input: NotificationResponseInput) => Promise<void>,
  actionError?: (error: unknown) => void,
) {
  const deduper = createResponseDeduper();
  const pendingRoutes: `/item/${number}`[] = [];
  const pendingActions: NotificationResponseInput[] = [];
  let ready = false;
  let processingActions = false;
  const drainActions = async () => {
    if (!ready || processingActions) return;
    processingActions = true;
    try {
      while (pendingActions.length > 0) {
        const input = pendingActions.shift()!;
        try { await performAction?.(input); } catch (error) {
          deduper.release(`${input.requestIdentifier}:${input.actionIdentifier}`);
          actionError?.(error);
        }
      }
    } finally { processingActions = false; }
  };

  const drain = () => {
    if (!ready) return;
    while (pendingRoutes.length > 0) navigate(pendingRoutes.shift()!);
    void drainActions();
  };

  return {
    handleResponse({
      actionIdentifier,
      data,
      defaultActionIdentifier,
      requestIdentifier,
    }: NotificationResponseInput) {
      if (actionIdentifier === COMPLETE_ACTION || actionIdentifier === SNOOZE_ACTION) {
        if (!performAction || !requestIdentifier || !reminderActionData(data) || !deduper.accept(`${requestIdentifier}:${actionIdentifier}`)) return;
        pendingActions.push({ actionIdentifier, data, defaultActionIdentifier, requestIdentifier });
        drain();
        return;
      }
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
