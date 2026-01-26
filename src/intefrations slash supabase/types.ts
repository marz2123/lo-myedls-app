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
      audio_segments: {
        Row: {
          block_id: string | null
          confidence_score: number | null
          created_at: string
          id: string
          speaker_detected: string | null
          timestamp_end: number
          timestamp_start: number
          transcription: string
          visit_session_id: string
        }
        Insert: {
          block_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          speaker_detected?: string | null
          timestamp_end: number
          timestamp_start: number
          transcription: string
          visit_session_id: string
        }
        Update: {
          block_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          speaker_detected?: string | null
          timestamp_end?: number
          timestamp_start?: number
          transcription?: string
          visit_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_segments_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "detected_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_segments_visit_session_id_fkey"
            columns: ["visit_session_id"]
            isOneToOne: false
            referencedRelation: "visit_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cache_predictions: {
        Row: {
          cache_key: string
          confidence_score: number | null
          created_at: string
          expires_at: string
          hit_count: number | null
          id: string
          last_hit_at: string | null
          prediction_data: Json
          prediction_type: string
          user_id: string
        }
        Insert: {
          cache_key: string
          confidence_score?: number | null
          created_at?: string
          expires_at: string
          hit_count?: number | null
          id?: string
          last_hit_at?: string | null
          prediction_data: Json
          prediction_type: string
          user_id: string
        }
        Update: {
          cache_key?: string
          confidence_score?: number | null
          created_at?: string
          expires_at?: string
          hit_count?: number | null
          id?: string
          last_hit_at?: string | null
          prediction_data?: Json
          prediction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      client_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          created_at: string
          id: string
          project_id: string
          question: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          id?: string
          project_id: string
          question: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          id?: string
          project_id?: string
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_questions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_questions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "client_questions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
        ]
      }
      contextual_tips: {
        Row: {
          context: string
          created_at: string
          dismissed: boolean
          id: string
          shown: boolean
          shown_at: string | null
          tip_type: string
          user_id: string
        }
        Insert: {
          context: string
          created_at?: string
          dismissed?: boolean
          id?: string
          shown?: boolean
          shown_at?: string | null
          tip_type: string
          user_id: string
        }
        Update: {
          context?: string
          created_at?: string
          dismissed?: boolean
          id?: string
          shown?: boolean
          shown_at?: string | null
          tip_type?: string
          user_id?: string
        }
        Relationships: []
      }
      ct_categories: {
        Row: {
          created_at: string
          ct_code: string
          ct_label: string
          ft_code: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ct_code: string
          ct_label: string
          ft_code: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ct_code?: string
          ct_label?: string
          ft_code?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ct_categories_ft_code_fkey"
            columns: ["ft_code"]
            isOneToOne: false
            referencedRelation: "ft_familles"
            referencedColumns: ["ft_code"]
          },
        ]
      }
      custom_templates: {
        Row: {
          content: string
          created_at: string
          detail_level: string | null
          id: string
          property_type: string
          template_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          detail_level?: string | null
          id?: string
          property_type: string
          template_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          detail_level?: string | null
          id?: string
          property_type?: string
          template_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          ai_risks: string | null
          ai_suggestions: string | null
          ai_summary: string | null
          companies_present: string[] | null
          created_at: string
          id: string
          is_validated: boolean | null
          log_date: string
          observations: string | null
          photo_urls: Json | null
          problems_encountered: string | null
          project_id: string
          tasks_completed: string[] | null
          updated_at: string
          urgent_needs: string | null
          user_id: string
          validated_at: string | null
          validated_by: string | null
          weather: string | null
          weather_data: Json | null
        }
        Insert: {
          ai_risks?: string | null
          ai_suggestions?: string | null
          ai_summary?: string | null
          companies_present?: string[] | null
          created_at?: string
          id?: string
          is_validated?: boolean | null
          log_date?: string
          observations?: string | null
          photo_urls?: Json | null
          problems_encountered?: string | null
          project_id: string
          tasks_completed?: string[] | null
          updated_at?: string
          urgent_needs?: string | null
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
          weather?: string | null
          weather_data?: Json | null
        }
        Update: {
          ai_risks?: string | null
          ai_suggestions?: string | null
          ai_summary?: string | null
          companies_present?: string[] | null
          created_at?: string
          id?: string
          is_validated?: boolean | null
          log_date?: string
          observations?: string | null
          photo_urls?: Json | null
          problems_encountered?: string | null
          project_id?: string
          tasks_completed?: string[] | null
          updated_at?: string
          urgent_needs?: string | null
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
          weather?: string | null
          weather_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
        ]
      }
      detected_anomalies: {
        Row: {
          anomaly_type: string
          confidence_score: number | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          description: string
          detection_metadata: Json | null
          frame_id: string | null
          id: string
          is_confirmed: boolean | null
          location_data: Json | null
          project_id: string
          severity: string
          visit_session_id: string | null
        }
        Insert: {
          anomaly_type: string
          confidence_score?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          description: string
          detection_metadata?: Json | null
          frame_id?: string | null
          id?: string
          is_confirmed?: boolean | null
          location_data?: Json | null
          project_id: string
          severity: string
          visit_session_id?: string | null
        }
        Update: {
          anomaly_type?: string
          confidence_score?: number | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          description?: string
          detection_metadata?: Json | null
          frame_id?: string | null
          id?: string
          is_confirmed?: boolean | null
          location_data?: Json | null
          project_id?: string
          severity?: string
          visit_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detected_anomalies_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "extracted_frames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_anomalies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_anomalies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "detected_anomalies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "detected_anomalies_visit_session_id_fkey"
            columns: ["visit_session_id"]
            isOneToOne: false
            referencedRelation: "visit_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      detected_blocks: {
        Row: {
          block_number: number
          confidence_score: number | null
          created_at: string
          detected_room_type: string | null
          id: string
          manual_label: string | null
          model_3d_urls: Json | null
          timestamp_end: number | null
          timestamp_start: number | null
          transition_detected: boolean | null
          updated_at: string
          visit_session_id: string
          volume_data: Json | null
        }
        Insert: {
          block_number: number
          confidence_score?: number | null
          created_at?: string
          detected_room_type?: string | null
          id?: string
          manual_label?: string | null
          model_3d_urls?: Json | null
          timestamp_end?: number | null
          timestamp_start?: number | null
          transition_detected?: boolean | null
          updated_at?: string
          visit_session_id: string
          volume_data?: Json | null
        }
        Update: {
          block_number?: number
          confidence_score?: number | null
          created_at?: string
          detected_room_type?: string | null
          id?: string
          manual_label?: string | null
          model_3d_urls?: Json | null
          timestamp_end?: number | null
          timestamp_start?: number | null
          transition_detected?: boolean | null
          updated_at?: string
          visit_session_id?: string
          volume_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "detected_blocks_visit_session_id_fkey"
            columns: ["visit_session_id"]
            isOneToOne: false
            referencedRelation: "visit_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      dsc_classification_logs: {
        Row: {
          ai_category_code: string | null
          ai_family_code: string | null
          ai_subcategory_code: string | null
          category_match_type: string | null
          created_at: string | null
          family_match_type: string | null
          id: string
          matched_category_id: string | null
          matched_family_id: string | null
          matched_subcategory_id: string | null
          needs_review: boolean | null
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          subcategory_match_type: string | null
          suggestions: Json | null
          task_id: string | null
          task_title: string | null
          user_id: string
          warnings: string[] | null
        }
        Insert: {
          ai_category_code?: string | null
          ai_family_code?: string | null
          ai_subcategory_code?: string | null
          category_match_type?: string | null
          created_at?: string | null
          family_match_type?: string | null
          id?: string
          matched_category_id?: string | null
          matched_family_id?: string | null
          matched_subcategory_id?: string | null
          needs_review?: boolean | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          subcategory_match_type?: string | null
          suggestions?: Json | null
          task_id?: string | null
          task_title?: string | null
          user_id: string
          warnings?: string[] | null
        }
        Update: {
          ai_category_code?: string | null
          ai_family_code?: string | null
          ai_subcategory_code?: string | null
          category_match_type?: string | null
          created_at?: string | null
          family_match_type?: string | null
          id?: string
          matched_category_id?: string | null
          matched_family_id?: string | null
          matched_subcategory_id?: string | null
          needs_review?: boolean | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          subcategory_match_type?: string | null
          suggestions?: Json | null
          task_id?: string | null
          task_title?: string | null
          user_id?: string
          warnings?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "dsc_classification_logs_matched_category_id_fkey"
            columns: ["matched_category_id"]
            isOneToOne: false
            referencedRelation: "dsc_category_stats"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "dsc_classification_logs_matched_category_id_fkey"
            columns: ["matched_category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsc_classification_logs_matched_family_id_fkey"
            columns: ["matched_family_id"]
            isOneToOne: false
            referencedRelation: "dsc_family_stats"
            referencedColumns: ["family_id"]
          },
          {
            foreignKeyName: "dsc_classification_logs_matched_family_id_fkey"
            columns: ["matched_family_id"]
            isOneToOne: false
            referencedRelation: "task_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsc_classification_logs_matched_subcategory_id_fkey"
            columns: ["matched_subcategory_id"]
            isOneToOne: false
            referencedRelation: "dsc_subcategory_stats"
            referencedColumns: ["subcategory_id"]
          },
          {
            foreignKeyName: "dsc_classification_logs_matched_subcategory_id_fkey"
            columns: ["matched_subcategory_id"]
            isOneToOne: false
            referencedRelation: "task_subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsc_classification_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "extracted_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      dsc_learning_corrections: {
        Row: {
          confidence_score: number | null
          corrected_by: string
          corrected_category_id: string
          corrected_family_id: string
          corrected_subcategory_id: string
          correction_type: string
          created_at: string | null
          id: string
          keywords_extracted: Json | null
          original_category_id: string | null
          original_family_id: string | null
          original_subcategory_id: string | null
          task_description: string | null
          task_id: string | null
          task_title: string
        }
        Insert: {
          confidence_score?: number | null
          corrected_by: string
          corrected_category_id: string
          corrected_family_id: string
          corrected_subcategory_id: string
          correction_type: string
          created_at?: string | null
          id?: string
          keywords_extracted?: Json | null
          original_category_id?: string | null
          original_family_id?: string | null
          original_subcategory_id?: string | null
          task_description?: string | null
          task_id?: string | null
          task_title: string
        }
        Update: {
          confidence_score?: number | null
          corrected_by?: string
          corrected_category_id?: string
          corrected_family_id?: string
          corrected_subcategory_id?: string
          correction_type?: string
          created_at?: string | null
          id?: string
          keywords_extracted?: Json | null
          original_category_id?: string | null
          original_family_id?: string | null
          original_subcategory_id?: string | null
          task_description?: string | null
          task_id?: string | null
          task_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsc_learning_corrections_corrected_category_id_fkey"
            columns: ["corrected_category_id"]
            isOneToOne: false
            referencedRelation: "dsc_category_stats"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "dsc_learning_corrections_corrected_category_id_fkey"
            columns: ["corrected_category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsc_learning_corrections_corrected_family_id_fkey"
            columns: ["corrected_family_id"]
            isOneToOne: false
            referencedRelation: "dsc_family_stats"
            referencedColumns: ["family_id"]
          },
          {
            foreignKeyName: "dsc_learning_corrections_corrected_family_id_fkey"
            columns: ["corrected_family_id"]
            isOneToOne: false
            referencedRelation: "task_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsc_learning_corrections_corrected_subcategory_id_fkey"
            columns: ["corrected_subcategory_id"]
            isOneToOne: false
            referencedRelation: "dsc_subcategory_stats"
            referencedColumns: ["subcategory_id"]
          },
          {
            foreignKeyName: "dsc_learning_corrections_corrected_subcategory_id_fkey"
            columns: ["corrected_subcategory_id"]
            isOneToOne: false
            referencedRelation: "task_subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsc_learning_corrections_original_category_id_fkey"
            columns: ["original_category_id"]
            isOneToOne: false
            referencedRelation: "dsc_category_stats"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "dsc_learning_corrections_original_category_id_fkey"
            columns: ["original_category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsc_learning_corrections_original_family_id_fkey"
            columns: ["original_family_id"]
            isOneToOne: false
            referencedRelation: "dsc_family_stats"
            referencedColumns: ["family_id"]
          },
          {
            foreignKeyName: "dsc_learning_corrections_original_family_id_fkey"
            columns: ["original_family_id"]
            isOneToOne: false
            referencedRelation: "task_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsc_learning_corrections_original_subcategory_id_fkey"
            columns: ["original_subcategory_id"]
            isOneToOne: false
            referencedRelation: "dsc_subcategory_stats"
            referencedColumns: ["subcategory_id"]
          },
          {
            foreignKeyName: "dsc_learning_corrections_original_subcategory_id_fkey"
            columns: ["original_subcategory_id"]
            isOneToOne: false
            referencedRelation: "task_subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsc_learning_corrections_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "extracted_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      edl_signatures: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          signature_data: string
          signed_at: string
          signer_email: string | null
          signer_name: string
          signer_type: string
          user_agent: string | null
          visit_session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_data: string
          signed_at?: string
          signer_email?: string | null
          signer_name: string
          signer_type: string
          user_agent?: string | null
          visit_session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_data?: string
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
          signer_type?: string
          user_agent?: string | null
          visit_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edl_signatures_visit_session_id_fkey"
            columns: ["visit_session_id"]
            isOneToOne: false
            referencedRelation: "visit_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      exterior_ft_ct_st_tasks: {
        Row: {
          cost_max: number | null
          cost_min: number | null
          created_at: string
          ct_category: string
          dependencies: Json | null
          description: string | null
          estimation_id: string | null
          ft_family: string
          id: string
          priority: string | null
          project_id: string | null
          reason: string | null
          st_subcategory: string
          updated_at: string
          work_name: string
          work_quantity: string | null
          work_unit: string | null
        }
        Insert: {
          cost_max?: number | null
          cost_min?: number | null
          created_at?: string
          ct_category: string
          dependencies?: Json | null
          description?: string | null
          estimation_id?: string | null
          ft_family: string
          id?: string
          priority?: string | null
          project_id?: string | null
          reason?: string | null
          st_subcategory: string
          updated_at?: string
          work_name: string
          work_quantity?: string | null
          work_unit?: string | null
        }
        Update: {
          cost_max?: number | null
          cost_min?: number | null
          created_at?: string
          ct_category?: string
          dependencies?: Json | null
          description?: string | null
          estimation_id?: string | null
          ft_family?: string
          id?: string
          priority?: string | null
          project_id?: string | null
          reason?: string | null
          st_subcategory?: string
          updated_at?: string
          work_name?: string
          work_quantity?: string | null
          work_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exterior_ft_ct_st_tasks_estimation_id_fkey"
            columns: ["estimation_id"]
            isOneToOne: false
            referencedRelation: "exterior_work_estimations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exterior_ft_ct_st_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exterior_ft_ct_st_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "exterior_ft_ct_st_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
        ]
      }
      exterior_work_estimations: {
        Row: {
          complexity_level: string | null
          created_at: string
          estimation_json: Json
          external_analysis_id: string | null
          global_budget_max: number | null
          global_budget_min: number | null
          id: string
          project_id: string | null
          snapshot_id: string | null
          updated_at: string
        }
        Insert: {
          complexity_level?: string | null
          created_at?: string
          estimation_json?: Json
          external_analysis_id?: string | null
          global_budget_max?: number | null
          global_budget_min?: number | null
          id?: string
          project_id?: string | null
          snapshot_id?: string | null
          updated_at?: string
        }
        Update: {
          complexity_level?: string | null
          created_at?: string
          estimation_json?: Json
          external_analysis_id?: string | null
          global_budget_max?: number | null
          global_budget_min?: number | null
          id?: string
          project_id?: string | null
          snapshot_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exterior_work_estimations_external_analysis_id_fkey"
            columns: ["external_analysis_id"]
            isOneToOne: false
            referencedRelation: "external_building_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exterior_work_estimations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exterior_work_estimations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "exterior_work_estimations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "exterior_work_estimations_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "property_enrichment_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      external_building_analysis: {
        Row: {
          analysis_json: Json
          created_at: string
          id: string
          images_analyzed: Json | null
          project_id: string | null
          snapshot_id: string | null
          updated_at: string
        }
        Insert: {
          analysis_json?: Json
          created_at?: string
          id?: string
          images_analyzed?: Json | null
          project_id?: string | null
          snapshot_id?: string | null
          updated_at?: string
        }
        Update: {
          analysis_json?: Json
          created_at?: string
          id?: string
          images_analyzed?: Json | null
          project_id?: string | null
          snapshot_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_building_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_building_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "external_building_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "external_building_analysis_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "property_enrichment_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_frames: {
        Row: {
          analysis_result: Json | null
          block_id: string | null
          created_at: string
          detected_elements: Json | null
          detected_materials: Json | null
          detected_pathologies: Json | null
          edl_tags: Json | null
          frame_url: string
          id: string
          is_key_frame: boolean | null
          location_confidence: number | null
          location_id: string | null
          manual_label: string | null
          timestamp_seconds: number
          transition_score: number | null
          visit_session_id: string
          zone_confidence: number | null
          zone_id: string | null
        }
        Insert: {
          analysis_result?: Json | null
          block_id?: string | null
          created_at?: string
          detected_elements?: Json | null
          detected_materials?: Json | null
          detected_pathologies?: Json | null
          edl_tags?: Json | null
          frame_url: string
          id?: string
          is_key_frame?: boolean | null
          location_confidence?: number | null
          location_id?: string | null
          manual_label?: string | null
          timestamp_seconds: number
          transition_score?: number | null
          visit_session_id: string
          zone_confidence?: number | null
          zone_id?: string | null
        }
        Update: {
          analysis_result?: Json | null
          block_id?: string | null
          created_at?: string
          detected_elements?: Json | null
          detected_materials?: Json | null
          detected_pathologies?: Json | null
          edl_tags?: Json | null
          frame_url?: string
          id?: string
          is_key_frame?: boolean | null
          location_confidence?: number | null
          location_id?: string | null
          manual_label?: string | null
          timestamp_seconds?: number
          transition_score?: number | null
          visit_session_id?: string
          zone_confidence?: number | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_frames_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "detected_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_frames_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "property_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_frames_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["lieu_id"]
          },
          {
            foreignKeyName: "extracted_frames_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["lieu_id"]
          },
          {
            foreignKeyName: "extracted_frames_visit_session_id_fkey"
            columns: ["visit_session_id"]
            isOneToOne: false
            referencedRelation: "visit_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_frames_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "location_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_frames_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["zone_id"]
          },
        ]
      }
      extracted_tasks: {
        Row: {
          analysis_metadata: Json | null
          area: string | null
          audio_timestamp: number | null
          block_id: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          detection_confidence: number | null
          family_id: string | null
          frame_id: string | null
          id: string
          image_url: string | null
          location: string | null
          priority: string | null
          project_id: string | null
          source_type: string | null
          subcategory_id: string | null
          title: string
          user_id: string | null
          visit_session_id: string | null
          work_type: string | null
        }
        Insert: {
          analysis_metadata?: Json | null
          area?: string | null
          audio_timestamp?: number | null
          block_id?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          detection_confidence?: number | null
          family_id?: string | null
          frame_id?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          priority?: string | null
          project_id?: string | null
          source_type?: string | null
          subcategory_id?: string | null
          title: string
          user_id?: string | null
          visit_session_id?: string | null
          work_type?: string | null
        }
        Update: {
          analysis_metadata?: Json | null
          area?: string | null
          audio_timestamp?: number | null
          block_id?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          detection_confidence?: number | null
          family_id?: string | null
          frame_id?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          priority?: string | null
          project_id?: string | null
          source_type?: string | null
          subcategory_id?: string | null
          title?: string
          user_id?: string | null
          visit_session_id?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_tasks_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "detected_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dsc_category_stats"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "extracted_tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_tasks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "dsc_family_stats"
            referencedColumns: ["family_id"]
          },
          {
            foreignKeyName: "extracted_tasks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "task_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_tasks_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "extracted_frames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "extracted_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "extracted_tasks_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "dsc_subcategory_stats"
            referencedColumns: ["subcategory_id"]
          },
          {
            foreignKeyName: "extracted_tasks_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "task_subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_tasks_visit_session_id_fkey"
            columns: ["visit_session_id"]
            isOneToOne: false
            referencedRelation: "visit_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ft_familles: {
        Row: {
          commentaire_type_equipe: string | null
          created_at: string
          ft_code: string
          ft_description: string | null
          ft_label: string
          id: string
          updated_at: string
        }
        Insert: {
          commentaire_type_equipe?: string | null
          created_at?: string
          ft_code: string
          ft_description?: string | null
          ft_label: string
          id?: string
          updated_at?: string
        }
        Update: {
          commentaire_type_equipe?: string | null
          created_at?: string
          ft_code?: string
          ft_description?: string | null
          ft_label?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      generated_tasks: {
        Row: {
          confidence: number | null
          context_used: Json | null
          created_at: string
          id: string
          is_validated: boolean | null
          model_used: string | null
          problem_id: string
          project_id: string
          tasks_json: Json
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          confidence?: number | null
          context_used?: Json | null
          created_at?: string
          id?: string
          is_validated?: boolean | null
          model_used?: string | null
          problem_id: string
          project_id: string
          tasks_json?: Json
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          confidence?: number | null
          context_used?: Json | null
          created_at?: string
          id?: string
          is_validated?: boolean | null
          model_used?: string | null
          problem_id?: string
          project_id?: string
          tasks_json?: Json
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_tasks_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "identified_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_tasks_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["probleme_id"]
          },
          {
            foreignKeyName: "generated_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "generated_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
        ]
      }
      identified_problems: {
        Row: {
          ai_detected: boolean | null
          cout_estime_max: number | null
          cout_estime_min: number | null
          created_at: string
          date_constatation: string | null
          description: string | null
          detection_confidence: number | null
          dimensions: Json | null
          id: string
          is_confirmed: boolean | null
          is_resolved: boolean | null
          location_id: string | null
          origine: string | null
          photo_urls: Json | null
          position_x: number | null
          position_y: number | null
          project_id: string
          recommandations: string | null
          sequence_id: string | null
          severity: string | null
          title: string
          updated_at: string
          urgence: string | null
          video_timestamp_end: number | null
          video_timestamp_start: number | null
          zone_id: string | null
          zone_type: Database["public"]["Enums"]["zone_type"] | null
        }
        Insert: {
          ai_detected?: boolean | null
          cout_estime_max?: number | null
          cout_estime_min?: number | null
          created_at?: string
          date_constatation?: string | null
          description?: string | null
          detection_confidence?: number | null
          dimensions?: Json | null
          id?: string
          is_confirmed?: boolean | null
          is_resolved?: boolean | null
          location_id?: string | null
          origine?: string | null
          photo_urls?: Json | null
          position_x?: number | null
          position_y?: number | null
          project_id: string
          recommandations?: string | null
          sequence_id?: string | null
          severity?: string | null
          title: string
          updated_at?: string
          urgence?: string | null
          video_timestamp_end?: number | null
          video_timestamp_start?: number | null
          zone_id?: string | null
          zone_type?: Database["public"]["Enums"]["zone_type"] | null
        }
        Update: {
          ai_detected?: boolean | null
          cout_estime_max?: number | null
          cout_estime_min?: number | null
          created_at?: string
          date_constatation?: string | null
          description?: string | null
          detection_confidence?: number | null
          dimensions?: Json | null
          id?: string
          is_confirmed?: boolean | null
          is_resolved?: boolean | null
          location_id?: string | null
          origine?: string | null
          photo_urls?: Json | null
          position_x?: number | null
          position_y?: number | null
          project_id?: string
          recommandations?: string | null
          sequence_id?: string | null
          severity?: string | null
          title?: string
          updated_at?: string
          urgence?: string | null
          video_timestamp_end?: number | null
          video_timestamp_start?: number | null
          zone_id?: string | null
          zone_type?: Database["public"]["Enums"]["zone_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "identified_problems_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "property_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identified_problems_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["lieu_id"]
          },
          {
            foreignKeyName: "identified_problems_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["lieu_id"]
          },
          {
            foreignKeyName: "identified_problems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identified_problems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "identified_problems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "identified_problems_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["sequence_id"]
          },
          {
            foreignKeyName: "identified_problems_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "visit_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identified_problems_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "location_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identified_problems_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["zone_id"]
          },
        ]
      }
      import_progress: {
        Row: {
          categories_count: number | null
          created_at: string
          error_message: string | null
          families_count: number | null
          id: string
          processed_rows: number
          progress_percentage: number
          status: string
          subcategories_count: number | null
          tasks_count: number | null
          total_rows: number
          updated_at: string
          user_id: string
        }
        Insert: {
          categories_count?: number | null
          created_at?: string
          error_message?: string | null
          families_count?: number | null
          id?: string
          processed_rows?: number
          progress_percentage?: number
          status?: string
          subcategories_count?: number | null
          tasks_count?: number | null
          total_rows: number
          updated_at?: string
          user_id: string
        }
        Update: {
          categories_count?: number | null
          created_at?: string
          error_message?: string | null
          families_count?: number | null
          id?: string
          processed_rows?: number
          progress_percentage?: number
          status?: string
          subcategories_count?: number | null
          tasks_count?: number | null
          total_rows?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      location_zones: {
        Row: {
          condition: Database["public"]["Enums"]["condition_state"] | null
          created_at: string
          custom_name: string | null
          hauteur_m: number | null
          id: string
          largeur_m: number | null
          location_id: string
          longueur_m: number | null
          materiaux_detectes: Json | null
          mesures_ar: Json | null
          notes: string | null
          order_index: number | null
          pathologies_detectees: Json | null
          position_dans_lieu: string | null
          project_id: string
          surface_m2: number | null
          updated_at: string
          zone_type: Database["public"]["Enums"]["zone_type"]
        }
        Insert: {
          condition?: Database["public"]["Enums"]["condition_state"] | null
          created_at?: string
          custom_name?: string | null
          hauteur_m?: number | null
          id?: string
          largeur_m?: number | null
          location_id: string
          longueur_m?: number | null
          materiaux_detectes?: Json | null
          mesures_ar?: Json | null
          notes?: string | null
          order_index?: number | null
          pathologies_detectees?: Json | null
          position_dans_lieu?: string | null
          project_id: string
          surface_m2?: number | null
          updated_at?: string
          zone_type: Database["public"]["Enums"]["zone_type"]
        }
        Update: {
          condition?: Database["public"]["Enums"]["condition_state"] | null
          created_at?: string
          custom_name?: string | null
          hauteur_m?: number | null
          id?: string
          largeur_m?: number | null
          location_id?: string
          longueur_m?: number | null
          materiaux_detectes?: Json | null
          mesures_ar?: Json | null
          notes?: string | null
          order_index?: number | null
          pathologies_detectees?: Json | null
          position_dans_lieu?: string | null
          project_id?: string
          surface_m2?: number | null
          updated_at?: string
          zone_type?: Database["public"]["Enums"]["zone_type"]
        }
        Relationships: [
          {
            foreignKeyName: "location_zones_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "property_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_zones_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["lieu_id"]
          },
          {
            foreignKeyName: "location_zones_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["lieu_id"]
          },
          {
            foreignKeyName: "location_zones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_zones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "location_zones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
        ]
      }
      myaladin_conversations: {
        Row: {
          context_data: Json | null
          context_type: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context_data?: Json | null
          context_type?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context_data?: Json | null
          context_type?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      myaladin_expertise_logs: {
        Row: {
          confidence_score: number | null
          conversation_id: string
          created_at: string
          id: string
          query_context: Json
          query_type: string
          response_data: Json
          user_feedback: string | null
        }
        Insert: {
          confidence_score?: number | null
          conversation_id: string
          created_at?: string
          id?: string
          query_context: Json
          query_type: string
          response_data: Json
          user_feedback?: string | null
        }
        Update: {
          confidence_score?: number | null
          conversation_id?: string
          created_at?: string
          id?: string
          query_context?: Json
          query_type?: string
          response_data?: Json
          user_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "myaladin_expertise_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "myaladin_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      myaladin_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "myaladin_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "myaladin_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      myaladin_preferences: {
        Row: {
          accent_color: string | null
          clock_display_mode: string
          contextual_tips_enabled: boolean
          created_at: string
          custom_logo_url: string | null
          id: string
          primary_color: string | null
          timezone: string
          tip_frequency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          clock_display_mode?: string
          contextual_tips_enabled?: boolean
          created_at?: string
          custom_logo_url?: string | null
          id?: string
          primary_color?: string | null
          timezone?: string
          tip_frequency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          clock_display_mode?: string
          contextual_tips_enabled?: boolean
          created_at?: string
          custom_logo_url?: string | null
          id?: string
          primary_color?: string | null
          timezone?: string
          tip_frequency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prediction_strategies: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          last_optimization_at: string | null
          name: string
          previous_performance: Json | null
          rollback_threshold: number | null
          strategy_config: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_optimization_at?: string | null
          name: string
          previous_performance?: Json | null
          rollback_threshold?: number | null
          strategy_config: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_optimization_at?: string | null
          name?: string
          previous_performance?: Json | null
          rollback_threshold?: number | null
          strategy_config?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      problem_tasks: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          assigned_to_role: string | null
          category_id: string | null
          classification_confidence: number | null
          completed_at: string | null
          condition: Database["public"]["Enums"]["condition_state"] | null
          corps_metier: string | null
          created_at: string
          delai_estime_jours: number | null
          description: string | null
          difficulte: string | null
          due_date: string | null
          estimated_cost_max: number | null
          estimated_cost_min: number | null
          etat_validation: string | null
          family_id: string | null
          id: string
          location_id: string | null
          notes_validation: string | null
          ordre_execution: number | null
          part_id: string | null
          photo_urls: Json | null
          priority: string | null
          problem_id: string
          project_id: string
          quantity: number | null
          status: string | null
          subcategory_id: string | null
          title: string
          unit: string | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          work_type: string | null
          zone_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          assigned_to_role?: string | null
          category_id?: string | null
          classification_confidence?: number | null
          completed_at?: string | null
          condition?: Database["public"]["Enums"]["condition_state"] | null
          corps_metier?: string | null
          created_at?: string
          delai_estime_jours?: number | null
          description?: string | null
          difficulte?: string | null
          due_date?: string | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          etat_validation?: string | null
          family_id?: string | null
          id?: string
          location_id?: string | null
          notes_validation?: string | null
          ordre_execution?: number | null
          part_id?: string | null
          photo_urls?: Json | null
          priority?: string | null
          problem_id: string
          project_id: string
          quantity?: number | null
          status?: string | null
          subcategory_id?: string | null
          title: string
          unit?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          work_type?: string | null
          zone_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          assigned_to_role?: string | null
          category_id?: string | null
          classification_confidence?: number | null
          completed_at?: string | null
          condition?: Database["public"]["Enums"]["condition_state"] | null
          corps_metier?: string | null
          created_at?: string
          delai_estime_jours?: number | null
          description?: string | null
          difficulte?: string | null
          due_date?: string | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          etat_validation?: string | null
          family_id?: string | null
          id?: string
          location_id?: string | null
          notes_validation?: string | null
          ordre_execution?: number | null
          part_id?: string | null
          photo_urls?: Json | null
          priority?: string | null
          problem_id?: string
          project_id?: string
          quantity?: number | null
          status?: string | null
          subcategory_id?: string | null
          title?: string
          unit?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          work_type?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "problem_tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dsc_category_stats"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "problem_tasks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_tasks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "dsc_family_stats"
            referencedColumns: ["family_id"]
          },
          {
            foreignKeyName: "problem_tasks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "task_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "property_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["lieu_id"]
          },
          {
            foreignKeyName: "problem_tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["lieu_id"]
          },
          {
            foreignKeyName: "problem_tasks_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "property_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_tasks_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["partie_id"]
          },
          {
            foreignKeyName: "problem_tasks_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["partie_id"]
          },
          {
            foreignKeyName: "problem_tasks_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "identified_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_tasks_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["probleme_id"]
          },
          {
            foreignKeyName: "problem_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "problem_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "problem_tasks_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "dsc_subcategory_stats"
            referencedColumns: ["subcategory_id"]
          },
          {
            foreignKeyName: "problem_tasks_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "task_subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_tasks_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "location_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_tasks_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["zone_id"]
          },
        ]
      }
      project_client_access: {
        Row: {
          access_type: string
          granted_at: string
          granted_by: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          access_type?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          access_type?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_client_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_client_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "project_client_access_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
        ]
      }
      project_versions: {
        Row: {
          change_description: string | null
          created_at: string
          created_by: string
          id: string
          project_id: string
          snapshot_data: Json
          version_number: number
        }
        Insert: {
          change_description?: string | null
          created_at?: string
          created_by: string
          id?: string
          project_id: string
          snapshot_data: Json
          version_number: number
        }
        Update: {
          change_description?: string | null
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string
          snapshot_data?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
        ]
      }
      projects: {
        Row: {
          additional_info: string | null
          address: string
          archived: boolean
          city: string | null
          created_at: string
          has_box: boolean | null
          has_garage: boolean | null
          has_parking: boolean | null
          id: string
          last_used_template_id: string | null
          number_of_units: number | null
          pdf_files: Json | null
          postal_code: string | null
          project_documents: Json | null
          property_type: string
          template_data: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_info?: string | null
          address: string
          archived?: boolean
          city?: string | null
          created_at?: string
          has_box?: boolean | null
          has_garage?: boolean | null
          has_parking?: boolean | null
          id?: string
          last_used_template_id?: string | null
          number_of_units?: number | null
          pdf_files?: Json | null
          postal_code?: string | null
          project_documents?: Json | null
          property_type: string
          template_data?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_info?: string | null
          address?: string
          archived?: boolean
          city?: string | null
          created_at?: string
          has_box?: boolean | null
          has_garage?: boolean | null
          has_parking?: boolean | null
          id?: string
          last_used_template_id?: string | null
          number_of_units?: number | null
          pdf_files?: Json | null
          postal_code?: string | null
          project_documents?: Json | null
          property_type?: string
          template_data?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_last_used_template_id_fkey"
            columns: ["last_used_template_id"]
            isOneToOne: false
            referencedRelation: "custom_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      property_composition: {
        Row: {
          acces_handicapes: boolean | null
          ai_suggested_structure: Json | null
          building_type: string | null
          building_year: number | null
          constraints: string | null
          contexte_historique: string | null
          created_at: string
          date_construction: string | null
          diagnostics_existants: Json | null
          history_notes: string | null
          id: string
          known_issues: string | null
          metadata: Json | null
          nb_apartments: number | null
          nb_boxes: number | null
          nb_caves: number | null
          nb_etages: number | null
          nb_facades: number | null
          nb_garages: number | null
          nb_gardens: number | null
          nb_locaux_techniques: number | null
          nb_parking_spots: number | null
          nb_staircases: number | null
          nom_bien: string | null
          previous_works: string | null
          project_id: string
          sinistres_precedents: string | null
          surface_totale_m2: number | null
          technical_characteristics: Json | null
          total_floors: number | null
          travaux_anterieurs_detail: Json | null
          type_bien: string | null
          type_chauffage: string | null
          type_ventilation: string | null
          updated_at: string
        }
        Insert: {
          acces_handicapes?: boolean | null
          ai_suggested_structure?: Json | null
          building_type?: string | null
          building_year?: number | null
          constraints?: string | null
          contexte_historique?: string | null
          created_at?: string
          date_construction?: string | null
          diagnostics_existants?: Json | null
          history_notes?: string | null
          id?: string
          known_issues?: string | null
          metadata?: Json | null
          nb_apartments?: number | null
          nb_boxes?: number | null
          nb_caves?: number | null
          nb_etages?: number | null
          nb_facades?: number | null
          nb_garages?: number | null
          nb_gardens?: number | null
          nb_locaux_techniques?: number | null
          nb_parking_spots?: number | null
          nb_staircases?: number | null
          nom_bien?: string | null
          previous_works?: string | null
          project_id: string
          sinistres_precedents?: string | null
          surface_totale_m2?: number | null
          technical_characteristics?: Json | null
          total_floors?: number | null
          travaux_anterieurs_detail?: Json | null
          type_bien?: string | null
          type_chauffage?: string | null
          type_ventilation?: string | null
          updated_at?: string
        }
        Update: {
          acces_handicapes?: boolean | null
          ai_suggested_structure?: Json | null
          building_type?: string | null
          building_year?: number | null
          constraints?: string | null
          contexte_historique?: string | null
          created_at?: string
          date_construction?: string | null
          diagnostics_existants?: Json | null
          history_notes?: string | null
          id?: string
          known_issues?: string | null
          metadata?: Json | null
          nb_apartments?: number | null
          nb_boxes?: number | null
          nb_caves?: number | null
          nb_etages?: number | null
          nb_facades?: number | null
          nb_garages?: number | null
          nb_gardens?: number | null
          nb_locaux_techniques?: number | null
          nb_parking_spots?: number | null
          nb_staircases?: number | null
          nom_bien?: string | null
          previous_works?: string | null
          project_id?: string
          sinistres_precedents?: string | null
          surface_totale_m2?: number | null
          technical_characteristics?: Json | null
          total_floors?: number | null
          travaux_anterieurs_detail?: Json | null
          type_bien?: string | null
          type_chauffage?: string | null
          type_ventilation?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_composition_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_composition_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "property_composition_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
        ]
      }
      property_enrichment_snapshots: {
        Row: {
          address_input: string
          address_normalized: string | null
          ai_confidence: number | null
          ai_summary_json: Json | null
          altitude: number | null
          cadastre_geom: Json | null
          cadastre_parcelle: string | null
          cadastre_section: string | null
          cadastre_surface_m2: number | null
          city: string | null
          climate_json: Json | null
          code_insee: string | null
          country: string | null
          created_at: string
          district_json: Json | null
          id: string
          imagery_json: Json | null
          latitude: number | null
          longitude: number | null
          market_json: Json | null
          owners_json: Json | null
          postal_code: string | null
          project_id: string | null
          risks_json: Json | null
          source_status_json: Json | null
          updated_at: string
          urbanism_json: Json | null
        }
        Insert: {
          address_input: string
          address_normalized?: string | null
          ai_confidence?: number | null
          ai_summary_json?: Json | null
          altitude?: number | null
          cadastre_geom?: Json | null
          cadastre_parcelle?: string | null
          cadastre_section?: string | null
          cadastre_surface_m2?: number | null
          city?: string | null
          climate_json?: Json | null
          code_insee?: string | null
          country?: string | null
          created_at?: string
          district_json?: Json | null
          id?: string
          imagery_json?: Json | null
          latitude?: number | null
          longitude?: number | null
          market_json?: Json | null
          owners_json?: Json | null
          postal_code?: string | null
          project_id?: string | null
          risks_json?: Json | null
          source_status_json?: Json | null
          updated_at?: string
          urbanism_json?: Json | null
        }
        Update: {
          address_input?: string
          address_normalized?: string | null
          ai_confidence?: number | null
          ai_summary_json?: Json | null
          altitude?: number | null
          cadastre_geom?: Json | null
          cadastre_parcelle?: string | null
          cadastre_section?: string | null
          cadastre_surface_m2?: number | null
          city?: string | null
          climate_json?: Json | null
          code_insee?: string | null
          country?: string | null
          created_at?: string
          district_json?: Json | null
          id?: string
          imagery_json?: Json | null
          latitude?: number | null
          longitude?: number | null
          market_json?: Json | null
          owners_json?: Json | null
          postal_code?: string | null
          project_id?: string | null
          risks_json?: Json | null
          source_status_json?: Json | null
          updated_at?: string
          urbanism_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "property_enrichment_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_enrichment_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "property_enrichment_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
        ]
      }
      property_locations: {
        Row: {
          created_at: string
          dernier_etat_date: string | null
          description: string | null
          etage: number | null
          floor_level: string | null
          id: string
          locataire: string | null
          location_type: string | null
          metadata: Json | null
          name: string
          numero_lot: string | null
          occupation_status: string | null
          order_index: number | null
          overall_condition:
            | Database["public"]["Enums"]["condition_state"]
            | null
          part_id: string
          photos_reference: Json | null
          pieces_json: string | null
          project_id: string
          proprietaire: string | null
          surface_m2: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dernier_etat_date?: string | null
          description?: string | null
          etage?: number | null
          floor_level?: string | null
          id?: string
          locataire?: string | null
          location_type?: string | null
          metadata?: Json | null
          name: string
          numero_lot?: string | null
          occupation_status?: string | null
          order_index?: number | null
          overall_condition?:
            | Database["public"]["Enums"]["condition_state"]
            | null
          part_id: string
          photos_reference?: Json | null
          pieces_json?: string | null
          project_id: string
          proprietaire?: string | null
          surface_m2?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dernier_etat_date?: string | null
          description?: string | null
          etage?: number | null
          floor_level?: string | null
          id?: string
          locataire?: string | null
          location_type?: string | null
          metadata?: Json | null
          name?: string
          numero_lot?: string | null
          occupation_status?: string | null
          order_index?: number | null
          overall_condition?:
            | Database["public"]["Enums"]["condition_state"]
            | null
          part_id?: string
          photos_reference?: Json | null
          pieces_json?: string | null
          project_id?: string
          proprietaire?: string | null
          surface_m2?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_locations_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "property_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_locations_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["partie_id"]
          },
          {
            foreignKeyName: "property_locations_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["partie_id"]
          },
          {
            foreignKeyName: "property_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "property_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
        ]
      }
      property_parts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number | null
          part_type: Database["public"]["Enums"]["property_part_type"]
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number | null
          part_type: Database["public"]["Enums"]["property_part_type"]
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number | null
          part_type?: Database["public"]["Enums"]["property_part_type"]
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_parts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_parts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "property_parts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      sc_sous_categories: {
        Row: {
          contexte: Json | null
          corps_metier: string | null
          created_at: string
          ct_code: string
          ft_code: string
          id: string
          keywords_ia: string | null
          phase_chantier: string | null
          pieces_typiques: Json | null
          sc_code: string
          sc_label: string
          updated_at: string
          zone_type: string | null
        }
        Insert: {
          contexte?: Json | null
          corps_metier?: string | null
          created_at?: string
          ct_code: string
          ft_code: string
          id?: string
          keywords_ia?: string | null
          phase_chantier?: string | null
          pieces_typiques?: Json | null
          sc_code: string
          sc_label: string
          updated_at?: string
          zone_type?: string | null
        }
        Update: {
          contexte?: Json | null
          corps_metier?: string | null
          created_at?: string
          ct_code?: string
          ft_code?: string
          id?: string
          keywords_ia?: string | null
          phase_chantier?: string | null
          pieces_typiques?: Json | null
          sc_code?: string
          sc_label?: string
          updated_at?: string
          zone_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sc_sous_categories_ct_code_fkey"
            columns: ["ct_code"]
            isOneToOne: false
            referencedRelation: "ct_categories"
            referencedColumns: ["ct_code"]
          },
          {
            foreignKeyName: "sc_sous_categories_ft_code_fkey"
            columns: ["ft_code"]
            isOneToOne: false
            referencedRelation: "ft_familles"
            referencedColumns: ["ft_code"]
          },
        ]
      }
      strategy_performance_metrics: {
        Row: {
          accepted_predictions: number
          avg_confidence: number | null
          avg_time_to_decision: number | null
          id: string
          last_updated: string | null
          strategy_id: string | null
          total_predictions: number
        }
        Insert: {
          accepted_predictions?: number
          avg_confidence?: number | null
          avg_time_to_decision?: number | null
          id?: string
          last_updated?: string | null
          strategy_id?: string | null
          total_predictions?: number
        }
        Update: {
          accepted_predictions?: number
          avg_confidence?: number | null
          avg_time_to_decision?: number | null
          id?: string
          last_updated?: string | null
          strategy_id?: string | null
          total_predictions?: number
        }
        Relationships: [
          {
            foreignKeyName: "strategy_performance_metrics_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "prediction_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      t_taches: {
        Row: {
          commentaire_type_equipe: string | null
          controle_qualite: string | null
          created_at: string
          ct_code: string
          description_detaillee: string | null
          ft_code: string
          id: string
          normes_references: string | null
          rendement_h_par_unite: number | null
          sc_code: string
          t_code: string
          t_label: string
          unite: string | null
          updated_at: string
        }
        Insert: {
          commentaire_type_equipe?: string | null
          controle_qualite?: string | null
          created_at?: string
          ct_code: string
          description_detaillee?: string | null
          ft_code: string
          id?: string
          normes_references?: string | null
          rendement_h_par_unite?: number | null
          sc_code: string
          t_code: string
          t_label: string
          unite?: string | null
          updated_at?: string
        }
        Update: {
          commentaire_type_equipe?: string | null
          controle_qualite?: string | null
          created_at?: string
          ct_code?: string
          description_detaillee?: string | null
          ft_code?: string
          id?: string
          normes_references?: string | null
          rendement_h_par_unite?: number | null
          sc_code?: string
          t_code?: string
          t_label?: string
          unite?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "t_taches_ct_code_fkey"
            columns: ["ct_code"]
            isOneToOne: false
            referencedRelation: "ct_categories"
            referencedColumns: ["ct_code"]
          },
          {
            foreignKeyName: "t_taches_ft_code_fkey"
            columns: ["ft_code"]
            isOneToOne: false
            referencedRelation: "ft_familles"
            referencedColumns: ["ft_code"]
          },
          {
            foreignKeyName: "t_taches_sc_code_fkey"
            columns: ["sc_code"]
            isOneToOne: false
            referencedRelation: "sc_sous_categories"
            referencedColumns: ["sc_code"]
          },
        ]
      }
      task_categories: {
        Row: {
          code: string
          created_at: string | null
          family_id: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          family_id: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          family_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_categories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "dsc_family_stats"
            referencedColumns: ["family_id"]
          },
          {
            foreignKeyName: "task_categories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "task_families"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_name: string
          author_type: string
          comment_text: string
          created_at: string
          id: string
          is_resolved: boolean | null
          parent_comment_id: string | null
          task_id: string
          updated_at: string
        }
        Insert: {
          author_name: string
          author_type: string
          comment_text: string
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          parent_comment_id?: string | null
          task_id: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          author_type?: string
          comment_text?: string
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          parent_comment_id?: string | null
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "extracted_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_families: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      task_photos: {
        Row: {
          comment: string | null
          id: string
          image_url: string
          task_id: string
          task_type: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          comment?: string | null
          id?: string
          image_url: string
          task_id: string
          task_type?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          comment?: string | null
          id?: string
          image_url?: string
          task_id?: string
          task_type?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      task_prediction_feedback: {
        Row: {
          accepted: boolean
          created_at: string | null
          feedback_score: number | null
          id: string
          predicted_task_data: Json
          project_id: string | null
          user_id: string
        }
        Insert: {
          accepted?: boolean
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          predicted_task_data: Json
          project_id?: string | null
          user_id: string
        }
        Update: {
          accepted?: boolean
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          predicted_task_data?: Json
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_prediction_feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_prediction_feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "task_prediction_feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
        ]
      }
      task_recommendations: {
        Row: {
          accepted_at: string | null
          based_on_task_ids: string[] | null
          confidence_score: number | null
          created_at: string
          estimated_cost_range: Json | null
          id: string
          is_accepted: boolean | null
          priority: string | null
          project_id: string
          recommendation_reason: string
          recommended_task_description: string | null
          recommended_task_title: string
        }
        Insert: {
          accepted_at?: string | null
          based_on_task_ids?: string[] | null
          confidence_score?: number | null
          created_at?: string
          estimated_cost_range?: Json | null
          id?: string
          is_accepted?: boolean | null
          priority?: string | null
          project_id: string
          recommendation_reason: string
          recommended_task_description?: string | null
          recommended_task_title: string
        }
        Update: {
          accepted_at?: string | null
          based_on_task_ids?: string[] | null
          confidence_score?: number | null
          created_at?: string
          estimated_cost_range?: Json | null
          id?: string
          is_accepted?: boolean | null
          priority?: string | null
          project_id?: string
          recommendation_reason?: string
          recommended_task_description?: string | null
          recommended_task_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "task_recommendations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
        ]
      }
      task_subcategories: {
        Row: {
          category_id: string
          code: string
          created_at: string | null
          id: string
          name: string
          task_count: number | null
        }
        Insert: {
          category_id: string
          code: string
          created_at?: string | null
          id?: string
          name: string
          task_count?: number | null
        }
        Update: {
          category_id?: string
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          task_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "task_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "dsc_category_stats"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "task_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "task_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          created_at: string
          description: string
          icon: string
          id: string
          progress: number
          target: number
          unlocked: boolean
          unlocked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          created_at?: string
          description: string
          icon: string
          id?: string
          progress?: number
          target: number
          unlocked?: boolean
          unlocked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          progress?: number
          target?: number
          unlocked?: boolean
          unlocked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_prediction_assignments: {
        Row: {
          assigned_at: string | null
          id: string
          strategy_id: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          strategy_id?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          strategy_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_prediction_assignments_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "prediction_strategies"
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
          role: Database["public"]["Enums"]["app_role"]
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
      visit_medias: {
        Row: {
          ai_analysis: Json | null
          annotations: Json | null
          caption: string | null
          created_at: string
          duration_seconds: number | null
          file_size_bytes: number | null
          filename: string | null
          id: string
          is_key_frame: boolean | null
          media_type: string
          metadata: Json | null
          problem_id: string | null
          project_id: string
          sequence_id: string | null
          thumbnail_url: string | null
          timestamp_in_sequence: number | null
          updated_at: string
          url: string
          zone_id: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          annotations?: Json | null
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          filename?: string | null
          id?: string
          is_key_frame?: boolean | null
          media_type: string
          metadata?: Json | null
          problem_id?: string | null
          project_id: string
          sequence_id?: string | null
          thumbnail_url?: string | null
          timestamp_in_sequence?: number | null
          updated_at?: string
          url: string
          zone_id?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          annotations?: Json | null
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          filename?: string | null
          id?: string
          is_key_frame?: boolean | null
          media_type?: string
          metadata?: Json | null
          problem_id?: string | null
          project_id?: string
          sequence_id?: string | null
          thumbnail_url?: string | null
          timestamp_in_sequence?: number | null
          updated_at?: string
          url?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_medias_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "identified_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_medias_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["probleme_id"]
          },
          {
            foreignKeyName: "visit_medias_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_medias_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "visit_medias_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "visit_medias_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["sequence_id"]
          },
          {
            foreignKeyName: "visit_medias_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "visit_sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_medias_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "location_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_medias_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["zone_id"]
          },
        ]
      }
      visit_sequences: {
        Row: {
          ai_analysis: Json | null
          audio_url: string | null
          commentaire_global: string | null
          conditions_visite: Json | null
          created_at: string
          description: string | null
          detected_condition:
            | Database["public"]["Enums"]["condition_state"]
            | null
          detected_zones: Database["public"]["Enums"]["zone_type"][] | null
          duration_seconds: number | null
          edl_tags: Json | null
          ended_at: string | null
          endroit_name: string | null
          gps_coordinates: Json | null
          id: string
          location_confidence: number | null
          location_id: string | null
          metadata: Json | null
          ordre_visite: number | null
          part_id: string | null
          participants: Json | null
          photos: Json | null
          project_id: string
          signature_visiteur: string | null
          started_at: string
          status: string | null
          transcription: string | null
          updated_at: string
          user_condition: Database["public"]["Enums"]["condition_state"] | null
          user_id: string
          video_url: string | null
          zone_confidence: number | null
          zone_id: string | null
          zone_type: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          audio_url?: string | null
          commentaire_global?: string | null
          conditions_visite?: Json | null
          created_at?: string
          description?: string | null
          detected_condition?:
            | Database["public"]["Enums"]["condition_state"]
            | null
          detected_zones?: Database["public"]["Enums"]["zone_type"][] | null
          duration_seconds?: number | null
          edl_tags?: Json | null
          ended_at?: string | null
          endroit_name?: string | null
          gps_coordinates?: Json | null
          id?: string
          location_confidence?: number | null
          location_id?: string | null
          metadata?: Json | null
          ordre_visite?: number | null
          part_id?: string | null
          participants?: Json | null
          photos?: Json | null
          project_id: string
          signature_visiteur?: string | null
          started_at?: string
          status?: string | null
          transcription?: string | null
          updated_at?: string
          user_condition?: Database["public"]["Enums"]["condition_state"] | null
          user_id: string
          video_url?: string | null
          zone_confidence?: number | null
          zone_id?: string | null
          zone_type?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          audio_url?: string | null
          commentaire_global?: string | null
          conditions_visite?: Json | null
          created_at?: string
          description?: string | null
          detected_condition?:
            | Database["public"]["Enums"]["condition_state"]
            | null
          detected_zones?: Database["public"]["Enums"]["zone_type"][] | null
          duration_seconds?: number | null
          edl_tags?: Json | null
          ended_at?: string | null
          endroit_name?: string | null
          gps_coordinates?: Json | null
          id?: string
          location_confidence?: number | null
          location_id?: string | null
          metadata?: Json | null
          ordre_visite?: number | null
          part_id?: string | null
          participants?: Json | null
          photos?: Json | null
          project_id?: string
          signature_visiteur?: string | null
          started_at?: string
          status?: string | null
          transcription?: string | null
          updated_at?: string
          user_condition?: Database["public"]["Enums"]["condition_state"] | null
          user_id?: string
          video_url?: string | null
          zone_confidence?: number | null
          zone_id?: string | null
          zone_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_sequences_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "property_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_sequences_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["lieu_id"]
          },
          {
            foreignKeyName: "visit_sequences_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["lieu_id"]
          },
          {
            foreignKeyName: "visit_sequences_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "property_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_sequences_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["partie_id"]
          },
          {
            foreignKeyName: "visit_sequences_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["partie_id"]
          },
          {
            foreignKeyName: "visit_sequences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_sequences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "visit_sequences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "visit_sequences_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "location_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_sequences_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["zone_id"]
          },
        ]
      }
      visit_sessions: {
        Row: {
          audio_url: string | null
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          metadata: Json | null
          project_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          project_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json | null
          project_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "taches_completes"
            referencedColumns: ["bien_id"]
          },
          {
            foreignKeyName: "visit_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "timeline_sequences"
            referencedColumns: ["bien_id"]
          },
        ]
      }
    }
    Views: {
      dsc_category_stats: {
        Row: {
          category_code: string | null
          category_id: string | null
          category_name: string | null
          exact_matches: number | null
          fallback_matches: number | null
          family_code: string | null
          family_name: string | null
          fuzzy_matches: number | null
          no_matches: number | null
          pending_reviews: number | null
          success_rate: number | null
          total_classifications: number | null
        }
        Relationships: []
      }
      dsc_classification_stats: {
        Row: {
          category_exact_matches: number | null
          category_fallback_matches: number | null
          category_fuzzy_matches: number | null
          category_no_matches: number | null
          category_success_rate: number | null
          family_exact_matches: number | null
          family_fallback_matches: number | null
          family_fuzzy_matches: number | null
          family_no_matches: number | null
          family_success_rate: number | null
          pending_reviews: number | null
          subcategory_exact_matches: number | null
          subcategory_fallback_matches: number | null
          subcategory_fuzzy_matches: number | null
          subcategory_no_matches: number | null
          subcategory_success_rate: number | null
          total_classifications: number | null
          total_reviewed: number | null
        }
        Relationships: []
      }
      dsc_family_stats: {
        Row: {
          exact_matches: number | null
          fallback_matches: number | null
          family_code: string | null
          family_id: string | null
          family_name: string | null
          fuzzy_matches: number | null
          no_matches: number | null
          pending_reviews: number | null
          success_rate: number | null
          total_classifications: number | null
        }
        Relationships: []
      }
      dsc_learning_patterns: {
        Row: {
          avg_confidence: number | null
          category_code: string | null
          category_name: string | null
          correction_count: number | null
          family_code: string | null
          family_name: string | null
          keywords_extracted: Json | null
          subcategory_code: string | null
          subcategory_name: string | null
        }
        Relationships: []
      }
      dsc_subcategory_stats: {
        Row: {
          category_code: string | null
          category_name: string | null
          exact_matches: number | null
          fallback_matches: number | null
          family_code: string | null
          family_name: string | null
          fuzzy_matches: number | null
          no_matches: number | null
          pending_reviews: number | null
          subcategory_code: string | null
          subcategory_id: string | null
          subcategory_name: string | null
          success_rate: number | null
          total_classifications: number | null
        }
        Relationships: []
      }
      taches_completes: {
        Row: {
          adresse_bien: string | null
          bien_id: string | null
          categorie_code: string | null
          categorie_nom: string | null
          corps_metier: string | null
          created_at: string | null
          description_tache: string | null
          difficulte: string | null
          estimated_cost_max: number | null
          estimated_cost_min: number | null
          etage: string | null
          etat: Database["public"]["Enums"]["condition_state"] | null
          etat_lieu: Database["public"]["Enums"]["condition_state"] | null
          etat_validation: string | null
          etat_zone: Database["public"]["Enums"]["condition_state"] | null
          famille_code: string | null
          famille_nom: string | null
          lieu_id: string | null
          mesures_ar: Json | null
          nom_lieu: string | null
          nom_partie: string | null
          nom_zone: string | null
          origine_probleme: string | null
          partie_id: string | null
          priorite: string | null
          probleme_id: string | null
          quantite: number | null
          severite_probleme: string | null
          sous_categorie_code: string | null
          sous_categorie_nom: string | null
          statut: string | null
          tache_id: string | null
          titre_probleme: string | null
          titre_tache: string | null
          type_bien: string | null
          type_lieu: string | null
          type_partie: Database["public"]["Enums"]["property_part_type"] | null
          type_travaux: string | null
          type_zone: Database["public"]["Enums"]["zone_type"] | null
          unite: string | null
          urgence: string | null
          ville: string | null
          zone_id: string | null
        }
        Relationships: []
      }
      timeline_sequences: {
        Row: {
          adresse: string | null
          bien_id: string | null
          duration_seconds: number | null
          ended_at: string | null
          etat_confirme: Database["public"]["Enums"]["condition_state"] | null
          etat_detecte: Database["public"]["Enums"]["condition_state"] | null
          lieu_id: string | null
          nb_medias: number | null
          nb_problemes: number | null
          nb_taches: number | null
          nom_lieu: string | null
          nom_partie: string | null
          ordre_visite: number | null
          partie_id: string | null
          sequence_id: string | null
          started_at: string | null
          status: string | null
          transcription: string | null
          type_lieu: string | null
          type_partie: Database["public"]["Enums"]["property_part_type"] | null
          zones_detectees: Database["public"]["Enums"]["zone_type"][] | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_current_user_as_admin: { Args: never; Returns: undefined }
      check_strategy_performance_degradation: {
        Args: {
          p_current_acceptance_rate: number
          p_monitoring_window_hours?: number
          p_strategy_id: string
        }
        Returns: boolean
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "clientASL"
      condition_state: "neuf" | "bon" | "a_refaire"
      property_part_type: "commune" | "privative"
      zone_type:
        | "murs"
        | "sol"
        | "plafond"
        | "menuiseries"
        | "electricite"
        | "plomberie"
        | "equipements"
        | "ventilation"
        | "chauffage"
        | "facade"
        | "toiture"
        | "autre"
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
      app_role: ["admin", "user", "clientASL"],
      condition_state: ["neuf", "bon", "a_refaire"],
      property_part_type: ["commune", "privative"],
      zone_type: [
        "murs",
        "sol",
        "plafond",
        "menuiseries",
        "electricite",
        "plomberie",
        "equipements",
        "ventilation",
        "chauffage",
        "facade",
        "toiture",
        "autre",
      ],
    },
  },
} as const
