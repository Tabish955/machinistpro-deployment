/**
 * Local backup & restore manager.
 * Handles export/import of all app data from localStorage.
 */

const APP_KEYS = [
  "machinist-pro-calculator",
  "machinist-pro-converter",
  "machinist-pro-history",
  "machinist-pro-workspace",
  "mp_session",
  "mp_user",
] as const;

const BACKUP_VERSION = 2;

export interface BackupData {
  version: number;
  timestamp: number;
  appName: string;
  data: Record<string, string | null>;
}

/**
 * Export all app data as a BackupData object.
 */
export function createBackup(): BackupData {
  const data: Record<string, string | null> = {};
  for (const key of APP_KEYS) {
    data[key] = localStorage.getItem(key);
  }
  return {
    version: BACKUP_VERSION,
    timestamp: Date.now(),
    appName: "MachinistPro",
    data,
  };
}

/**
 * Download backup as a JSON file.
 */
export function downloadBackup(): void {
  const backup = createBackup();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `MachinistPro_Backup_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Validate a backup file.
 */
export function validateBackup(content: string): { valid: boolean; backup?: BackupData; error?: string } {
  try {
    const parsed = JSON.parse(content);

    if (!parsed || typeof parsed !== "object") {
      return { valid: false, error: "Invalid file format" };
    }

    if (parsed.appName !== "MachinistPro") {
      return { valid: false, error: "Not a MachinistPro backup file" };
    }

    if (!parsed.version || typeof parsed.version !== "number") {
      return { valid: false, error: "Missing backup version" };
    }

    if (!parsed.data || typeof parsed.data !== "object") {
      return { valid: false, error: "Missing data section" };
    }

    return { valid: true, backup: parsed as BackupData };
  } catch {
    return { valid: false, error: "Invalid JSON file" };
  }
}

/**
 * Restore from a backup (overwrites current data).
 */
export function restoreBackup(backup: BackupData): void {
  for (const [key, value] of Object.entries(backup.data)) {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  }
}

/**
 * Clear all app data from localStorage.
 */
export function clearAllData(): void {
  for (const key of APP_KEYS) {
    localStorage.removeItem(key);
  }
}

/**
 * Get approximate storage usage in bytes.
 */
export function getStorageSize(): number {
  let total = 0;
  for (const key of APP_KEYS) {
    const val = localStorage.getItem(key);
    if (val) total += key.length + val.length;
  }
  return total * 2; // UTF-16
}

/**
 * Format bytes for display.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
