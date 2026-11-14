let tail = Promise.resolve();
let exclusive = false;
export function assertLocalWritesAllowed() {
  if (exclusive) throw new Error('Cloud sync is finishing. Try again in a moment.');
}
export async function withDataGate<T>(work: () => Promise<T>, cloud = false): Promise<T> {
  const previous = tail;
  let release!: () => void;
  tail = new Promise<void>(resolve => { release = resolve; });
  await previous;
  exclusive = cloud;
  try { return await work(); }
  finally { exclusive = false; release(); }
}
