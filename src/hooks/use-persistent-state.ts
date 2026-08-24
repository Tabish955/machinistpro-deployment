import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { readState, writeState } from "@/lib/core/session-store";

/**
 * `useState` that survives leaving the screen.
 *
 * Behaves exactly like `useState` and can be swapped in for it. The difference
 * is that the value is written down as it changes and read back when the
 * component mounts again — so switching tabs, or leaving the page and coming
 * back, no longer empties every box.
 *
 * The stored value is read in an effect rather than in the initialiser on
 * purpose. The pages are server-rendered, and the server has no storage to
 * read: seeding the first render from storage would make the client's markup
 * disagree with the server's, which React resolves by throwing one of them
 * away. Reading after mount means the first paint matches the server and the
 * remembered value arrives a frame later.
 *
 * Writing is done in the setter and *never* in an effect. That distinction is
 * the whole correctness of this hook. An effect that saves whenever the value
 * changes will also fire on mount, while the value is still the default and
 * before the read has had a chance to apply what was stored — so re-opening a
 * tab saves a blank over the numbers it was about to restore. Writing only
 * when something actually calls the setter means a mount can never destroy
 * what a mount is there to recover.
 */
export function usePersistentState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);

  // The current value, readable synchronously. A functional update needs the
  // value it is updating from at the moment it is called, not the one captured
  // when the setter was last created.
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    const stored = readState<T | undefined>(key, undefined);
    // `undefined` means nothing was ever stored, which is not the same as a box
    // the user deliberately emptied — an empty string is stored and restored.
    if (stored === undefined) return;
    latest.current = stored;
    setValue(stored);
  }, [key]);

  const set = useCallback<Dispatch<SetStateAction<T>>>(
    (update) => {
      const next =
        typeof update === "function" ? (update as (previous: T) => T)(latest.current) : update;
      latest.current = next;
      writeState(key, next);
      setValue(next);
    },
    [key],
  );

  return [value, set];
}
