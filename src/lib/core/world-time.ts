/**
 * Real-World Time Synchronization Engine
 * Fetches verified UTC time from global time services and server headers
 * to guarantee accurate clock display even when the client device clock is wrong.
 */

export interface WorldTimeState {
  synced: boolean;
  timeOffsetMs: number; // Difference between true UTC time and performance.now()
  timezone: string;
  source: string;
  lastSyncTime: number;
}

const STORAGE_KEY = "machinistpro_world_time_offset";

// In-memory sync state
let syncState: WorldTimeState = {
  synced: false,
  timeOffsetMs: 0,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  source: "device_initial",
  lastSyncTime: 0,
};

// Try restoring cached offset from sessionStorage/localStorage
try {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    if (parsed && Number.isFinite(parsed.timeOffsetMs)) {
      syncState = {
        ...parsed,
        synced: true,
      };
    }
  }
} catch {
  // Ignore storage read error
}

/**
 * Fetch true real-world time from multiple redundant NTP/HTTP sources
 */
export async function syncWorldTime(): Promise<WorldTimeState> {
  const startPerf = performance.now();

  // 1. Try worldtimeapi.org
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch("https://worldtimeapi.org/api/ip", {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const trueEpochMs = data.unixtime ? data.unixtime * 1000 : new Date(data.utc_datetime || data.datetime).getTime();
      const endPerf = performance.now();
      const roundTrip = endPerf - startPerf;
      const accurateEpoch = trueEpochMs + roundTrip / 2;

      syncState = {
        synced: true,
        timeOffsetMs: accurateEpoch - endPerf,
        timezone: data.timezone || syncState.timezone,
        source: "worldtimeapi.org",
        lastSyncTime: Date.now(),
      };
      saveState(syncState);
      return syncState;
    }
  } catch {
    // Continue to next provider
  }

  // 2. Try timeapi.io
  try {
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://timeapi.io/api/time/current/zone?timeZone=${encodeURIComponent(localTz)}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const trueEpochMs = new Date(data.dateTime).getTime();
      const endPerf = performance.now();
      const roundTrip = endPerf - startPerf;
      const accurateEpoch = trueEpochMs + roundTrip / 2;

      syncState = {
        synced: true,
        timeOffsetMs: accurateEpoch - endPerf,
        timezone: data.timeZone || localTz,
        source: "timeapi.io",
        lastSyncTime: Date.now(),
      };
      saveState(syncState);
      return syncState;
    }
  } catch {
    // Continue to next provider
  }

  // 3. Fallback: Query server HTTP Date Header
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(window.location.href, {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    const serverDateStr = res.headers.get("date");
    if (serverDateStr) {
      const serverEpoch = new Date(serverDateStr).getTime();
      if (Number.isFinite(serverEpoch) && serverEpoch > 0) {
        const endPerf = performance.now();
        const roundTrip = endPerf - startPerf;
        const accurateEpoch = serverEpoch + roundTrip / 2;

        syncState = {
          synced: true,
          timeOffsetMs: accurateEpoch - endPerf,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          source: "server_http_header",
          lastSyncTime: Date.now(),
        };
        saveState(syncState);
        return syncState;
      }
    }
  } catch {
    // Fallback to client clock
  }

  // If already synced previously from cache, retain offset
  if (syncState.synced && syncState.timeOffsetMs !== 0) {
    return syncState;
  }

  // 4. Default fallback: client performance clock
  syncState = {
    synced: false,
    timeOffsetMs: Date.now() - performance.now(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    source: "device_fallback",
    lastSyncTime: Date.now(),
  };
  return syncState;
}

function saveState(st: WorldTimeState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
  } catch {
    // Ignore storage write error
  }
}

/**
 * Get current accurate synchronized Date object
 */
export function getAccurateWorldDate(): Date {
  if (!syncState.synced && syncState.timeOffsetMs === 0) {
    syncState.timeOffsetMs = Date.now() - performance.now();
  }
  const currentEpochMs = performance.now() + syncState.timeOffsetMs;
  return new Date(currentEpochMs);
}

/**
 * Get current world time state
 */
export function getWorldTimeState(): WorldTimeState {
  return syncState;
}
