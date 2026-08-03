export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      app_users: {
        Row: {
          allow_multi_device: boolean
          created_at: string
          email: string | null
          expiry_date: string | null
          hwid: string | null
          id: string
          is_active: boolean
          is_admin: boolean
          last_login_at: string | null
          password_hash: string
          subscription: string
          updated_at: string
          username: string
        }
        Insert: {
          allow_multi_device?: boolean
          created_at?: string
          email?: string | null
          expiry_date?: string | null
          hwid?: string | null
          id?: string
          is_active?: boolean
          is_admin?: boolean
          last_login_at?: string | null
          password_hash: string
          subscription?: string
          updated_at?: string
          username: string
        }
        Update: {
          allow_multi_device?: boolean
          created_at?: string
          email?: string | null
          expiry_date?: string | null
          hwid?: string | null
          id?: string
          is_active?: boolean
          is_admin?: boolean
          last_login_at?: string | null
          password_hash?: string
          subscription?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      device_fingerprints: {
        Row: {
          fingerprint_hash: string
          first_seen: string
          id: string
          ip_hash: string | null
          last_seen: string
          trial_expires_at: string | null
          trial_started_at: string | null
          trial_used: boolean
          trial_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          fingerprint_hash: string
          first_seen?: string
          id?: string
          ip_hash?: string | null
          last_seen?: string
          trial_expires_at?: string | null
          trial_started_at?: string | null
          trial_used?: boolean
          trial_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          fingerprint_hash?: string
          first_seen?: string
          id?: string
          ip_hash?: string | null
          last_seen?: string
          trial_expires_at?: string | null
          trial_started_at?: string | null
          trial_used?: boolean
          trial_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          expires_at: string
          expiry_date: string | null
          hwid: string | null
          is_admin: boolean
          is_trial: boolean
          remember_me: boolean
          subscription: string
          token_hash: string
          user_id: string | null
          username: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          expiry_date?: string | null
          hwid?: string | null
          is_admin?: boolean
          is_trial?: boolean
          remember_me?: boolean
          subscription?: string
          token_hash: string
          user_id?: string | null
          username: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          expiry_date?: string | null
          hwid?: string | null
          is_admin?: boolean
          is_trial?: boolean
          remember_me?: boolean
          subscription?: string
          token_hash?: string
          user_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_ip_log: {
        Row: {
          first_trial_at: string
          ip_hash: string
          last_trial_at: string
          trial_count: number
        }
        Insert: {
          first_trial_at?: string
          ip_hash: string
          last_trial_at?: string
          trial_count?: number
        }
        Update: {
          first_trial_at?: string
          ip_hash?: string
          last_trial_at?: string
          trial_count?: number
        }
        Relationships: []
      }
      user_trials: {
        Row: {
          device_fingerprint_id: string | null
          expires_at: string
          fingerprint_hash: string | null
          ip_hash: string | null
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          device_fingerprint_id?: string | null
          expires_at: string
          fingerprint_hash?: string | null
          ip_hash?: string | null
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          device_fingerprint_id?: string | null
          expires_at?: string
          fingerprint_hash?: string | null
          ip_hash?: string | null
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_trials_device_fingerprint_id_fkey"
            columns: ["device_fingerprint_id"]
            isOneToOne: false
            referencedRelation: "device_fingerprints"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
