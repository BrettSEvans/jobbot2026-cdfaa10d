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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      architecture_diagram_revisions: {
        Row: {
          application_id: string
          created_at: string
          html: string
          id: string
          label: string | null
          revision_number: number
        }
        Insert: {
          application_id: string
          created_at?: string
          html: string
          id?: string
          label?: string | null
          revision_number?: number
        }
        Update: {
          application_id?: string
          created_at?: string
          html?: string
          id?: string
          label?: string | null
          revision_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "architecture_diagram_revisions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_letter_revisions: {
        Row: {
          application_id: string
          cover_letter: string
          created_at: string
          id: string
          label: string | null
          revision_number: number
        }
        Insert: {
          application_id: string
          cover_letter: string
          created_at?: string
          id?: string
          label?: string | null
          revision_number?: number
        }
        Update: {
          application_id?: string
          cover_letter?: string
          created_at?: string
          id?: string
          label?: string | null
          revision_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "cover_letter_revisions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_revisions: {
        Row: {
          application_id: string
          created_at: string
          dashboard_html: string
          id: string
          label: string | null
          revision_number: number
        }
        Insert: {
          application_id: string
          created_at?: string
          dashboard_html: string
          id?: string
          label?: string | null
          revision_number?: number
        }
        Update: {
          application_id?: string
          created_at?: string
          dashboard_html?: string
          id?: string
          label?: string | null
          revision_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_revisions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_templates: {
        Row: {
          asset_type: string
          created_at: string
          dashboard_html: string
          department: string
          id: string
          job_function: string
          label: string
          source_application_id: string | null
        }
        Insert: {
          asset_type?: string
          created_at?: string
          dashboard_html: string
          department?: string
          id?: string
          job_function?: string
          label: string
          source_application_id?: string | null
        }
        Update: {
          asset_type?: string
          created_at?: string
          dashboard_html?: string
          department?: string
          id?: string
          job_function?: string
          label?: string
          source_application_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_templates_source_application_id_fkey"
            columns: ["source_application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_report_revisions: {
        Row: {
          application_id: string
          created_at: string
          html: string
          id: string
          label: string | null
          revision_number: number
        }
        Insert: {
          application_id: string
          created_at?: string
          html: string
          id?: string
          label?: string | null
          revision_number?: number
        }
        Update: {
          application_id?: string
          created_at?: string
          html?: string
          id?: string
          label?: string | null
          revision_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "executive_report_revisions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          architecture_diagram_html: string | null
          branding: Json | null
          chat_history: Json | null
          company_name: string | null
          company_url: string | null
          competitors: Json | null
          cover_letter: string | null
          created_at: string
          customers: Json | null
          dashboard_data: Json | null
          dashboard_html: string | null
          deleted_at: string | null
          deleted_by: string | null
          executive_report_html: string | null
          generation_error: string | null
          generation_status: string
          id: string
          job_description_markdown: string | null
          job_title: string | null
          job_url: string
          products: Json | null
          raid_log_html: string | null
          research_reasoning: string | null
          roadmap_html: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          architecture_diagram_html?: string | null
          branding?: Json | null
          chat_history?: Json | null
          company_name?: string | null
          company_url?: string | null
          competitors?: Json | null
          cover_letter?: string | null
          created_at?: string
          customers?: Json | null
          dashboard_data?: Json | null
          dashboard_html?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          executive_report_html?: string | null
          generation_error?: string | null
          generation_status?: string
          id?: string
          job_description_markdown?: string | null
          job_title?: string | null
          job_url: string
          products?: Json | null
          raid_log_html?: string | null
          research_reasoning?: string | null
          roadmap_html?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          architecture_diagram_html?: string | null
          branding?: Json | null
          chat_history?: Json | null
          company_name?: string | null
          company_url?: string | null
          competitors?: Json | null
          cover_letter?: string | null
          created_at?: string
          customers?: Json | null
          dashboard_data?: Json | null
          dashboard_html?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          executive_report_html?: string | null
          generation_error?: string | null
          generation_status?: string
          id?: string
          job_description_markdown?: string | null
          job_title?: string | null
          job_url?: string
          products?: Json | null
          raid_log_html?: string | null
          research_reasoning?: string | null
          roadmap_html?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          key_skills: string[] | null
          last_name: string | null
          preferred_tone: string | null
          resume_text: string | null
          target_industries: string[] | null
          updated_at: string
          years_experience: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          key_skills?: string[] | null
          last_name?: string | null
          preferred_tone?: string | null
          resume_text?: string | null
          target_industries?: string[] | null
          updated_at?: string
          years_experience?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          key_skills?: string[] | null
          last_name?: string | null
          preferred_tone?: string | null
          resume_text?: string | null
          target_industries?: string[] | null
          updated_at?: string
          years_experience?: string | null
        }
        Relationships: []
      }
      raid_log_revisions: {
        Row: {
          application_id: string
          created_at: string
          html: string
          id: string
          label: string | null
          revision_number: number
        }
        Insert: {
          application_id: string
          created_at?: string
          html: string
          id?: string
          label?: string | null
          revision_number?: number
        }
        Update: {
          application_id?: string
          created_at?: string
          html?: string
          id?: string
          label?: string | null
          revision_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "raid_log_revisions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_revisions: {
        Row: {
          application_id: string
          created_at: string
          html: string
          id: string
          label: string | null
          revision_number: number
        }
        Insert: {
          application_id: string
          created_at?: string
          html: string
          id?: string
          label?: string | null
          revision_number?: number
        }
        Update: {
          application_id?: string
          created_at?: string
          html?: string
          id?: string
          label?: string | null
          revision_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_revisions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_style_preferences: {
        Row: {
          category: string
          confidence: number
          created_at: string
          id: string
          preference: string
          source_quote: string | null
          times_reinforced: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          confidence?: number
          created_at?: string
          id?: string
          preference: string
          source_quote?: string | null
          times_reinforced?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          confidence?: number
          created_at?: string
          id?: string
          preference?: string
          source_quote?: string | null
          times_reinforced?: number
          updated_at?: string
          user_id?: string
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
