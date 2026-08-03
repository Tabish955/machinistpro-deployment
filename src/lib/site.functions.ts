// Public site settings (maintenance mode + announcement banner).
import { createServerFn } from "@tanstack/react-start";

export interface SiteSettings {
  maintenance: { enabled: boolean; message: string };
  announcement: { enabled: boolean; message: string };
}

export const DEFAULT_SETTINGS: SiteSettings = {
  maintenance: { enabled: false, message: "" },
  announcement: { enabled: false, message: "" },
};

export const getSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteSettings> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin.from("app_settings").select("key,value");
      const out: SiteSettings = {
        maintenance: { ...DEFAULT_SETTINGS.maintenance },
        announcement: { ...DEFAULT_SETTINGS.announcement },
      };
      for (const row of data ?? []) {
        const v = (row.value ?? {}) as { enabled?: boolean; message?: string };
        if (row.key === "maintenance" || row.key === "announcement") {
          out[row.key] = { enabled: !!v.enabled, message: String(v.message ?? "") };
        }
      }
      return out;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
);
