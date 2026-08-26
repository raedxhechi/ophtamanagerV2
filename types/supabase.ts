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
    PostgrestVersion: "14.17"
  }
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
      doctor_office: {
        Row: {
          city: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          house_number: string | null
          id: string
          name: string
          pharmacy_id: string | null
          phone_number: string | null
          street: string | null
          updated_at: string
          zipcode: string | null
        }
        Insert: {
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          house_number?: string | null
          id?: string
          name: string
          pharmacy_id?: string | null
          phone_number?: string | null
          street?: string | null
          updated_at?: string
          zipcode?: string | null
        }
        Update: {
          city?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          house_number?: string | null
          id?: string
          name?: string
          pharmacy_id?: string | null
          phone_number?: string | null
          street?: string | null
          updated_at?: string
          zipcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_office_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_orders: {
        Row: {
          application_date: string | null
          created_at: string
          created_by: string | null
          delivery_date: string | null
          doctor_office_id: string
          id: string
          medicine_id: string | null
          quantity: number | null
          updated_at: string
        }
        Insert: {
          application_date?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          doctor_office_id?: string
          id?: string
          medicine_id?: string | null
          quantity?: number | null
          updated_at?: string
        }
        Update: {
          application_date?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          doctor_office_id?: string
          id?: string
          medicine_id?: string | null
          quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_orders_doctor_office_id_fkey"
            columns: ["doctor_office_id"]
            isOneToOne: false
            referencedRelation: "doctor_office"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_orders_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicine"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_suborders: {
        Row: {
          created_at: string
          draft_order_id: string
          id: string
          invoice_type: Database["public"]["Enums"]["invoice_types"] | null
          left_eye: boolean | null
          patient_id: string
          right_eye: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_order_id: string
          id?: string
          invoice_type?: Database["public"]["Enums"]["invoice_types"] | null
          left_eye?: boolean | null
          patient_id: string
          right_eye?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_order_id?: string
          id?: string
          invoice_type?: Database["public"]["Enums"]["invoice_types"] | null
          left_eye?: boolean | null
          patient_id?: string
          right_eye?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_suborders_draft_order_id_fkey"
            columns: ["draft_order_id"]
            isOneToOne: false
            referencedRelation: "draft_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_suborders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_companies: {
        Row: {
          created_at: string
          directus_id: number | null
          id: string
          iknumber: string | null
          insurance_type: Database["public"]["Enums"]["insurance_type"]
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          directus_id?: number | null
          id?: string
          iknumber?: string | null
          insurance_type: Database["public"]["Enums"]["insurance_type"]
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          directus_id?: number | null
          id?: string
          iknumber?: string | null
          insurance_type?: Database["public"]["Enums"]["insurance_type"]
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      insurance_policy: {
        Row: {
          created_at: string
          doctor_office_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_office_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_office_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policy_doctor_office_id_fkey"
            columns: ["doctor_office_id"]
            isOneToOne: false
            referencedRelation: "doctor_office"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_policy_insurance_companies: {
        Row: {
          insurance_company_id: string
          insurance_policy_id: string
        }
        Insert: {
          insurance_company_id: string
          insurance_policy_id: string
        }
        Update: {
          insurance_company_id?: string
          insurance_policy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policy_insurance_companies_insurance_company_id_fkey"
            columns: ["insurance_company_id"]
            isOneToOne: false
            referencedRelation: "insurance_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policy_insurance_companies_insurance_policy_id_fkey"
            columns: ["insurance_policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policy"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_policy_medicines: {
        Row: {
          insurance_policy_id: string
          medicine_id: string
        }
        Insert: {
          insurance_policy_id: string
          medicine_id: string
        }
        Update: {
          insurance_policy_id?: string
          medicine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_policy_medicines_insurance_policy_id_fkey"
            columns: ["insurance_policy_id"]
            isOneToOne: false
            referencedRelation: "insurance_policy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_policy_medicines_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicine"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine: {
        Row: {
          background_color: string | null
          created_at: string
          directus_id: number | null
          id: string
          medicine_type: Database["public"]["Enums"]["medicine_type"]
          name: string
          text_color: string | null
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          created_at?: string
          directus_id?: number | null
          id?: string
          medicine_type: Database["public"]["Enums"]["medicine_type"]
          name: string
          text_color?: string | null
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          created_at?: string
          directus_id?: number | null
          id?: string
          medicine_type?: Database["public"]["Enums"]["medicine_type"]
          name?: string
          text_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          application_date: string | null
          created_at: string
          created_by: string | null
          delivery_date: string | null
          directus_id: number | null
          doctor_office_id: string
          id: string
          medicine_id: string
          quantity: number
          search_text: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          updated_at: string
        }
        Insert: {
          application_date?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          directus_id?: number | null
          doctor_office_id?: string
          id?: string
          medicine_id: string
          quantity: number
          search_text?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          updated_at?: string
        }
        Update: {
          application_date?: string | null
          created_at?: string
          created_by?: string | null
          delivery_date?: string | null
          directus_id?: number | null
          doctor_office_id?: string
          id?: string
          medicine_id?: string
          quantity?: number
          search_text?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_doctor_office_id_fkey"
            columns: ["doctor_office_id"]
            isOneToOne: false
            referencedRelation: "doctor_office"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicine"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          city: string | null
          created_at: string
          date_of_birth: string
          directus_id: number | null
          doctor_office_id: string
          first_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          house_number: string | null
          id: string
          insurance_company_id: string | null
          insurance_number: string | null
          last_name: string
          search_text: string | null
          street: string | null
          updated_at: string
          zipcode: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          date_of_birth: string
          directus_id?: number | null
          doctor_office_id: string
          first_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          house_number?: string | null
          id?: string
          insurance_company_id?: string | null
          insurance_number?: string | null
          last_name: string
          search_text?: string | null
          street?: string | null
          updated_at?: string
          zipcode?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          date_of_birth?: string
          directus_id?: number | null
          doctor_office_id?: string
          first_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          house_number?: string | null
          id?: string
          insurance_company_id?: string | null
          insurance_number?: string | null
          last_name?: string
          search_text?: string | null
          street?: string | null
          updated_at?: string
          zipcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_doctor_office_id_fkey"
            columns: ["doctor_office_id"]
            isOneToOne: false
            referencedRelation: "doctor_office"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_insurance_company_id_fkey"
            columns: ["insurance_company_id"]
            isOneToOne: false
            referencedRelation: "insurance_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacies: {
        Row: {
          city: string | null
          contact_email: string | null
          contact_person: string | null
          created_at: string
          default_pharmacy: boolean
          house_number: string | null
          id: string
          name: string
          phone_number: string | null
          street: string | null
          updated_at: string
          zipcode: string | null
        }
        Insert: {
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string
          default_pharmacy?: boolean
          house_number?: string | null
          id?: string
          name: string
          phone_number?: string | null
          street?: string | null
          updated_at?: string
          zipcode?: string | null
        }
        Update: {
          city?: string | null
          contact_email?: string | null
          contact_person?: string | null
          created_at?: string
          default_pharmacy?: boolean
          house_number?: string | null
          id?: string
          name?: string
          phone_number?: string | null
          street?: string | null
          updated_at?: string
          zipcode?: string | null
        }
        Relationships: []
      }
      suborders: {
        Row: {
          created_at: string
          directus_id: number | null
          id: string
          invoice_type: Database["public"]["Enums"]["invoice_types"] | null
          left_eye: boolean
          order_id: string
          patient_id: string
          right_eye: boolean
          search_text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          directus_id?: number | null
          id?: string
          invoice_type?: Database["public"]["Enums"]["invoice_types"] | null
          left_eye?: boolean
          order_id: string
          patient_id: string
          right_eye?: boolean
          search_text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          directus_id?: number | null
          id?: string
          invoice_type?: Database["public"]["Enums"]["invoice_types"] | null
          left_eye?: boolean
          order_id?: string
          patient_id?: string
          right_eye?: boolean
          search_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suborders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suborders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          action: string
          actor_verified: boolean
          client_event_id: string
          doctor_office_id: string | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          id: number
          ip: string | null
          metadata: Json | null
          method: string | null
          occurred_at: string
          ok: boolean
          path: string | null
          queued: boolean
          received_at: string
          source: string
          status: number | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          action: string
          actor_verified?: boolean
          client_event_id: string
          doctor_office_id?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: never
          ip?: string | null
          metadata?: Json | null
          method?: string | null
          occurred_at?: string
          ok: boolean
          path?: string | null
          queued?: boolean
          received_at?: string
          source: string
          status?: number | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          action?: string
          actor_verified?: boolean
          client_event_id?: string
          doctor_office_id?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: never
          ip?: string | null
          metadata?: Json | null
          method?: string | null
          occurred_at?: string
          ok?: boolean
          path?: string | null
          queued?: boolean
          received_at?: string
          source?: string
          status?: number | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_doctor_office_id_fkey"
            columns: ["doctor_office_id"]
            isOneToOne: false
            referencedRelation: "doctor_office"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_data"
            referencedColumns: ["id"]
          },
        ]
      }
      user_data: {
        Row: {
          created_at: string
          doctor_office_id: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_office_id?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_office_id?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_data_doctor_office_id_fkey"
            columns: ["doctor_office_id"]
            isOneToOne: false
            referencedRelation: "doctor_office"
            referencedColumns: ["id"]
          },
        ]
      }
      user_office_access: {
        Row: {
          created_at: string
          doctor_office_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doctor_office_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          doctor_office_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_office_access_doctor_office_id_fkey"
            columns: ["doctor_office_id"]
            isOneToOne: false
            referencedRelation: "doctor_office"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_office_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_data"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          admin_orders_settings: Json | null
          admin_patients_settings: Json | null
          created_at: string
          orders_table_settings: Json | null
          patient_table_settings: Json | null
          selected_doctor_office: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_orders_settings?: Json | null
          admin_patients_settings?: Json | null
          created_at?: string
          orders_table_settings?: Json | null
          patient_table_settings?: Json | null
          selected_doctor_office?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          admin_orders_settings?: Json | null
          admin_patients_settings?: Json | null
          created_at?: string
          orders_table_settings?: Json | null
          patient_table_settings?: Json | null
          selected_doctor_office?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_selected_doctor_office_fkey"
            columns: ["selected_doctor_office"]
            isOneToOne: false
            referencedRelation: "doctor_office"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_data"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_office_id: { Args: never; Returns: string }
      current_office_ids: { Args: never; Returns: string[] }
      current_pharmacy_id: { Args: never; Returns: string }
      delete_app_user: { Args: { p_user: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      orders_build_search_text: {
        Args: { o: Database["public"]["Tables"]["orders"]["Row"] }
        Returns: string
      }
      patients_build_search_text: {
        Args: { p: Database["public"]["Tables"]["patients"]["Row"] }
        Returns: string
      }
      prune_system_logs: { Args: { p_retain?: string }; Returns: number }
      set_active_office: { Args: { p_office: string }; Returns: undefined }
      suborders_build_search_text: {
        Args: { s: Database["public"]["Tables"]["suborders"]["Row"] }
        Returns: string
      }
      system_logs_facets: {
        Args: {
          p_action?: string
          p_office?: string
          p_search?: string
          p_status?: number
          p_user?: string
        }
        Returns: Json
      }
    }
    Enums: {
      gender: "male" | "female" | "other"
      insurance_type: "Privat" | "Gesetzlich"
      invoice_types: "Praxis" | "Kasse" | "Patient"
      medicine_type: "Rezeptur" | "Fertigarzneimittel"
      order_status: "pending" | "processing" | "ready" | "delivered"
      user_role: "admin" | "doctor" | "manager" | "assistant" | "pharmacist"
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
      gender: ["male", "female", "other"],
      insurance_type: ["Privat", "Gesetzlich"],
      invoice_types: ["Praxis", "Kasse", "Patient"],
      medicine_type: ["Rezeptur", "Fertigarzneimittel"],
      order_status: ["pending", "processing", "ready", "delivered"],
      user_role: ["admin", "doctor", "manager", "assistant", "pharmacist"],
    },
  },
} as const
