import { useState, useEffect } from "react";
import {
  getAccurateWorldDate,
  syncWorldTime,
  getWorldTimeState,
  type WorldTimeState,
} from "@/lib/core/world-time";

export function useWorldTime(options?: { showSeconds?: boolean }) {
  const [currentDate, setCurrentDate] = useState<Date>(() => getAccurateWorldDate());
  const [syncInfo, setSyncInfo] = useState<WorldTimeState>(() => getWorldTimeState());

  useEffect(() => {
    // Initial sync
    void syncWorldTime().then((state) => {
      setSyncInfo(state);
      setCurrentDate(getAccurateWorldDate());
    });

    // Update clock every second
    const intervalId = setInterval(() => {
      setCurrentDate(getAccurateWorldDate());
    }, 1000);

    // Periodic re-sync every 15 minutes
    const resyncId = setInterval(
      () => {
        void syncWorldTime().then((state) => setSyncInfo(state));
      },
      15 * 60 * 1000,
    );

    return () => {
      clearInterval(intervalId);
      clearInterval(resyncId);
    };
  }, []);

  const formattedTime = currentDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: options?.showSeconds ? "2-digit" : undefined,
  });

  const formattedDate = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const hours = currentDate.getHours();
  let greetingText = "Good morning";
  if (hours >= 12 && hours < 17) greetingText = "Good afternoon";
  else if (hours >= 17 && hours < 21) greetingText = "Good evening";
  else if (hours >= 21 || hours < 5) greetingText = "Good night";

  return {
    date: currentDate,
    formattedTime,
    formattedDate,
    greetingText,
    hours,
    isSynced: syncInfo.synced,
    syncSource: syncInfo.source,
    timezone: syncInfo.timezone,
  };
}
