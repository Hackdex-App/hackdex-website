export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      hack_patcher_patches: {
        Row: {
          created_at: string
          hack_slug: string
          patch_id: number
          sort_order: number
        }
        Insert: {
          created_at?: string
          hack_slug: string
          patch_id: number
          sort_order: number
        }
        Update: {
          created_at?: string
          hack_slug?: string
          patch_id?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "hack_patcher_patches_hack_slug_fkey"
            columns: ["hack_slug"]
            isOneToOne: false
            referencedRelation: "hacks"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "hack_patcher_patches_patch_id_fkey"
            columns: ["patch_id"]
            isOneToOne: false
            referencedRelation: "patches"
            referencedColumns: ["id"]
          },
        ]
      }
      hack_review_threads: {
        Row: {
          created_at: string
          discord_parent_channel_id: string
          discord_thread_id: string
          hack_slug: string
          reply_token: string
          resend_last_email_id: string | null
          resend_last_message_id: string | null
        }
        Insert: {
          created_at?: string
          discord_parent_channel_id: string
          discord_thread_id: string
          hack_slug: string
          reply_token: string
          resend_last_email_id?: string | null
          resend_last_message_id?: string | null
        }
        Update: {
          created_at?: string
          discord_parent_channel_id?: string
          discord_thread_id?: string
          hack_slug?: string
          reply_token?: string
          resend_last_email_id?: string | null
          resend_last_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hack_review_threads_hack_slug_fkey"
            columns: ["hack_slug"]
            isOneToOne: true
            referencedRelation: "hacks"
            referencedColumns: ["slug"]
          },
        ]
      }
      hack_tags: {
        Row: {
          hack_slug: string
          order: number
          tag_id: number
        }
        Insert: {
          hack_slug: string
          order?: number
          tag_id: number
        }
        Update: {
          hack_slug?: string
          order?: number
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
      hack_team: {
        Row: {
          created_at: string
          hack_slug: string
          name: string | null
          userid: string | null
        }
        Insert: {
          created_at?: string
          hack_slug: string
          name?: string | null
          userid?: string | null
        }
        Update: {
          created_at?: string
          hack_slug?: string
          name?: string | null
          userid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hack_team_hack_slug_fkey"
            columns: ["hack_slug"]
            isOneToOne: true
            referencedRelation: "hacks"
            referencedColumns: ["slug"]
          },
        ]
      }
      hacks: {
        Row: {
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          assigned_admin: string | null
          base_rom: string
          box_art: string | null
          completion_status:
            | Database["public"]["Enums"]["Completion Status"]
            | null
          created_at: string
          created_by: string
          current_patch: number | null
          custom_version_name: string | null
          description: string
          downloads: number
          estimated_release: string | null
          is_archive: boolean
          language: string
          original_author: string | null
          patch_url: string
          patches_download_permission: Database["public"]["Enums"]["Patches Download Permission"]
          permission_from: string | null
          published: boolean
          rejected: boolean
          rejected_at: string | null
          rejected_by: string | null
          rejected_reason: string | null
          search: unknown
          slug: string
          social_links: Json | null
          summary: string
          tags_updated_at: string
          title: string
          updated_at: string | null
          verification_contact_info: string | null
          version: string
        }
        Insert: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          assigned_admin?: string | null
          base_rom: string
          box_art?: string | null
          completion_status?:
            | Database["public"]["Enums"]["Completion Status"]
            | null
          created_at?: string
          created_by: string
          current_patch?: number | null
          custom_version_name?: string | null
          description: string
          downloads?: number
          estimated_release?: string | null
          is_archive?: boolean
          language: string
          original_author?: string | null
          patch_url: string
          patches_download_permission?: Database["public"]["Enums"]["Patches Download Permission"]
          permission_from?: string | null
          published?: boolean
          rejected?: boolean
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          search?: unknown
          slug: string
          social_links?: Json | null
          summary: string
          tags_updated_at?: string
          title: string
          updated_at?: string | null
          verification_contact_info?: string | null
          version: string
        }
        Update: {
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          assigned_admin?: string | null
          base_rom?: string
          box_art?: string | null
          completion_status?:
            | Database["public"]["Enums"]["Completion Status"]
            | null
          created_at?: string
          created_by?: string
          current_patch?: number | null
          custom_version_name?: string | null
          description?: string
          downloads?: number
          estimated_release?: string | null
          is_archive?: boolean
          language?: string
          original_author?: string | null
          patch_url?: string
          patches_download_permission?: Database["public"]["Enums"]["Patches Download Permission"]
          permission_from?: string | null
          published?: boolean
          rejected?: boolean
          rejected_at?: string | null
          rejected_by?: string | null
          rejected_reason?: string | null
          search?: unknown
          slug?: string
          social_links?: Json | null
          summary?: string
          tags_updated_at?: string
          title?: string
          updated_at?: string | null
          verification_contact_info?: string | null
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
      patch_download_events: {
        Row: {
          content_encoding: string | null
          content_length: number | null
          content_type: string | null
          correlation_id: string | null
          country: string | null
          created_at: string
          decoded_body_size: number | null
          duration_ms: number | null
          encoded_body_size: number | null
          error_message: string | null
          error_name: string | null
          failure_phase: string | null
          hack_slug: string | null
          id: number
          next_hop_protocol: string | null
          online: boolean | null
          outcome: string
          page_origin: string | null
          patch: number | null
          probe_patch_host: string | null
          probe_same_origin: string | null
          received_bytes: number | null
          response_status: number | null
          resume_count: number | null
          sample_rate: number | null
          stage: string
          timing_entry_present: boolean | null
          transfer_size: number | null
          user_agent: string | null
        }
        Insert: {
          content_encoding?: string | null
          content_length?: number | null
          content_type?: string | null
          correlation_id?: string | null
          country?: string | null
          created_at?: string
          decoded_body_size?: number | null
          duration_ms?: number | null
          encoded_body_size?: number | null
          error_message?: string | null
          error_name?: string | null
          failure_phase?: string | null
          hack_slug?: string | null
          id?: number
          next_hop_protocol?: string | null
          online?: boolean | null
          outcome: string
          page_origin?: string | null
          patch?: number | null
          probe_patch_host?: string | null
          probe_same_origin?: string | null
          received_bytes?: number | null
          response_status?: number | null
          resume_count?: number | null
          sample_rate?: number | null
          stage: string
          timing_entry_present?: boolean | null
          transfer_size?: number | null
          user_agent?: string | null
        }
        Update: {
          content_encoding?: string | null
          content_length?: number | null
          content_type?: string | null
          correlation_id?: string | null
          country?: string | null
          created_at?: string
          decoded_body_size?: number | null
          duration_ms?: number | null
          encoded_body_size?: number | null
          error_message?: string | null
          error_name?: string | null
          failure_phase?: string | null
          hack_slug?: string | null
          id?: number
          next_hop_protocol?: string | null
          online?: boolean | null
          outcome?: string
          page_origin?: string | null
          patch?: number | null
          probe_patch_host?: string | null
          probe_same_origin?: string | null
          received_bytes?: number | null
          response_status?: number | null
          resume_count?: number | null
          sample_rate?: number | null
          stage?: string
          timing_entry_present?: boolean | null
          transfer_size?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patch_download_events_patch_fkey"
            columns: ["patch"]
            isOneToOne: false
            referencedRelation: "patches"
            referencedColumns: ["id"]
          },
        ]
      }
      patch_downloads: {
        Row: {
          created_at: string
          device_id: string
          id: number
          patch: number | null
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: number
          patch?: number | null
        }
        Update: {
          created_at?: string
          device_id?: string
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
      patch_groups: {
        Row: {
          created_at: string
          hack_slug: string
          id: number
          name: string
          order: number
          patch_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          hack_slug: string
          id?: number
          name: string
          order: number
          patch_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          hack_slug?: string
          id?: number
          name?: string
          order?: number
          patch_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patch_groups_hack_slug_fkey"
            columns: ["hack_slug"]
            isOneToOne: false
            referencedRelation: "hacks"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "patch_groups_patch_id_fkey"
            columns: ["patch_id"]
            isOneToOne: false
            referencedRelation: "patches"
            referencedColumns: ["id"]
          },
        ]
      }
      patches: {
        Row: {
          archived: boolean
          archived_at: string | null
          breaks_saves: boolean
          bucket: string
          changelog: string | null
          created_at: string
          filename: string
          format: Database["public"]["Enums"]["Patch Format"]
          id: number
          parent_hack: string | null
          published: boolean
          published_at: string | null
          updated_at: string
          version: string
        }
        Insert: {
          archived?: boolean
          archived_at?: string | null
          breaks_saves?: boolean
          bucket: string
          changelog?: string | null
          created_at?: string
          filename: string
          format?: Database["public"]["Enums"]["Patch Format"]
          id?: number
          parent_hack?: string | null
          published?: boolean
          published_at?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          archived?: boolean
          archived_at?: string | null
          breaks_saves?: boolean
          bucket?: string
          changelog?: string | null
          created_at?: string
          filename?: string
          format?: Database["public"]["Enums"]["Patch Format"]
          id?: number
          parent_hack?: string | null
          published?: boolean
          published_at?: string | null
          updated_at?: string
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
          verified: boolean
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
          verified?: boolean
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          category: Database["public"]["Enums"]["Tag Categories"] | null
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["Tag Categories"] | null
          created_at?: string | null
          id?: number
          name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["Tag Categories"] | null
          created_at?: string | null
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
      delete_claim: { Args: { claim: string; uid: string }; Returns: string }
      get_claim: { Args: { claim: string; uid: string }; Returns: Json }
      get_claims: { Args: { uid: string }; Returns: Json }
      get_my_claim: { Args: { claim: string }; Returns: Json }
      get_my_claims: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_archive_hack_for_archiver: {
        Args: { hack_slug: string }
        Returns: boolean
      }
      is_archiver: { Args: never; Returns: boolean }
      is_claims_admin: { Args: never; Returns: boolean }
      replace_hack_patcher_patches: {
        Args: {
          p_custom_version_name?: string
          p_hack_slug: string
          p_patch_ids: number[]
        }
        Returns: undefined
      }
      set_claim: {
        Args: { claim: string; uid: string; value: Json }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      "Completion Status": "Complete" | "Demo" | "Alpha" | "Beta"
      "Patch Format": "bps" | "xdelta"
      "Patches Download Permission": "None" | "Current" | "All"
      "Tag Categories":
        | "Pokédex"
        | "Graphics"
        | "New"
        | "Altered"
        | "Quality of Life"
        | "Gameplay"
        | "Difficulty"
        | "Scale"
        | "Tone"
        | "Category"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      "Completion Status": ["Complete", "Demo", "Alpha", "Beta"],
      "Patch Format": ["bps", "xdelta"],
      "Patches Download Permission": ["None", "Current", "All"],
      "Tag Categories": [
        "Pokédex",
        "Graphics",
        "New",
        "Altered",
        "Quality of Life",
        "Gameplay",
        "Difficulty",
        "Scale",
        "Tone",
        "Category",
      ],
    },
  },
} as const

