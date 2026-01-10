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
      admin_overrides: {
        Row: {
          created_at: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          overridden_by: string
          reason: string
          resource_id: string
          resource_type: string
        }
        Insert: {
          created_at?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          overridden_by: string
          reason: string
          resource_id: string
          resource_type: string
        }
        Update: {
          created_at?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          overridden_by?: string
          reason?: string
          resource_id?: string
          resource_type?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      branding_settings: {
        Row: {
          accent_color: string | null
          created_at: string | null
          custom_css: string | null
          favicon_url: string | null
          font_family: string | null
          hide_powered_by: boolean | null
          id: string
          logo_url: string | null
          organization_id: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          created_at?: string | null
          custom_css?: string | null
          favicon_url?: string | null
          font_family?: string | null
          hide_powered_by?: boolean | null
          id?: string
          logo_url?: string | null
          organization_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          created_at?: string | null
          custom_css?: string | null
          favicon_url?: string | null
          font_family?: string | null
          hide_powered_by?: boolean | null
          id?: string
          logo_url?: string | null
          organization_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branding_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      computation_logs: {
        Row: {
          computation_type: string
          computed_by: string | null
          created_at: string | null
          formula_used: string | null
          id: string
          input_data: Json | null
          output_data: Json | null
          round_id: string
        }
        Insert: {
          computation_type: string
          computed_by?: string | null
          created_at?: string | null
          formula_used?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          round_id: string
        }
        Update: {
          computation_type?: string
          computed_by?: string | null
          created_at?: string | null
          formula_used?: string | null
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "computation_logs_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      computed_results: {
        Row: {
          aggregated_z: number | null
          computation_version: number | null
          computed_at: string | null
          computed_by: string | null
          id: string
          is_tied: boolean | null
          judge_id: string | null
          judge_mean: number | null
          judge_std: number | null
          normalized_z: number | null
          percentile: number | null
          rank: number | null
          raw_total: number | null
          round_id: string
          team_id: string
          tie_breaker_data: Json | null
          weighted_z_scores: Json | null
        }
        Insert: {
          aggregated_z?: number | null
          computation_version?: number | null
          computed_at?: string | null
          computed_by?: string | null
          id?: string
          is_tied?: boolean | null
          judge_id?: string | null
          judge_mean?: number | null
          judge_std?: number | null
          normalized_z?: number | null
          percentile?: number | null
          rank?: number | null
          raw_total?: number | null
          round_id: string
          team_id: string
          tie_breaker_data?: Json | null
          weighted_z_scores?: Json | null
        }
        Update: {
          aggregated_z?: number | null
          computation_version?: number | null
          computed_at?: string | null
          computed_by?: string | null
          id?: string
          is_tied?: boolean | null
          judge_id?: string | null
          judge_mean?: number | null
          judge_std?: number | null
          normalized_z?: number | null
          percentile?: number | null
          rank?: number | null
          raw_total?: number | null
          round_id?: string
          team_id?: string
          tie_breaker_data?: Json | null
          weighted_z_scores?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "computed_results_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "computed_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      criteria: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string
          id: string
          max_score: number | null
          name: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id: string
          id?: string
          max_score?: number | null
          name: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string
          id?: string
          max_score?: number | null
          name?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "criteria_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_admin_assignments: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_admin_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          error_message: string | null
          event_id: string
          id: string
          notification_type: string
          recipient_email: string | null
          recipient_id: string | null
          sent_at: string | null
          status: string | null
          subject: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          error_message?: string | null
          event_id: string
          id?: string
          notification_type: string
          recipient_email?: string | null
          recipient_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          error_message?: string | null
          event_id?: string
          id?: string
          notification_type?: string
          recipient_email?: string | null
          recipient_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_state_transitions: {
        Row: {
          created_at: string | null
          event_id: string
          from_status: string | null
          id: string
          metadata: Json | null
          reason: string | null
          to_status: string
          transitioned_by: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          from_status?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          to_status: string
          transitioned_by: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          from_status?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          to_status?: string
          transitioned_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_state_transitions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          name: string
          published_at: string | null
          published_by: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["event_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          name: string
          published_at?: string | null
          published_by?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          name?: string
          published_at?: string | null
          published_by?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      judge_assignments: {
        Row: {
          assigned_at: string | null
          id: string
          judge_id: string
          round_id: string
          team_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          judge_id: string
          round_id: string
          team_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          id?: string
          judge_id?: string
          round_id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "judge_assignments_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      judge_team_assignments: {
        Row: {
          assigned_at: string | null
          id: string
          judge_id: string
          team_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          judge_id: string
          team_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          judge_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judge_team_assignments_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "judges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judge_team_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      judges: {
        Row: {
          category: string | null
          created_at: string | null
          email: string
          event_id: string
          id: string
          invitation_sent: boolean | null
          invitation_sent_at: string | null
          name: string
          token: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          email: string
          event_id: string
          id?: string
          invitation_sent?: boolean | null
          invitation_sent_at?: string | null
          name: string
          token: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          email?: string
          event_id?: string
          id?: string
          invitation_sent?: boolean | null
          invitation_sent_at?: string | null
          name?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "judges_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          custom_domain: string | null
          domain_verified: boolean | null
          id: string
          is_enterprise: boolean | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_domain?: string | null
          domain_verified?: boolean | null
          id?: string
          is_enterprise?: boolean | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_domain?: string | null
          domain_verified?: boolean | null
          id?: string
          is_enterprise?: boolean | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          allowed: boolean | null
          created_at: string | null
          id: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          action: string
          allowed?: boolean | null
          created_at?: string | null
          id?: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          action?: string
          allowed?: boolean | null
          created_at?: string | null
          id?: string
          resource?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          count: number | null
          id: string
          identifier: string
          window_start: string | null
        }
        Insert: {
          action: string
          count?: number | null
          id?: string
          identifier: string
          window_start?: string | null
        }
        Update: {
          action?: string
          count?: number | null
          id?: string
          identifier?: string
          window_start?: string | null
        }
        Relationships: []
      }
      raw_evaluations: {
        Row: {
          id: string
          ip_address: unknown
          is_draft: boolean | null
          judge_id: string
          round_id: string
          scores: Json
          submitted_at: string | null
          team_id: string
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_address?: unknown
          is_draft?: boolean | null
          judge_id: string
          round_id: string
          scores?: Json
          submitted_at?: string | null
          team_id: string
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_address?: unknown
          is_draft?: boolean | null
          judge_id?: string
          round_id?: string
          scores?: Json
          submitted_at?: string | null
          team_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_evaluations_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_evaluations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          revoked_at: string | null
          revoked_reason: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      round_compute_logs: {
        Row: {
          computation_params: Json | null
          computed_at: string | null
          computed_by: string | null
          id: string
          judges_count: number | null
          normalization_method: string
          round_id: string
          teams_evaluated: number | null
        }
        Insert: {
          computation_params?: Json | null
          computed_at?: string | null
          computed_by?: string | null
          id?: string
          judges_count?: number | null
          normalization_method?: string
          round_id: string
          teams_evaluated?: number | null
        }
        Update: {
          computation_params?: Json | null
          computed_at?: string | null
          computed_by?: string | null
          id?: string
          judges_count?: number | null
          normalization_method?: string
          round_id?: string
          teams_evaluated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "round_compute_logs_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      round_criteria: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          max_marks: number
          name: string
          round_id: string
          weight: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order: number
          id?: string
          max_marks: number
          name: string
          round_id: string
          weight?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          max_marks?: number
          name?: string
          round_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "round_criteria_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      round_evaluations: {
        Row: {
          created_at: string | null
          id: string
          is_draft: boolean | null
          judge_id: string
          note: string | null
          raw_total: number | null
          round_id: string
          scores: Json
          submitted_at: string | null
          team_id: string
          version: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_draft?: boolean | null
          judge_id: string
          note?: string | null
          raw_total?: number | null
          round_id: string
          scores?: Json
          submitted_at?: string | null
          team_id: string
          version?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_draft?: boolean | null
          judge_id?: string
          note?: string | null
          raw_total?: number | null
          round_id?: string
          scores?: Json
          submitted_at?: string | null
          team_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "round_evaluations_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "judges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_evaluations_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_evaluations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      round_judge_assignments: {
        Row: {
          assigned_at: string | null
          id: string
          judge_id: string
          judge_type: string
          judge_weight: number | null
          round_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          judge_id: string
          judge_type?: string
          judge_weight?: number | null
          round_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          judge_id?: string
          judge_type?: string
          judge_weight?: number | null
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_judge_assignments_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "judges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_judge_assignments_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      round_manual_adjustments: {
        Row: {
          adjusted_at: string | null
          adjusted_by: string | null
          adjustment_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          round_id: string
          team_id: string
        }
        Insert: {
          adjusted_at?: string | null
          adjusted_by?: string | null
          adjustment_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          round_id: string
          team_id: string
        }
        Update: {
          adjusted_at?: string | null
          adjusted_by?: string | null
          adjustment_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          round_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_manual_adjustments_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_manual_adjustments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      round_normalization_results: {
        Row: {
          aggregated_z: number | null
          computed_at: string | null
          id: string
          judge_id: string | null
          judge_mean: number | null
          judge_std: number | null
          percentile: number | null
          rank: number | null
          raw_total: number | null
          round_id: string
          team_id: string
          tie_breaker_data: Json | null
          z_score: number | null
        }
        Insert: {
          aggregated_z?: number | null
          computed_at?: string | null
          id?: string
          judge_id?: string | null
          judge_mean?: number | null
          judge_std?: number | null
          percentile?: number | null
          rank?: number | null
          raw_total?: number | null
          round_id: string
          team_id: string
          tie_breaker_data?: Json | null
          z_score?: number | null
        }
        Update: {
          aggregated_z?: number | null
          computed_at?: string | null
          id?: string
          judge_id?: string | null
          judge_mean?: number | null
          judge_std?: number | null
          percentile?: number | null
          rank?: number | null
          raw_total?: number | null
          round_id?: string
          team_id?: string
          tie_breaker_data?: Json | null
          z_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "round_normalization_results_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "judges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_normalization_results_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_normalization_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      round_team_selections: {
        Row: {
          from_round_id: string
          id: string
          selected_at: string | null
          selected_by_judge_id: string | null
          selection_criteria: Json | null
          selection_mode: string
          team_id: string
          to_round_id: string | null
        }
        Insert: {
          from_round_id: string
          id?: string
          selected_at?: string | null
          selected_by_judge_id?: string | null
          selection_criteria?: Json | null
          selection_mode: string
          team_id: string
          to_round_id?: string | null
        }
        Update: {
          from_round_id?: string
          id?: string
          selected_at?: string | null
          selected_by_judge_id?: string | null
          selection_criteria?: Json | null
          selection_mode?: string
          team_id?: string
          to_round_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "round_team_selections_from_round_id_fkey"
            columns: ["from_round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_team_selections_selected_by_judge_id_fkey"
            columns: ["selected_by_judge_id"]
            isOneToOne: false
            referencedRelation: "judges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_team_selections_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_team_selections_to_round_id_fkey"
            columns: ["to_round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          computed_at: string | null
          created_at: string | null
          event_id: string
          id: string
          is_computed: boolean | null
          max_criteria: number | null
          name: string
          normalization_method: string | null
          round_number: number
          selection_mode: string | null
          selection_params: Json | null
          status: string | null
        }
        Insert: {
          computed_at?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          is_computed?: boolean | null
          max_criteria?: number | null
          name: string
          normalization_method?: string | null
          round_number: number
          selection_mode?: string | null
          selection_params?: Json | null
          status?: string | null
        }
        Update: {
          computed_at?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          is_computed?: boolean | null
          max_criteria?: number | null
          name?: string
          normalization_method?: string | null
          round_number?: number
          selection_mode?: string | null
          selection_params?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rounds_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      score_overrides: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          criterion_id: string | null
          evaluation_id: string
          id: string
          ip_address: unknown
          new_score: number
          overridden_at: string | null
          overridden_by: string
          override_type: string
          previous_score: number | null
          reason: string
          user_agent: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          criterion_id?: string | null
          evaluation_id: string
          id?: string
          ip_address?: unknown
          new_score: number
          overridden_at?: string | null
          overridden_by: string
          override_type: string
          previous_score?: number | null
          reason: string
          user_agent?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          criterion_id?: string | null
          evaluation_id?: string
          id?: string
          ip_address?: unknown
          new_score?: number
          overridden_at?: string | null
          overridden_by?: string
          override_type?: string
          previous_score?: number | null
          reason?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "score_overrides_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "round_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_overrides_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "raw_evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          criterion_key: string
          id: string
          judge_id: string
          round: number | null
          score: number
          submitted_at: string | null
          team_id: string
        }
        Insert: {
          criterion_key: string
          id?: string
          judge_id: string
          round?: number | null
          score: number
          submitted_at?: string | null
          team_id: string
        }
        Update: {
          criterion_key?: string
          id?: string
          judge_id?: string
          round?: number | null
          score?: number
          submitted_at?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "judges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          ip_address: unknown
          round_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          round_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          round_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scoring_audit_log_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          description: string | null
          id: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          category_id: string | null
          created_at: string | null
          event_id: string
          id: string
          is_absent: boolean | null
          members: Json | null
          name: string
          project_description: string | null
          project_title: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          is_absent?: boolean | null
          members?: Json | null
          name: string
          project_description?: string | null
          project_title?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          is_absent?: boolean | null
          members?: Json | null
          name?: string
          project_description?: string | null
          project_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          failed_login_attempts: number | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          locked_until: string | null
          mfa_enabled: boolean | null
          organization_id: string | null
          password_changed_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          failed_login_attempts?: number | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          locked_until?: string | null
          mfa_enabled?: boolean | null
          organization_id?: string | null
          password_changed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          failed_login_attempts?: number | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          locked_until?: string | null
          mfa_enabled?: boolean | null
          organization_id?: string | null
          password_changed_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_profiles_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          capacity: number | null
          created_at: string
          event_id: string
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          event_id: string
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_event: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: boolean
      }
      create_audit_log: {
        Args: {
          p_action: string
          p_new_value?: Json
          p_old_value?: Json
          p_reason?: string
          p_resource_id: string
          p_resource_type: string
          p_user_id: string
        }
        Returns: string
      }
      get_event_state: { Args: { p_event_id: string }; Returns: Json }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: { p_action: string; p_resource: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reject_precalculated_values: {
        Args: { p_scores: Json }
        Returns: boolean
      }
      transition_event_status: {
        Args: { p_event_id: string; p_new_status: string; p_reason?: string }
        Returns: Json
      }
      validate_raw_scores: {
        Args: { p_round_id: string; p_scores: Json }
        Returns: Json
      }
    }
    Enums: {
      app_role: "super_admin" | "event_admin" | "judge" | "viewer"
      event_status: "draft" | "live_judging" | "locked" | "published"
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
      app_role: ["super_admin", "event_admin", "judge", "viewer"],
      event_status: ["draft", "live_judging", "locked", "published"],
    },
  },
} as const
