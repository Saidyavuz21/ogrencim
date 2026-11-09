// OTOMATİK ÜRETİLDİ — elle düzenlemeyin. Yenilemek için: npm run gen:types (Supabase CLI girişi gerekir)
// ya da Supabase MCP generate_typescript_types. Şema değiştikçe (yeni migration) yenilenmeli.
// Kaynak: Supabase veritabanı şeması (tablolar, fonksiyonlar).

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      access_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_kind: string
          at: string
          id: number
          school_id: string | null
          student_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_kind: string
          at?: string
          id?: never
          school_id?: string | null
          student_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_kind?: string
          at?: string
          id?: never
          school_id?: string | null
          student_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          priority: string | null
          school_id: string | null
          teacher_name: string
          title: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          priority?: string | null
          school_id?: string | null
          teacher_name: string
          title: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          priority?: string | null
          school_id?: string | null
          teacher_name?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_kind: string
          actor_student_id: string | null
          at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          row_id: string | null
          school_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_kind: string
          actor_student_id?: string | null
          at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          school_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_kind?: string
          actor_student_id?: string | null
          at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          row_id?: string | null
          school_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      board_drawings: {
        Row: {
          homework_id: string
          pages: Json
          student_id: string
          updated_at: string
        }
        Insert: {
          homework_id: string
          pages?: Json
          student_id: string
          updated_at?: string
        }
        Update: {
          homework_id?: string
          pages?: Json
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_drawings_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homeworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_drawings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      board_library_items: {
        Row: {
          category: string
          created_at: string
          elements: Json
          id: string
          name: string
          school_id: string | null
          teacher_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          category?: string
          created_at?: string
          elements: Json
          id?: string
          name: string
          school_id?: string | null
          teacher_id?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          category?: string
          created_at?: string
          elements?: Json
          id?: string
          name?: string
          school_id?: string | null
          teacher_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_library_items_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          category: string | null
          content: Json
          created_at: string
          grade: string | null
          id: string
          school_id: string | null
          subject: string | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: Json
          created_at?: string
          grade?: string | null
          id?: string
          school_id?: string | null
          subject?: string | null
          teacher_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: Json
          created_at?: string
          grade?: string | null
          id?: string
          school_id?: string | null
          subject?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boards_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      class_campuses: {
        Row: {
          campus_id: string
          class_name: string
          school_id: string
        }
        Insert: {
          campus_id: string
          class_name: string
          school_id?: string
        }
        Update: {
          campus_id?: string
          class_name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_campuses_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_campuses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      class_join_codes: {
        Row: {
          class_name: string
          code: string
          created_at: string
          school_id: string | null
          teacher_id: string
        }
        Insert: {
          class_name: string
          code: string
          created_at?: string
          school_id?: string | null
          teacher_id?: string
        }
        Update: {
          class_name?: string
          code?: string
          created_at?: string
          school_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_join_codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      class_members: {
        Row: {
          added_by: string | null
          class_name: string
          created_at: string
          school_id: string | null
          status: string
          student_id: string
        }
        Insert: {
          added_by?: string | null
          class_name: string
          created_at?: string
          school_id?: string | null
          status?: string
          student_id: string
        }
        Update: {
          added_by?: string | null
          class_name?: string
          created_at?: string
          school_id?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      content_set_items: {
        Row: {
          file_id: string
          position: number
          set_id: string
        }
        Insert: {
          file_id: string
          position?: number
          set_id: string
        }
        Update: {
          file_id?: string
          position?: number
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_set_items_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "teacher_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_set_items_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "content_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      content_sets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          school_id: string | null
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          school_id?: string | null
          teacher_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          school_id?: string | null
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_sets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_reads: {
        Row: {
          conversation_id: string
          last_read_at: string
          student_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string
          student_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_reads_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      data_requests: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: string
          note: string | null
          requester_contact: string | null
          requester_name: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          school_id: string | null
          status: string
          student_id: string | null
          student_name: string
          student_number: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          note?: string | null
          requester_contact?: string | null
          requester_name: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          school_id?: string | null
          status?: string
          student_id?: string | null
          student_name: string
          student_number?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          note?: string | null
          requester_contact?: string | null
          requester_name?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          school_id?: string | null
          status?: string
          student_id?: string | null
          student_name?: string
          student_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_students: {
        Row: {
          class_name: string | null
          data: Json
          deleted_at: string
          deleted_by: string | null
          name: string
          purge_after: string
          school_id: string | null
          student_id: string
          student_number: string
        }
        Insert: {
          class_name?: string | null
          data: Json
          deleted_at?: string
          deleted_by?: string | null
          name: string
          purge_after?: string
          school_id?: string | null
          student_id: string
          student_number: string
        }
        Update: {
          class_name?: string | null
          data?: Json
          deleted_at?: string
          deleted_by?: string | null
          name?: string
          purge_after?: string
          school_id?: string | null
          student_id?: string
          student_number?: string
        }
        Relationships: []
      }
      grades: {
        Row: {
          exam: string
          id: string
          score: number
          student_id: string
          subject: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          exam: string
          id?: string
          score: number
          student_id: string
          subject: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          exam?: string
          id?: string
          score?: number
          student_id?: string
          subject?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_boards: {
        Row: {
          content: Json
          created_at: string
          homework_id: string
          source_board_id: string | null
          title: string
        }
        Insert: {
          content: Json
          created_at?: string
          homework_id: string
          source_board_id?: string | null
          title?: string
        }
        Update: {
          content?: Json
          created_at?: string
          homework_id?: string
          source_board_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_boards_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: true
            referencedRelation: "homeworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_boards_source_board_id_fkey"
            columns: ["source_board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_checks: {
        Row: {
          awarded_points: number | null
          checked_by: string | null
          homework_id: string
          note: string | null
          score: number | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          awarded_points?: number | null
          checked_by?: string | null
          homework_id: string
          note?: string | null
          score?: number | null
          status: string
          student_id: string
          updated_at?: string
        }
        Update: {
          awarded_points?: number | null
          checked_by?: string | null
          homework_id?: string
          note?: string | null
          score?: number | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_checks_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_checks_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homeworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_checks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          created_at: string
          files: Json
          homework_id: string
          note: string | null
          status: string
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          files?: Json
          homework_id: string
          note?: string | null
          status?: string
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          files?: Json
          homework_id?: string
          note?: string | null
          status?: string
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homeworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      homeworks: {
        Row: {
          accepts_submissions: boolean
          attachments: Json
          class_name: string | null
          closed_at: string | null
          created_at: string
          description: string | null
          due_at: string | null
          due_date: string | null
          due_days: number | null
          due_time: string | null
          file_type: string | null
          file_url: string | null
          has_board: boolean
          id: string
          is_submitted: boolean | null
          points: number | null
          quiz_mode: string | null
          quiz_settled_at: string | null
          results_released: boolean
          school_id: string | null
          subject: string
          teacher_id: string | null
          teacher_name: string
          title: string
        }
        Insert: {
          accepts_submissions?: boolean
          attachments?: Json
          class_name?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          due_date?: string | null
          due_days?: number | null
          due_time?: string | null
          file_type?: string | null
          file_url?: string | null
          has_board?: boolean
          id?: string
          is_submitted?: boolean | null
          points?: number | null
          quiz_mode?: string | null
          quiz_settled_at?: string | null
          results_released?: boolean
          school_id?: string | null
          subject: string
          teacher_id?: string | null
          teacher_name: string
          title: string
        }
        Update: {
          accepts_submissions?: boolean
          attachments?: Json
          class_name?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          due_date?: string | null
          due_days?: number | null
          due_time?: string | null
          file_type?: string | null
          file_url?: string | null
          has_board?: boolean
          id?: string
          is_submitted?: boolean | null
          points?: number | null
          quiz_mode?: string | null
          quiz_settled_at?: string | null
          results_released?: boolean
          school_id?: string | null
          subject?: string
          teacher_id?: string | null
          teacher_name?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "homeworks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homeworks_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      library_items: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          mime: string
          path: string
          size: number
          tags: string[]
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mime: string
          path: string
          size: number
          tags?: string[]
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mime?: string
          path?: string
          size?: number
          tags?: string[]
          title?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          audio_duration: string | null
          content: string
          conversation_id: string
          created_at: string
          file_url: string | null
          id: string
          is_read: boolean | null
          message_type: string | null
          sender_id: string
          sender_name: string
          sender_role: string | null
        }
        Insert: {
          audio_duration?: string | null
          content: string
          conversation_id: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          sender_id: string
          sender_name: string
          sender_role?: string | null
        }
        Update: {
          audio_duration?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          sender_id?: string
          sender_name?: string
          sender_role?: string | null
        }
        Relationships: []
      }
      pin_attempts: {
        Row: {
          auth_uid: string | null
          created_at: string
          id: number
          student_number: string | null
          success: boolean
        }
        Insert: {
          auth_uid?: string | null
          created_at?: string
          id?: never
          student_number?: string | null
          success: boolean
        }
        Update: {
          auth_uid?: string | null
          created_at?: string
          id?: never
          student_number?: string | null
          success?: boolean
        }
        Relationships: []
      }
      points_history: {
        Row: {
          amount: number
          change_type: string | null
          created_at: string
          id: string
          reason: string
          student_id: string | null
          teacher_name: string
        }
        Insert: {
          amount: number
          change_type?: string | null
          created_at?: string
          id?: string
          reason: string
          student_id?: string | null
          teacher_name: string
        }
        Update: {
          amount?: number
          change_type?: string | null
          created_at?: string
          id?: string
          reason?: string
          student_id?: string | null
          teacher_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          branch: string | null
          city: string | null
          class_name: string | null
          created_at: string
          district: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          is_school_admin: boolean
          role: string
          school_id: string | null
          school_name: string | null
          verification_doc: string | null
        }
        Insert: {
          approved?: boolean
          branch?: string | null
          city?: string | null
          class_name?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          is_school_admin?: boolean
          role?: string
          school_id?: string | null
          school_name?: string | null
          verification_doc?: string | null
        }
        Update: {
          approved?: boolean
          branch?: string | null
          city?: string | null
          class_name?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          is_school_admin?: boolean
          role?: string
          school_id?: string | null
          school_name?: string | null
          verification_doc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          choice: number | null
          correct: boolean
          homework_id: string
          item_id: string
          last_try_at: string | null
          points: number
          student_id: string
          tries: number
        }
        Insert: {
          choice?: number | null
          correct?: boolean
          homework_id: string
          item_id: string
          last_try_at?: string | null
          points?: number
          student_id: string
          tries?: number
        }
        Update: {
          choice?: number | null
          correct?: boolean
          homework_id?: string
          item_id?: string
          last_try_at?: string | null
          points?: number
          student_id?: string
          tries?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_homework_id_student_id_fkey"
            columns: ["homework_id", "student_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["homework_id", "student_id"]
          },
          {
            foreignKeyName: "quiz_answers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "quiz_items"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          finished_at: string | null
          homework_id: string
          item_count: number
          score: number
          started_at: string
          student_id: string
        }
        Insert: {
          finished_at?: string | null
          homework_id: string
          item_count?: number
          score?: number
          started_at?: string
          student_id: string
        }
        Update: {
          finished_at?: string | null
          homework_id?: string
          item_count?: number
          score?: number
          started_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homeworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_items: {
        Row: {
          body: string
          choices: string[]
          correct_index: number
          explanation: string | null
          homework_id: string
          id: string
          image_path: string | null
          position: number
          source_question_id: string | null
        }
        Insert: {
          body: string
          choices: string[]
          correct_index: number
          explanation?: string | null
          homework_id: string
          id?: string
          image_path?: string | null
          position: number
          source_question_id?: string | null
        }
        Update: {
          body?: string
          choices?: string[]
          correct_index?: number
          explanation?: string | null
          homework_id?: string
          id?: string
          image_path?: string | null
          position?: number
          source_question_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_items_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homeworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_items_source_question_id_fkey"
            columns: ["source_question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          body: string
          choices: string[]
          correct_index: number
          created_at: string
          explanation: string | null
          grade: string | null
          id: string
          image_path: string | null
          school_id: string | null
          subject: string | null
          tags: string[]
          teacher_id: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          body: string
          choices: string[]
          correct_index: number
          created_at?: string
          explanation?: string | null
          grade?: string | null
          id?: string
          image_path?: string | null
          school_id?: string | null
          subject?: string | null
          tags?: string[]
          teacher_id?: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          choices?: string[]
          correct_index?: number
          created_at?: string
          explanation?: string | null
          grade?: string | null
          id?: string
          image_path?: string | null
          school_id?: string | null
          subject?: string | null
          tags?: string[]
          teacher_id?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_contests: {
        Row: {
          class_name: string
          contest_date: string
          created_at: string
          finished_at: string | null
          id: string
          school_id: string | null
          seq: number
          teacher_id: string | null
          title: string
        }
        Insert: {
          class_name: string
          contest_date?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          school_id?: string | null
          seq?: number
          teacher_id?: string | null
          title?: string
        }
        Update: {
          class_name?: string
          contest_date?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          school_id?: string | null
          seq?: number
          teacher_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_contests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_contests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_results: {
        Row: {
          contest_id: string
          late: boolean
          measured_by: string | null
          student_id: string
          updated_at: string
          words: number
        }
        Insert: {
          contest_id: string
          late?: boolean
          measured_by?: string | null
          student_id: string
          updated_at?: string
          words: number
        }
        Update: {
          contest_id?: string
          late?: boolean
          measured_by?: string | null
          student_id?: string
          updated_at?: string
          words?: number
        }
        Relationships: [
          {
            foreignKeyName: "reading_results_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "reading_contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_results_measured_by_fkey"
            columns: ["measured_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_campuses: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_campuses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          city: string
          created_at: string
          created_by: string | null
          district: string
          id: string
          name: string
          status: string
        }
        Insert: {
          city: string
          created_at?: string
          created_by?: string | null
          district: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          city?: string
          created_at?: string
          created_by?: string | null
          district?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      staff_shares: {
        Row: {
          created_at: string
          file_id: string
          id: string
          school_id: string | null
          scope: string
          shared_by: string | null
          shared_by_name: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          file_id: string
          id?: string
          school_id?: string | null
          scope: string
          shared_by?: string | null
          shared_by_name?: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          file_id?: string
          id?: string
          school_id?: string | null
          scope?: string
          shared_by?: string | null
          shared_by_name?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_shares_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "teacher_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shares_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_credentials: {
        Row: {
          failed_pin_attempts: number
          pin_enc: string | null
          pin_hash: string
          pin_locked_until: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          failed_pin_attempts?: number
          pin_enc?: string | null
          pin_hash: string
          pin_locked_until?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          failed_pin_attempts?: number
          pin_enc?: string | null
          pin_hash?: string
          pin_locked_until?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_credentials_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_sessions: {
        Row: {
          auth_uid: string
          created_at: string
          expires_at: string
          student_id: string
        }
        Insert: {
          auth_uid: string
          created_at?: string
          expires_at?: string
          student_id: string
        }
        Update: {
          auth_uid?: string
          created_at?: string
          expires_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          absence_days: number | null
          attendance_days: number | null
          avatar: string | null
          class_name: string | null
          created_at: string
          guardian_consent_at: string | null
          guardian_consent_by: string | null
          guardian_consent_version: string | null
          id: string
          minus_count: number | null
          name: string
          plus_count: number | null
          points: number | null
          school_id: string | null
          student_number: string
        }
        Insert: {
          absence_days?: number | null
          attendance_days?: number | null
          avatar?: string | null
          class_name?: string | null
          created_at?: string
          guardian_consent_at?: string | null
          guardian_consent_by?: string | null
          guardian_consent_version?: string | null
          id?: string
          minus_count?: number | null
          name: string
          plus_count?: number | null
          points?: number | null
          school_id?: string | null
          student_number: string
        }
        Update: {
          absence_days?: number | null
          attendance_days?: number | null
          avatar?: string | null
          class_name?: string | null
          created_at?: string
          guardian_consent_at?: string | null
          guardian_consent_by?: string | null
          guardian_consent_version?: string | null
          id?: string
          minus_count?: number | null
          name?: string
          plus_count?: number | null
          points?: number | null
          school_id?: string | null
          student_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_classes: {
        Row: {
          class_name: string
          created_at: string
          id: string
          teacher_id: string
        }
        Insert: {
          class_name: string
          created_at?: string
          id?: string
          teacher_id?: string
        }
        Update: {
          class_name?: string
          created_at?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_files: {
        Row: {
          created_at: string
          folder_id: string | null
          grade: string | null
          id: string
          mime: string
          name: string
          path: string
          position: number
          school_id: string | null
          size: number
          subject: string | null
          tags: string[]
          teacher_id: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          grade?: string | null
          id?: string
          mime: string
          name: string
          path: string
          position?: number
          school_id?: string | null
          size: number
          subject?: string | null
          tags?: string[]
          teacher_id?: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          grade?: string | null
          id?: string
          mime?: string
          name?: string
          path?: string
          position?: number
          school_id?: string | null
          size?: number
          subject?: string | null
          tags?: string[]
          teacher_id?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "teacher_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_files_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          teacher_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          teacher_id?: string
        }
        Relationships: []
      }
      teacher_shares: {
        Row: {
          class_name: string
          created_at: string
          file_id: string | null
          id: string
          note: string | null
          school_id: string | null
          set_id: string | null
          teacher_id: string
          teacher_name: string
        }
        Insert: {
          class_name: string
          created_at?: string
          file_id?: string | null
          id?: string
          note?: string | null
          school_id?: string | null
          set_id?: string | null
          teacher_id?: string
          teacher_name?: string
        }
        Update: {
          class_name?: string
          created_at?: string
          file_id?: string | null
          id?: string
          note?: string | null
          school_id?: string | null
          set_id?: string | null
          teacher_id?: string
          teacher_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_shares_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "teacher_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_shares_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_shares_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "content_sets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_add_school: {
        Args: { p_city: string; p_district: string; p_name: string }
        Returns: string
      }
      admin_approve_school: {
        Args: { p_name?: string; p_school_id: string }
        Returns: undefined
      }
      admin_delete_teacher: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      admin_erase_student: {
        Args: { p_request_id?: string; p_student_id: string }
        Returns: Json
      }
      admin_merge_school: {
        Args: { p_from: string; p_into: string }
        Returns: undefined
      }
      admin_set_school_admin: {
        Args: { p_profile_id: string; p_value: boolean }
        Returns: undefined
      }
      apply_homework_points: {
        Args: {
          p_delta: number
          p_homework_id: string
          p_reason: string
          p_student_id: string
        }
        Returns: undefined
      }
      board_library_school_items: {
        Args: never
        Returns: {
          author_name: string
          category: string
          elements: Json
          id: string
          name: string
          updated_at: string
        }[]
      }
      board_publish: {
        Args: { p_board: string; p_content: Json; p_hw: string }
        Returns: number
      }
      can_manage_school: { Args: { p_school: string }; Returns: boolean }
      can_read_announcement: { Args: { p_school_id: string }; Returns: boolean }
      can_read_conversation: { Args: { p_conv: string }; Returns: boolean }
      can_write_conversation: { Args: { p_conv: string }; Returns: boolean }
      class_conversation_id: {
        Args: { p_class_name: string; p_school_id: string }
        Returns: string
      }
      class_leaderboard: {
        Args: never
        Returns: {
          avatar: string
          class_name: string
          id: string
          minus_count: number
          name: string
          plus_count: number
          points: number
          student_number: string
        }[]
      }
      class_roster: {
        Args: { p_class: string }
        Returns: {
          class_name: string
          id: string
          is_member: boolean
          minus_count: number
          name: string
          plus_count: number
          points: number
          student_number: string
        }[]
      }
      create_class_code: { Args: { p_class: string }; Returns: string }
      current_student_id: { Args: never; Returns: string }
      group_read_receipts: {
        Args: { p_conv: string }
        Returns: {
          last_read_at: string
          name: string
          student_id: string
        }[]
      }
      homework_is_open: { Args: { p_homework_id: string }; Returns: boolean }
      homework_status_points: { Args: { p_status: string }; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_school_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      join_class_with_code: { Args: { p_code: string }; Returns: Json }
      log_student_access: {
        Args: { p_action: string; p_student_id: string }
        Returns: undefined
      }
      mark_group_read: { Args: { p_conv: string }; Returns: undefined }
      my_quizzes: {
        Args: never
        Returns: {
          answered: number
          finished: boolean
          homework_id: string
          percent: number
          total: number
        }[]
      }
      my_school_id: { Args: never; Returns: string }
      my_student: { Args: never; Returns: Json }
      owns_content_set: { Args: { p_set: string }; Returns: boolean }
      owns_homework: { Args: { p_homework_id: string }; Returns: boolean }
      owns_reading_contest: { Args: { p_contest_id: string }; Returns: boolean }
      quiz_add_items: {
        Args: { p_hw: string; p_question_ids: string[] }
        Returns: number
      }
      quiz_answer: {
        Args: { p_choice: number; p_hw: string; p_item: string }
        Returns: Json
      }
      quiz_finish: { Args: { p_hw: string }; Returns: undefined }
      quiz_is_open: {
        Args: { p_hw: Database["public"]["Tables"]["homeworks"]["Row"] }
        Returns: boolean
      }
      quiz_recalc: {
        Args: { p_hw: string; p_student: string }
        Returns: undefined
      }
      quiz_reveal: { Args: { p_hw: string; p_item: string }; Returns: Json }
      quiz_settle: { Args: { p_hw: string }; Returns: undefined }
      quiz_state: { Args: { p_hw: string }; Returns: Json }
      quiz_status_for: { Args: { p_percent: number }; Returns: string }
      quiz_write_check: {
        Args: { p_hw: string; p_student: string }
        Returns: undefined
      }
      reading_overview: { Args: never; Returns: Json }
      reorder_set_items: {
        Args: { p_ids: string[]; p_set: string }
        Returns: undefined
      }
      reorder_teacher_files: { Args: { p_ids: string[] }; Returns: undefined }
      reorder_teacher_folders: { Args: { p_ids: string[] }; Returns: undefined }
      save_board_drawing: {
        Args: { p_hw: string; p_pages: Json }
        Returns: string
      }
      school_classes_overview: {
        Args: never
        Returns: {
          campus_id: string
          class_name: string
          member_count: number
          student_count: number
          teachers: string[]
        }[]
      }
      set_my_verification_doc: { Args: { p_path: string }; Returns: boolean }
      staff_can_manage_student: {
        Args: { p_student_id: string }
        Returns: boolean
      }
      staff_can_read_teacher_path: {
        Args: { p_path: string }
        Returns: boolean
      }
      staff_can_see_file: { Args: { p_file: string }; Returns: boolean }
      staff_can_see_student: {
        Args: { p_student_id: string }
        Returns: boolean
      }
      staff_create_student: {
        Args: {
          p_class_name: string
          p_name: string
          p_pin: string
          p_school_id?: string
          p_student_number: string
        }
        Returns: string
      }
      staff_delete_student: {
        Args: { p_student_id: string }
        Returns: undefined
      }
      staff_deleted_students: {
        Args: never
        Returns: {
          class_name: string
          deleted_at: string
          deleted_by_name: string
          name: string
          purge_after: string
          school_id: string
          school_name: string
          student_id: string
          student_number: string
        }[]
      }
      staff_export_student: { Args: { p_student_id: string }; Returns: Json }
      staff_give_points: {
        Args: { p_delta: number; p_reason: string; p_student_id: string }
        Returns: number
      }
      staff_list_student_pins: {
        Args: { p_student_ids: string[] }
        Returns: {
          pin: string
          student_id: string
        }[]
      }
      staff_restore_student: {
        Args: { p_student_id: string }
        Returns: undefined
      }
      staff_set_guardian_consent: {
        Args: { p_given: boolean; p_student_id: string; p_version?: string }
        Returns: undefined
      }
      staff_set_student_pin: {
        Args: { p_pin: string; p_student_id: string }
        Returns: undefined
      }
      student_can_read_quiz_image: {
        Args: { p_path: string }
        Returns: boolean
      }
      student_can_read_teacher_path: {
        Args: { p_path: string }
        Returns: boolean
      }
      student_can_see_file: { Args: { p_file: string }; Returns: boolean }
      student_can_see_set: { Args: { p_set: string }; Returns: boolean }
      student_has_homework: {
        Args: { p_homework_id: string }
        Returns: boolean
      }
      student_in_class: {
        Args: { p_class: string; p_school: string }
        Returns: boolean
      }
      student_is_member: {
        Args: { p_class: string; p_school: string; p_student: string }
        Returns: boolean
      }
      student_login: {
        Args: { p_pin: string; p_school_id: string; p_student_number: string }
        Returns: Json
      }
      student_logout: { Args: never; Returns: undefined }
      student_sees_share: {
        Args: { p_class: string; p_school: string }
        Returns: boolean
      }
      teacher_file_quota: { Args: never; Returns: number }
      teacher_has_class: { Args: { p_class: string }; Returns: boolean }
      teacher_storage_used: { Args: never; Returns: number }
      try_uuid: { Args: { p: string }; Returns: string }
      update_my_profile: {
        Args: { p_branch: string; p_full_name: string }
        Returns: undefined
      }
      verify_my_pin: { Args: { p_pin: string }; Returns: Json }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
