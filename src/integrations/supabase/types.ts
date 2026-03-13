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
          created_at: string
          dashboard_html: string
          department: string
          id: string
          job_function: string
          label: string
          source_application_id: string | null
        }
        Insert: {
          created_at?: string
          dashboard_html: string
          department?: string
          id?: string
          job_function?: string
          label: string
          source_application_id?: string | null
        }
        Update: {
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
      job_applications: {
        Row: {
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
          generation_error: string | null
          generation_status: string
          id: string
          job_description_markdown: string | null
          job_title: string | null
          job_url: string
          products: Json | null
          research_reasoning: string | null
          status: string
          updated_at: string
        }
        Insert: {
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
          generation_error?: string | null
          generation_status?: string
          id?: string
          job_description_markdown?: string | null
          job_title?: string | null
          job_url: string
          products?: Json | null
          research_reasoning?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
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
          generation_error?: string | null
          generation_status?: string
          id?: string
          job_description_markdown?: string | null
          job_title?: string | null
          job_url?: string
          products?: Json | null
          research_reasoning?: string | null
          status?: string
          updated_at?: string
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
