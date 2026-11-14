// React Native's AbortSignal polyfill does not implement AbortSignal.timeout.
export async function cloudFetch(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 30000, request: typeof fetch = fetch) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init?.signal?.aborted) abort();
  else init?.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try { return await request(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); init?.signal?.removeEventListener('abort', abort); }
}
