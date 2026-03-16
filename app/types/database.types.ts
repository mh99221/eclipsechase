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
      pro_users: {
        Row: {
          email: string
          id: number
          is_active: boolean | null
          purchased_at: string | null
          stripe_session_id: string | null
        }
        Insert: {
          email: string
          id?: number
          is_active?: boolean | null
          purchased_at?: string | null
          stripe_session_id?: string | null
        }
        Update: {
          email?: string
          id?: number
          is_active?: boolean | null
          purchased_at?: string | null
          stripe_session_id?: string | null
        }
        Relationships: []
      }
      viewing_spots: {
        Row: {
          cell_coverage: string | null
          description: string | null
          difficulty: string | null
          elevation_gain_m: number | null
          has_services: boolean | null
          id: string
          lat: number
          lng: number
          name: string
          parking_info: string | null
          photo_url: string | null
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
        }
        Insert: {
          cell_coverage?: string | null
          description?: string | null
          difficulty?: string | null
          elevation_gain_m?: number | null
          has_services?: boolean | null
          id: string
          lat: number
          lng: number
          name: string
          parking_info?: string | null
          photo_url?: string | null
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
        }
        Update: {
          cell_coverage?: string | null
          description?: string | null
          difficulty?: string | null
          elevation_gain_m?: number | null
          has_services?: boolean | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          parking_info?: string | null
          photo_url?: string | null
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
        }
        Relationships: []
      }
      weather_forecasts: {
        Row: {
          cloud_cover: number | null
          forecast_time: string
          id: number
          precipitation_prob: number | null
          source_model: string | null
          station_id: string | null
          valid_time: string
        }
        Insert: {
          cloud_cover?: number | null
          forecast_time: string
          id?: number
          precipitation_prob?: number | null
          source_model?: string | null
          station_id?: string | null
          valid_time: string
        }
        Update: {
          cloud_cover?: number | null
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
      weather_observations: {
        Row: {
          cloud_cover: number | null
          id: number
          precipitation: number | null
          station_id: string | null
          temp: number | null
          timestamp: string
          visibility: number | null
          wind_dir: string | null
          wind_speed: number | null
        }
        Insert: {
          cloud_cover?: number | null
          id?: number
          precipitation?: number | null
          station_id?: string | null
          temp?: number | null
          timestamp: string
          visibility?: number | null
          wind_dir?: string | null
          wind_speed?: number | null
        }
        Update: {
          cloud_cover?: number | null
          id?: number
          precipitation?: number | null
          station_id?: string | null
          temp?: number | null
          timestamp?: string
          visibility?: number | null
          wind_dir?: string | null
          wind_speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_observations_station_id_fkey"
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
A new version of Supabase CLI is available: v2.78.1 (currently installed v2.76.12)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
