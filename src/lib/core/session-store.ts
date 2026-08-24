/**
 * Remembering what was typed.
 *
 * A machinist works out an RPM, switches to the feed tab to work out the feed
 * that goes with it, and comes back — and every box is empty again, because
 * only the open tab is mounted and the rest are thrown away. The same happens
 * on a bigger scale leaving the page: go to the calculator to check a sum, come
 * back, and the whole job has to be typed in twice.
 *
 * That is not a small annoyance in a workshop. The numbers came off a drawing
 * or a micrometer, retyping them is where a digit gets dropped, and a dropped
 * digit here is a scrapped part. So what was typed is written down and read
 * back.
 *
 * Everything here tolerates failure rather than throwing. Storage can be full,
 * disabled, or absent entirely during server rendering; none of those are a
 * reason for a calculator to stop working, so the value simply falls back to
 * its default.
 */

/** Namespace for remembered inputs, kept apart from mp_session and the rest. */
export const STATE_PREFIX = "mp_state:";

function store(storage?: Storage): Storage | undefined {
  if (storage) return storage;
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

/**
 * Read a remembered value.
 *
 * Returns `fallback` when there is nothing stored, when storage is unavailable,
 * or when what is stored will not parse — a corrupted entry is treated as no
 * entry rather than as a reason to fail.
 */
export function readState<T>(key: string, fallback: T, storage?: Storage): T {
  const s = store(storage);
  if (!s) return fallback;
  try {
    const raw = s.getItem(STATE_PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Write a value down. Returns false when storage refused it. */
export function writeState(key: string, value: unknown, storage?: Storage): boolean {
  const s = store(storage);
  if (!s) return false;
  try {
    s.setItem(STATE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    // Quota exceeded, or storage disabled after the page loaded. Losing a
    // remembered input is not worth breaking the screen over.
    return false;
  }
}

/** Forget one value. */
export function clearState(key: string, storage?: Storage): void {
  const s = store(storage);
  if (!s) return;
  try {
    s.removeItem(STATE_PREFIX + key);
  } catch {
    // Nothing to do — it stays remembered, which is harmless.
  }
}

/**
 * Forget everything under a prefix, so one screen can be reset without
 * touching another. `clearStateGroup("machining.")` empties the machining
 * page and leaves the rest alone. Returns how many entries went.
 */
export function clearStateGroup(prefix: string, storage?: Storage): number {
  const s = store(storage);
  if (!s) return 0;
  const full = STATE_PREFIX + prefix;
  const doomed: string[] = [];
  try {
    for (let i = 0; i < s.length; i += 1) {
      const key = s.key(i);
      if (key && key.startsWith(full)) doomed.push(key);
    }
    for (const key of doomed) s.removeItem(key);
  } catch {
    return 0;
  }
  return doomed.length;
}
