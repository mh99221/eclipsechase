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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      eclipse_grid: {
        Row: {
          duration_seconds: number | null
          id: number
          lat: number
          lng: number
          sun_altitude: number | null
          sun_azimuth: number | null
          totality_end: string | null
          totality_start: string | null
        }
        Insert: {
          duration_seconds?: number | null
          id?: number
          lat: number
          lng: number
          sun_altitude?: number | null
          sun_azimuth?: number | null
          totality_end?: string | null
          totality_start?: string | null
        }
        Update: {
          duration_seconds?: number | null
          id?: number
          lat?: number
          lng?: number
          sun_altitude?: number | null
          sun_azimuth?: number | null
          totality_end?: string | null
          totality_start?: string | null
        }
        Relationships: []
      }
      email_signups: {
        Row: {
          created_at: string | null
          email: string
          id: number
          locale: string | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: number
          locale?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: number
          locale?: string | null
          source?: string | null
        }
        Relationships: []
      }
      pro_purchases: {
        Row: {
          activated: boolean | null
          activated_at: string | null
          activation_token: string
          email: string
          email_hash: string
          id: number
          is_active: boolean | null
          last_restored_at: string | null
          purchased_at: string | null
          restored_count: number | null
          stripe_session_id: string
          token_version: number
        }
        Insert: {
          activated?: boolean | null
          activated_at?: string | null
          activation_token: string
          email: string
          email_hash: string
          id?: number
          is_active?: boolean | null
          last_restored_at?: string | null
          purchased_at?: string | null
          restored_count?: number | null
          stripe_session_id: string
          token_version?: number
        }
        Update: {
          activated?: boolean | null
          activated_at?: string | null
          activation_token?: string
          email?: string
          email_hash?: string
          id?: number
          is_active?: boolean | null
          last_restored_at?: string | null
          purchased_at?: string | null
          restored_count?: number | null
          stripe_session_id?: string
          token_version?: number
        }
        Relationships: []
      }
      restore_codes: {
        Row: {
          attempts: number
          code: string
          created_at: string | null
          email_hash: string
          expires_at: string
          id: number
          used: boolean | null
        }
        Insert: {
          attempts?: number
          code: string
          created_at?: string | null
          email_hash: string
          expires_at: string
          id?: number
          used?: boolean | null
        }
        Update: {
          attempts?: number
          code?: string
          created_at?: string | null
          email_hash?: string
          expires_at?: string
          id?: number
          used?: boolean | null
        }
        Relationships: []
      }
      viewing_spot_translations: {
        Row: {
          description: string | null
          locale: string
          name: string | null
          parking_info: string | null
          spot_slug: string
          terrain_notes: string | null
          updated_at: string
          warnings: Json | null
        }
        Insert: {
          description?: string | null
          locale: string
          name?: string | null
          parking_info?: string | null
          spot_slug: string
          terrain_notes?: string | null
          updated_at?: string
          warnings?: Json | null
        }
        Update: {
          description?: string | null
          locale?: string
          name?: string | null
          parking_info?: string | null
          spot_slug?: string
          terrain_notes?: string | null
          updated_at?: string
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "viewing_spot_translations_spot_slug_fkey"
            columns: ["spot_slug"]
            isOneToOne: false
            referencedRelation: "viewing_spots"
            referencedColumns: ["slug"]
          },
        ]
      }
      viewing_spots: {
        Row: {
          cell_coverage: string | null
          description: string | null
          difficulty: string | null
          elevation_gain_m: number | null
          has_services: boolean | null
          horizon_check: Json | null
          id: string
          lat: number
          lng: number
          name: string
          nearby_poi: Json | null
          observer_height_above_ground: number | null
          parking_info: string | null
          photos: Json | null
          region: string
          slug: string
          spot_type: string | null
          sun_altitude: number | null
          sun_azimuth: number | null
          terrain_notes: string | null
          totality_duration_seconds: number | null
          totality_start: string | null
          trail_distance_km: number | null
          trail_time_minutes: number | null
          trailhead_lat: number | null
          trailhead_lng: number | null
          warnings: Json | null
        }
        Insert: {
          cell_coverage?: string | null
          description?: string | null
          difficulty?: string | null
          elevation_gain_m?: number | null
          has_services?: boolean | null
          horizon_check?: Json | null
          id: string
          lat: number
          lng: number
          name: string
          nearby_poi?: Json | null
          observer_height_above_ground?: number | null
          parking_info?: string | null
          photos?: Json | null
          region: string
          slug: string
          spot_type?: string | null
          sun_altitude?: number | null
          sun_azimuth?: number | null
          terrain_notes?: string | null
          totality_duration_seconds?: number | null
          totality_start?: string | null
          trail_distance_km?: number | null
          trail_time_minutes?: number | null
          trailhead_lat?: number | null
          trailhead_lng?: number | null
          warnings?: Json | null
        }
        Update: {
          cell_coverage?: string | null
          description?: string | null
          difficulty?: string | null
          elevation_gain_m?: number | null
          has_services?: boolean | null
          horizon_check?: Json | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          nearby_poi?: Json | null
          observer_height_above_ground?: number | null
          parking_info?: string | null
          photos?: Json | null
          region?: string
          slug?: string
          spot_type?: string | null
          sun_altitude?: number | null
          sun_azimuth?: number | null
          terrain_notes?: string | null
          totality_duration_seconds?: number | null
          totality_start?: string | null
          trail_distance_km?: number | null
          trail_time_minutes?: number | null
          trailhead_lat?: number | null
          trailhead_lng?: number | null
          warnings?: Json | null
        }
        Relationships: []
      }
      weather_forecasts: {
        Row: {
          cloud_cover: number | null
          fetched_at: string
          forecast_time: string
          id: number
          precipitation_prob: number | null
          source_model: string | null
          station_id: string | null
          valid_time: string
        }
        Insert: {
          cloud_cover?: number | null
          fetched_at?: string
          forecast_time: string
          id?: number
          precipitation_prob?: number | null
          source_model?: string | null
          station_id?: string | null
          valid_time: string
        }
        Update: {
          cloud_cover?: number | null
          fetched_at?: string
          forecast_time?: string
          id?: number
          precipitation_prob?: number | null
          source_model?: string | null
          station_id?: string | null
          valid_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "weather_forecasts_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "weather_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_stations: {
        Row: {
          id: string
          lat: number
          lng: number
          name: string
          region: string | null
          source: string | null
        }
        Insert: {
          id: string
          lat: number
          lng: number
          name: string
          region?: string | null
          source?: string | null
        }
        Update: {
          id?: string
          lat?: number
          lng?: number
          name?: string
          region?: string | null
          source?: string | null
        }
        Relationships: []
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
