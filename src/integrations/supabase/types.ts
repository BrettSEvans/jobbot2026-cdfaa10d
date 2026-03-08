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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string
        }
        Relationships: []
      }
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
          persona_id: string | null
          source_application_id: string | null
          user_id: string | null
        }
        Insert: {
          asset_type?: string
          created_at?: string
          dashboard_html: string
          department?: string
          id?: string
          job_function?: string
          label: string
          persona_id?: string | null
          source_application_id?: string | null
          user_id?: string | null
        }
        Update: {
          asset_type?: string
          created_at?: string
          dashboard_html?: string
          department?: string
          id?: string
          job_function?: string
          label?: string
          persona_id?: string | null
          source_application_id?: string | null
          user_id?: string | null
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
      generated_asset_revisions: {
        Row: {
          application_id: string
          asset_id: string
          created_at: string
          html: string
          id: string
          label: string | null
          revision_number: number
        }
        Insert: {
          application_id: string
          asset_id: string
          created_at?: string
          html: string
          id?: string
          label?: string | null
          revision_number?: number
        }
        Update: {
          application_id?: string
          asset_id?: string
          created_at?: string
          html?: string
          id?: string
          label?: string | null
          revision_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "generated_asset_revisions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_asset_revisions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "generated_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_assets: {
        Row: {
          application_id: string
          asset_name: string
          brief_description: string | null
          created_at: string
          downloaded_at: string | null
          generation_error: string | null
          generation_status: string
          html: string
          id: string
          updated_at: string
        }
        Insert: {
          application_id: string
          asset_name: string
          brief_description?: string | null
          created_at?: string
          downloaded_at?: string | null
          generation_error?: string | null
          generation_status?: string
          html?: string
          id?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          asset_name?: string
          brief_description?: string | null
          created_at?: string
          downloaded_at?: string | null
          generation_error?: string | null
          generation_status?: string
          html?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_assets_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_usage: {
        Row: {
          asset_type: string
          created_at: string
          edge_function: string
          id: string
          user_id: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          edge_function: string
          id?: string
          user_id: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          edge_function?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          architecture_diagram_html: string | null
          ats_score: Json | null
          ats_scored_at: string | null
          branding: Json | null
          chat_history: Json | null
          company_icon_url: string | null
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
          persona_id: string | null
          pipeline_stage: string
          products: Json | null
          raid_log_html: string | null
          research_reasoning: string | null
          resume_html: string | null
          resume_style_id: string | null
          roadmap_html: string | null
          selected_assets: Json | null
          source_resume_id: string | null
          stage_changed_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          architecture_diagram_html?: string | null
          ats_score?: Json | null
          ats_scored_at?: string | null
          branding?: Json | null
          chat_history?: Json | null
          company_icon_url?: string | null
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
          persona_id?: string | null
          pipeline_stage?: string
          products?: Json | null
          raid_log_html?: string | null
          research_reasoning?: string | null
          resume_html?: string | null
          resume_style_id?: string | null
          roadmap_html?: string | null
          selected_assets?: Json | null
          source_resume_id?: string | null
          stage_changed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          architecture_diagram_html?: string | null
          ats_score?: Json | null
          ats_scored_at?: string | null
          branding?: Json | null
          chat_history?: Json | null
          company_icon_url?: string | null
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
          persona_id?: string | null
          pipeline_stage?: string
          products?: Json | null
          raid_log_html?: string | null
          research_reasoning?: string | null
          resume_html?: string | null
          resume_style_id?: string | null
          roadmap_html?: string | null
          selected_assets?: Json | null
          source_resume_id?: string | null
          stage_changed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pipeline_stage_history: {
        Row: {
          application_id: string
          changed_at: string
          from_stage: string | null
          id: string
          to_stage: string
          user_id: string
        }
        Insert: {
          application_id: string
          changed_at?: string
          from_stage?: string | null
          id?: string
          to_stage: string
          user_id: string
        }
        Update: {
          application_id?: string
          changed_at?: string
          from_stage?: string | null
          id?: string
          to_stage?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stage_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: string
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          key_skills: string[] | null
          last_name: string | null
          middle_name: string | null
          onboarding_completed_at: string | null
          preferred_tone: string | null
          resume_text: string | null
          target_industries: string[] | null
          updated_at: string
          years_experience: string | null
        }
        Insert: {
          approval_status?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          key_skills?: string[] | null
          last_name?: string | null
          middle_name?: string | null
          onboarding_completed_at?: string | null
          preferred_tone?: string | null
          resume_text?: string | null
          target_industries?: string[] | null
          updated_at?: string
          years_experience?: string | null
        }
        Update: {
          approval_status?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          key_skills?: string[] | null
          last_name?: string | null
          middle_name?: string | null
          onboarding_completed_at?: string | null
          preferred_tone?: string | null
          resume_text?: string | null
          target_industries?: string[] | null
          updated_at?: string
          years_experience?: string | null
        }
        Relationships: []
      }
      proposed_assets: {
        Row: {
          application_id: string
          asset_name: string
          brief_description: string
          created_at: string
          id: string
          selected: boolean
        }
        Insert: {
          application_id: string
          asset_name: string
          brief_description?: string
          created_at?: string
          id?: string
          selected?: boolean
        }
        Update: {
          application_id?: string
          asset_name?: string
          brief_description?: string
          created_at?: string
          id?: string
          selected?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "proposed_assets_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_test_results: {
        Row: {
          created_at: string
          failure_notes: string | null
          id: string
          regression_fixed_at: string | null
          regression_ticket: string | null
          result: string
          run_id: string
          test_case_id: string
          tested_by: string
        }
        Insert: {
          created_at?: string
          failure_notes?: string | null
          id?: string
          regression_fixed_at?: string | null
          regression_ticket?: string | null
          result?: string
          run_id: string
          test_case_id: string
          tested_by: string
        }
        Update: {
          created_at?: string
          failure_notes?: string | null
          id?: string
          regression_fixed_at?: string | null
          regression_ticket?: string | null
          result?: string
          run_id?: string
          test_case_id?: string
          tested_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_test_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "qa_test_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      qa_test_runs: {
        Row: {
          build_label: string
          build_timestamp: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          build_label: string
          build_timestamp?: string
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          status?: string
        }
        Update: {
          build_label?: string
          build_timestamp?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          status?: string
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
      rate_limit_overrides: {
        Row: {
          created_at: string
          id: string
          is_unlimited: boolean
          notes: string | null
          per_day: number
          per_hour: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_unlimited?: boolean
          notes?: string | null
          per_day?: number
          per_hour?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_unlimited?: boolean
          notes?: string | null
          per_day?: number
          per_hour?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resume_prompt_styles: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
          system_prompt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
          system_prompt: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
          system_prompt?: string
          updated_at?: string
        }
        Relationships: []
      }
      resume_revisions: {
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
            foreignKeyName: "resume_revisions_application_id_fkey"
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
      system_documents: {
        Row: {
          content: string
          created_at: string
          id: string
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          slug: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      test_users: {
        Row: {
          admin_id: string
          created_at: string
          display_name: string | null
          first_name: string
          id: string
          key_skills: string[] | null
          last_name: string
          middle_name: string | null
          preferred_tone: string | null
          resume_text: string | null
          target_industries: string[] | null
          updated_at: string
          years_experience: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          display_name?: string | null
          first_name?: string
          id?: string
          key_skills?: string[] | null
          last_name?: string
          middle_name?: string | null
          preferred_tone?: string | null
          resume_text?: string | null
          target_industries?: string[] | null
          updated_at?: string
          years_experience?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          display_name?: string | null
          first_name?: string
          id?: string
          key_skills?: string[] | null
          last_name?: string
          middle_name?: string | null
          preferred_tone?: string | null
          resume_text?: string | null
          target_industries?: string[] | null
          updated_at?: string
          years_experience?: string | null
        }
        Relationships: []
      }
      user_resumes: {
        Row: {
          file_name: string
          id: string
          is_active: boolean
          storage_path: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_name: string
          id?: string
          is_active?: boolean
          storage_path: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_name?: string
          id?: string
          is_active?: boolean
          storage_path?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
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
      admin_soft_delete_user: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      delete_and_reassign_resume: {
        Args: { p_resume_id: string }
        Returns: undefined
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_active_resume: { Args: { p_resume_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user" | "qa"
      subscription_tier: "free" | "pro" | "premium"
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
      app_role: ["admin", "user", "qa"],
      subscription_tier: ["free", "pro", "premium"],
    },
  },
} as const
