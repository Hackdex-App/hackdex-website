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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      hack_covers: {
        Row: {
          alt: string | null
          hack_slug: string
          id: number
          position: number
          url: string
        }
        Insert: {
          alt?: string | null
          hack_slug: string
          id?: number
          position?: number
          url: string
        }
        Update: {
          alt?: string | null
          hack_slug?: string
          id?: number
          position?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "hack_covers_hack_slug_fkey"
            columns: ["hack_slug"]
            isOneToOne: false
            referencedRelation: "hacks"
            referencedColumns: ["slug"]
          },
        ]
      }
      hack_tags: {
        Row: {
          hack_slug: string
          tag_id: number
        }
        Insert: {
          hack_slug: string
          tag_id: number
        }
        Update: {
          hack_slug?: string
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "hack_tags_hack_slug_fkey"
            columns: ["hack_slug"]
            isOneToOne: false
            referencedRelation: "hacks"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "hack_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      hacks: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          base_rom: string
          box_art: string | null
          created_at: string
          created_by: string
          current_patch: number | null
          description: string
          downloads: number
          estimated_release: string | null
          language: string
          patch_url: string
          search: unknown | null
          slug: string
          social_links: Json | null
          summary: string
          title: string
          updated_at: string | null
          version: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          base_rom: string
          box_art?: string | null
          created_at?: string
          created_by: string
          current_patch?: number | null
          description: string
          downloads?: number
          estimated_release?: string | null
          language: string
          patch_url: string
          search?: unknown | null
          slug: string
          social_links?: Json | null
          summary: string
          title: string
          updated_at?: string | null
          version: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          base_rom?: string
          box_art?: string | null
          created_at?: string
          created_by?: string
          current_patch?: number | null
          description?: string
          downloads?: number
          estimated_release?: string | null
          language?: string
          patch_url?: string
          search?: unknown | null
          slug?: string
          social_links?: Json | null
          summary?: string
          title?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "hacks_current_patch_fkey"
            columns: ["current_patch"]
            isOneToOne: false
            referencedRelation: "patches"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          used_by?: string | null
        }
        Relationships: []
      }
      patch_downloads: {
        Row: {
          created_at: string
          id: number
          patch: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          patch?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          patch?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patch_downloads_patch_fkey"
            columns: ["patch"]
            isOneToOne: false
            referencedRelation: "patches"
            referencedColumns: ["id"]
          },
        ]
      }
      patches: {
        Row: {
          bucket: string
          created_at: string
          filename: string
          id: number
          parent_hack: string | null
          version: string
        }
        Insert: {
          bucket: string
          created_at?: string
          filename: string
          id?: number
          parent_hack?: string | null
          version: string
        }
        Update: {
          bucket?: string
          created_at?: string
          filename?: string
          id?: number
          parent_hack?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "patches_parent_hack_fkey"
            columns: ["parent_hack"]
            isOneToOne: false
            referencedRelation: "hacks"
            referencedColumns: ["slug"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          category: Database["public"]["Enums"]["Tag Categories"] | null
          id: number
          name: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["Tag Categories"] | null
          id?: number
          name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["Tag Categories"] | null
          id?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_claim: {
        Args: { claim: string; uid: string }
        Returns: string
      }
      get_claim: {
        Args: { claim: string; uid: string }
        Returns: Json
      }
      get_claims: {
        Args: { uid: string }
        Returns: Json
      }
      get_my_claim: {
        Args: { claim: string }
        Returns: Json
      }
      get_my_claims: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_claims_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      set_claim: {
        Args: { claim: string; uid: string; value: Json }
        Returns: string
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
    }
    Enums: {
      "Tag Categories":
        | "Pokédex"
        | "Sprites"
        | "New"
        | "Altered"
        | "Quality of Life"
        | "Gameplay"
        | "Difficulty"
        | "Scale"
        | "Tone"
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
    Enums: {
      "Tag Categories": [
        "Pokédex",
        "Sprites",
        "New",
        "Altered",
        "Quality of Life",
        "Gameplay",
        "Difficulty",
        "Scale",
        "Tone",
      ],
    },
  },
} as const
