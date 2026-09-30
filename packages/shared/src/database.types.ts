// ---------------------------------------------------------------------------
// GENERADO AUTOMATICAMENTE desde el schema de Supabase (proyecto tico-app).
// No editar a mano. Regenerar con `pnpm db:types` (Supabase CLI) o con el
// MCP `generate_typescript_types` tras cada migracion.
// ---------------------------------------------------------------------------

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          administrative_division_id: string | null
          country_id: string
          created_at: string
          formatted_address: string | null
          id: string
          latitude: number | null
          location: unknown
          longitude: number | null
          place_id: string | null
          postal_code: string | null
          reference: string | null
          updated_at: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          administrative_division_id?: string | null
          country_id: string
          created_at?: string
          formatted_address?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          place_id?: string | null
          postal_code?: string | null
          reference?: string | null
          updated_at?: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          administrative_division_id?: string | null
          country_id?: string
          created_at?: string
          formatted_address?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          place_id?: string | null
          postal_code?: string | null
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_administrative_division_id_fkey"
            columns: ["administrative_division_id"]
            isOneToOne: false
            referencedRelation: "administrative_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      administrative_divisions: {
        Row: {
          code: string | null
          country_id: string
          created_at: string
          id: string
          is_active: boolean
          level: number
          name: string
          parent_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          country_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          level: number
          name: string
          parent_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          country_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          level?: number
          name?: string
          parent_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "administrative_divisions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "administrative_divisions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "administrative_divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          business_id: string
          client_id: string
          created_at: string
          duration_minutes: number | null
          employee_id: string | null
          id: string
          notes: string | null
          scheduled_at: string
          service_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          client_id: string
          created_at?: string
          duration_minutes?: number | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          scheduled_at: string
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          client_id?: string
          created_at?: string
          duration_minutes?: number | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          scheduled_at?: string
          service_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          business_id: string
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          business_id: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          business_id?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          close_time: string | null
          created_at: string
          day_of_week: number | null
          exception_date: string | null
          id: string
          is_closed: boolean
          open_time: string | null
        }
        Insert: {
          business_id: string
          close_time?: string | null
          created_at?: string
          day_of_week?: number | null
          exception_date?: string | null
          id?: string
          is_closed?: boolean
          open_time?: string | null
        }
        Update: {
          business_id?: string
          close_time?: string | null
          created_at?: string
          day_of_week?: number | null
          exception_date?: string | null
          id?: string
          is_closed?: boolean
          open_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_modules: {
        Row: {
          business_id: string
          created_at: string
          enabled: boolean
          id: string
          module_name: string
          settings: Json
        }
        Insert: {
          business_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          module_name: string
          settings?: Json
        }
        Update: {
          business_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          module_name?: string
          settings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "business_modules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_translations: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          language_code: string
          name: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          language_code: string
          name?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          language_code?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_translations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_gallery: {
        Row: {
          business_id: string
          created_at: string
          id: string
          image_url: string
          sort_order: number
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_gallery_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_users: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          permissions: string[]
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          permissions?: string[]
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          permissions?: string[]
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          default_language: string
          id: string
          is_active: boolean
          name: string
          native_name: string
          phone_code: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code: string
          default_language?: string
          id?: string
          is_active?: boolean
          name: string
          native_name: string
          phone_code: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          default_language?: string
          id?: string
          is_active?: boolean
          name?: string
          native_name?: string
          phone_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      country_administrative_levels: {
        Row: {
          country_id: string
          id: string
          label: string
          level: number
          type: string
        }
        Insert: {
          country_id: string
          id?: string
          label: string
          level: number
          type: string
        }
        Update: {
          country_id?: string
          id?: string
          label?: string
          level?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_administrative_levels_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      business_chain_admins: {
        Row: {
          chain_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          chain_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          chain_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_chain_admins_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "business_chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_chain_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_chains: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_chains_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          address_id: string | null
          banner_url: string | null
          canton: string | null
          category: string
          chain_id: string | null
          chat_retention_days: number
          created_at: string
          delivery_cost: number | null
          delivery_radius_km: number | null
          description: string | null
          district: string | null
          email: string | null
          facebook_url: string | null
          iban: string | null
          id: string
          instagram_url: string | null
          is_active: boolean
          is_draft: boolean
          latitude: number | null
          location: unknown
          logo_url: string | null
          longitude: number | null
          name: string
          offers_delivery: boolean
          owner_id: string
          payment_card: boolean
          payment_cash: boolean
          payment_iban: boolean
          payment_sinpe: boolean
          phone: string | null
          province: string | null
          sinpe_holder: string | null
          sinpe_phone: string | null
          slug: string
          tagline: string | null
          tiktok_url: string | null
          updated_at: string
          website: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          address_id?: string | null
          banner_url?: string | null
          canton?: string | null
          category: string
          chain_id?: string | null
          chat_retention_days?: number
          created_at?: string
          delivery_cost?: number | null
          delivery_radius_km?: number | null
          description?: string | null
          district?: string | null
          email?: string | null
          facebook_url?: string | null
          iban?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          is_draft?: boolean
          latitude?: number | null
          location?: unknown
          logo_url?: string | null
          longitude?: number | null
          name: string
          offers_delivery?: boolean
          owner_id: string
          payment_card?: boolean
          payment_cash?: boolean
          payment_iban?: boolean
          payment_sinpe?: boolean
          phone?: string | null
          province?: string | null
          sinpe_holder?: string | null
          sinpe_phone?: string | null
          slug?: string
          tagline?: string | null
          tiktok_url?: string | null
          updated_at?: string
          website?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          address_id?: string | null
          banner_url?: string | null
          canton?: string | null
          category?: string
          chain_id?: string | null
          chat_retention_days?: number
          created_at?: string
          delivery_cost?: number | null
          delivery_radius_km?: number | null
          description?: string | null
          district?: string | null
          email?: string | null
          facebook_url?: string | null
          iban?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          is_draft?: boolean
          latitude?: number | null
          location?: unknown
          logo_url?: string | null
          longitude?: number | null
          name?: string
          offers_delivery?: boolean
          owner_id?: string
          payment_card?: boolean
          payment_cash?: boolean
          payment_iban?: boolean
          payment_sinpe?: boolean
          phone?: string | null
          province?: string | null
          sinpe_holder?: string | null
          sinpe_phone?: string | null
          slug?: string
          tagline?: string | null
          tiktok_url?: string | null
          updated_at?: string
          website?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "business_chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assignee_id: string | null
          business_id: string
          created_at: string
          customer_id: string
          id: string
          last_at: string
          last_text: string
          status: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          business_id: string
          created_at?: string
          customer_id: string
          id?: string
          last_at?: string
          last_text?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          business_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          last_at?: string
          last_text?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          location_text: string | null
          rsvp_enabled: boolean
          starts_at: string
          title: string
          updated_at: string
          whatsapp_enabled: boolean
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          location_text?: string | null
          rsvp_enabled?: boolean
          starts_at: string
          title: string
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          location_text?: string | null
          rsvp_enabled?: boolean
          starts_at?: string
          title?: string
          updated_at?: string
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          section: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price: number
          section?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          section?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menus_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          business_id: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string | null
          sender_id: string
          text: string
          updated_at: string
        }
        Insert: {
          business_id: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string | null
          sender_id: string
          text: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string | null
          sender_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          business_id: string
          business_name: string
          conversation_id: string
          created_at: string
          customer_id: string
          decided_at: string | null
          fulfillment_stage: string | null
          id: string
          lines: Json
          message_id: string
          pickup_code: string | null
          pickup_code_hash: string | null
          pickup_code_issued_at: string | null
          pickup_verify_attempts: number
          stage_updated_at: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          business_id: string
          business_name: string
          conversation_id: string
          created_at?: string
          customer_id: string
          decided_at?: string | null
          fulfillment_stage?: string | null
          id?: string
          lines: Json
          message_id: string
          pickup_code?: string | null
          pickup_code_hash?: string | null
          pickup_code_issued_at?: string | null
          pickup_verify_attempts?: number
          stage_updated_at?: string | null
          status?: string
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          business_name?: string
          conversation_id?: string
          created_at?: string
          customer_id?: string
          decided_at?: string | null
          fulfillment_stage?: string | null
          id?: string
          lines?: Json
          message_id?: string
          pickup_code?: string | null
          pickup_code_hash?: string | null
          pickup_code_issued_at?: string | null
          pickup_verify_attempts?: number
          stage_updated_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          module: string
          name: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          module: string
          name: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          name?: string
        }
        Relationships: []
      }
      product_translations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          language_code: string
          name: string | null
          product_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          language_code: string
          name?: string | null
          product_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          language_code?: string
          name?: string | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          business_id: string
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          stock: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price: number
          stock?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          stock?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          business_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          business_id: string
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          preferred_language: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          preferred_language?: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          preferred_language?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_businesses_nearby: {
        Args: {
          lat: number
          lng: number
          radius_m?: number
          lim?: number
        }
        Returns: {
          id: string
          slug: string
          name: string
          category: string
          address: string | null
          latitude: number | null
          longitude: number | null
          distance_m: number
        }[]
      }
      search_businesses: {
        Args: {
          q?: string | null
          categories?: string[] | null
          lat?: number | null
          lng?: number | null
          radius_km?: number | null
          lim?: number | null
          cursor_distance?: number | null
          cursor_name?: string | null
          cursor_id?: string | null
          provinces?: string[] | null
        }
        Returns: {
          id: string
          slug: string
          name: string
          description: string | null
          category: string
          address: string | null
          whatsapp_number: string | null
          logo_url: string | null
          banner_url: string | null
          latitude: number | null
          longitude: number | null
          distance_m: number | null
        }[]
      }
      list_my_conversations: {
        Args: Record<string, never>
        Returns: {
          id: string
          business_id: string
          business_name: string
          business_slug: string
          customer_id: string
          customer_name: string | null
          assignee_id: string | null
          assignee_name: string | null
          status: string
          last_text: string
          last_at: string
          unread_count: number
          viewer_role: string
        }[]
      }
      purge_expired_messages: {
        Args: Record<string, never>
        Returns: number
      }
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
