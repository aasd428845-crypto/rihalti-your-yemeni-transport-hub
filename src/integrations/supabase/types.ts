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
      admin_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          data: Json | null
          id: string
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          type: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          type: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          payment_method: string | null
          payment_status: string | null
          seat_count: number
          status: string | null
          total_amount: number
          trip_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          seat_count?: number
          status?: string | null
          total_amount?: number
          trip_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          payment_method?: string | null
          payment_status?: string | null
          seat_count?: number
          status?: string | null
          total_amount?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_requests: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          reason: string | null
          refund_amount: number | null
          refund_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          reason?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          reason?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          status: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          status?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_links: {
        Row: {
          clicks: number | null
          created_at: string | null
          delivery_company_id: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          link_token: string
          merchant_name: string
          merchant_phone: string | null
        }
        Insert: {
          clicks?: number | null
          created_at?: string | null
          delivery_company_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          link_token?: string
          merchant_name: string
          merchant_phone?: string | null
        }
        Update: {
          clicks?: number | null
          created_at?: string | null
          delivery_company_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          link_token?: string
          merchant_name?: string
          merchant_phone?: string | null
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          address_name: string
          created_at: string | null
          customer_id: string
          full_address: string
          id: string
          is_default: boolean | null
          latitude: number | null
          longitude: number | null
        }
        Insert: {
          address_name: string
          created_at?: string | null
          customer_id: string
          full_address: string
          id?: string
          is_default?: boolean | null
          latitude?: number | null
          longitude?: number | null
        }
        Update: {
          address_name?: string
          created_at?: string | null
          customer_id?: string
          full_address?: string
          id?: string
          is_default?: boolean | null
          latitude?: number | null
          longitude?: number | null
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          delivery_address: string
          delivery_partner_id: string | null
          id: string
          items: Json | null
          payment_method: string | null
          restaurant_name: string | null
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id: string
          delivery_address: string
          delivery_partner_id?: string | null
          id?: string
          items?: Json | null
          payment_method?: string | null
          restaurant_name?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          delivery_address?: string
          delivery_partner_id?: string | null
          id?: string
          items?: Json | null
          payment_method?: string | null
          restaurant_name?: string | null
          status?: string
        }
        Relationships: []
      }
      delivery_orders: {
        Row: {
          assigned_at: string | null
          cancellation_reason: string | null
          created_at: string | null
          customer_address: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          delivery_company_id: string
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          estimated_delivery_time: string | null
          id: string
          items: Json
          notes: string | null
          order_type: string | null
          payment_method: string | null
          payment_status: string | null
          picked_up_at: string | null
          restaurant_id: string | null
          rider_id: string | null
          status: string | null
          subtotal: number
          tax: number | null
          total: number
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          cancellation_reason?: string | null
          created_at?: string | null
          customer_address: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          delivery_company_id: string
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          estimated_delivery_time?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          picked_up_at?: string | null
          restaurant_id?: string | null
          rider_id?: string | null
          status?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          cancellation_reason?: string | null
          created_at?: string | null
          customer_address?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          delivery_company_id?: string
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          estimated_delivery_time?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          picked_up_at?: string | null
          restaurant_id?: string | null
          rider_id?: string | null
          status?: string | null
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          role: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          role: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          role?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          id: string
          is_active: boolean | null
          name_ar: string
          name_en: string | null
          restaurant_id: string | null
          sort_order: number | null
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          name_ar: string
          name_en?: string | null
          restaurant_id?: string | null
          sort_order?: number | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          name_ar?: string
          name_en?: string | null
          restaurant_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          discounted_price: number | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name_ar: string
          name_en: string | null
          options: Json | null
          preparation_time: number | null
          price: number
          restaurant_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discounted_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name_ar: string
          name_en?: string | null
          options?: Json | null
          preparation_time?: number | null
          price: number
          restaurant_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discounted_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name_ar?: string
          name_en?: string | null
          options?: Json | null
          preparation_time?: number | null
          price?: number
          restaurant_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_tracking: {
        Row: {
          created_at: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          note: string | null
          order_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          note?: string | null
          order_id?: string | null
          status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          note?: string | null
          order_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          iban: string | null
          id: string
          is_primary: boolean | null
          partner_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string
          iban?: string | null
          id?: string
          is_primary?: boolean | null
          partner_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          iban?: string | null
          id?: string
          is_primary?: boolean | null
          partner_id?: string
        }
        Relationships: []
      }
      partner_join_requests: {
        Row: {
          address: string | null
          business_name: string
          business_type: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string | null
          delivery_company_id: string
          id: string
          notes: string | null
          status: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          business_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string | null
          delivery_company_id: string
          id?: string
          notes?: string | null
          status?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          business_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string | null
          delivery_company_id?: string
          id?: string
          notes?: string | null
          status?: string | null
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          bank_account_details: Json | null
          created_at: string
          id: string
          paid_at: string | null
          partner_id: string
          partner_role: string
          status: string
        }
        Insert: {
          amount?: number
          bank_account_details?: Json | null
          created_at?: string
          id?: string
          paid_at?: string | null
          partner_id: string
          partner_role: string
          status?: string
        }
        Update: {
          amount?: number
          bank_account_details?: Json | null
          created_at?: string
          id?: string
          paid_at?: string | null
          partner_id?: string
          partner_role?: string
          status?: string
        }
        Relationships: []
      }
      privacy_policies: {
        Row: {
          content: string
          created_at: string
          effective_date: string | null
          id: string
          role: string
          updated_at: string
          version: number
        }
        Insert: {
          content?: string
          created_at?: string
          effective_date?: string | null
          id?: string
          role: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          effective_date?: string | null
          id?: string
          role?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          address: string | null
          avatar_url: string | null
          city: string | null
          company_name: string | null
          created_at: string
          full_name: string
          id: string
          id_image_back: string | null
          id_image_front: string | null
          id_number: string | null
          is_verified: boolean | null
          license_image: string | null
          logo_url: string | null
          phone: string | null
          phone_secondary: string | null
          rejection_reason: string | null
          selfie_image: string | null
          updated_at: string
          user_id: string
          vehicle_color: string | null
          vehicle_image: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          account_status?: string | null
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
          id_image_back?: string | null
          id_image_front?: string | null
          id_number?: string | null
          is_verified?: boolean | null
          license_image?: string | null
          logo_url?: string | null
          phone?: string | null
          phone_secondary?: string | null
          rejection_reason?: string | null
          selfie_image?: string | null
          updated_at?: string
          user_id: string
          vehicle_color?: string | null
          vehicle_image?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          account_status?: string | null
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
          id_image_back?: string | null
          id_image_front?: string | null
          id_number?: string | null
          is_verified?: boolean | null
          license_image?: string | null
          logo_url?: string | null
          phone?: string | null
          phone_secondary?: string | null
          rejection_reason?: string | null
          selfie_image?: string | null
          updated_at?: string
          user_id?: string
          vehicle_color?: string | null
          vehicle_image?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      regions: {
        Row: {
          id: number
          is_active: boolean | null
          name_ar: string
          parent_id: number | null
          type: string
        }
        Insert: {
          id?: number
          is_active?: boolean | null
          name_ar: string
          parent_id?: number | null
          type: string
        }
        Update: {
          id?: number
          is_active?: boolean | null
          name_ar?: string
          parent_id?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          commission_rate: number | null
          cover_image: string | null
          created_at: string | null
          delivery_company_id: string
          id: string
          is_active: boolean | null
          location_lat: number | null
          location_lng: number | null
          logo_url: string | null
          name_ar: string
          name_en: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          commission_rate?: number | null
          cover_image?: string | null
          created_at?: string | null
          delivery_company_id: string
          id?: string
          is_active?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          logo_url?: string | null
          name_ar: string
          name_en?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          commission_rate?: number | null
          cover_image?: string | null
          created_at?: string | null
          delivery_company_id?: string
          id?: string
          is_active?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          logo_url?: string | null
          name_ar?: string
          name_en?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rider_rewards: {
        Row: {
          achieved_at: string | null
          amount: number | null
          delivery_company_id: string
          description: string | null
          id: string
          rider_id: string | null
          type: string | null
        }
        Insert: {
          achieved_at?: string | null
          amount?: number | null
          delivery_company_id: string
          description?: string | null
          id?: string
          rider_id?: string | null
          type?: string | null
        }
        Update: {
          achieved_at?: string | null
          amount?: number | null
          delivery_company_id?: string
          description?: string | null
          id?: string
          rider_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rider_rewards_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      riders: {
        Row: {
          commission_type: string | null
          commission_value: number | null
          created_at: string | null
          current_lat: number | null
          current_lng: number | null
          delivery_company_id: string
          earnings: number | null
          email: string | null
          full_name: string
          id: string
          id_number: string | null
          is_active: boolean | null
          is_online: boolean | null
          last_location_update: string | null
          phone: string
          profile_image: string | null
          rating: number | null
          total_deliveries: number | null
          updated_at: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          commission_type?: string | null
          commission_value?: number | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          delivery_company_id: string
          earnings?: number | null
          email?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          is_active?: boolean | null
          is_online?: boolean | null
          last_location_update?: string | null
          phone: string
          profile_image?: string | null
          rating?: number | null
          total_deliveries?: number | null
          updated_at?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          commission_type?: string | null
          commission_value?: number | null
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          delivery_company_id?: string
          earnings?: number | null
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          is_active?: boolean | null
          is_online?: boolean | null
          last_location_update?: string | null
          phone?: string
          profile_image?: string | null
          rating?: number | null
          total_deliveries?: number | null
          updated_at?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      shipment_requests: {
        Row: {
          admin_approved: boolean | null
          barcode: string | null
          created_at: string | null
          customer_id: string
          delivery_address: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          id: string
          images: string[] | null
          item_description: string | null
          item_dimensions: string | null
          item_weight: number | null
          payment_method: string | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          price: number | null
          recipient_name: string | null
          recipient_phone: string | null
          shipment_type: string
          status: string | null
          supplier_id: string
          supplier_priced: boolean | null
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          admin_approved?: boolean | null
          barcode?: string | null
          created_at?: string | null
          customer_id: string
          delivery_address?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          id?: string
          images?: string[] | null
          item_description?: string | null
          item_dimensions?: string | null
          item_weight?: number | null
          payment_method?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          price?: number | null
          recipient_name?: string | null
          recipient_phone?: string | null
          shipment_type: string
          status?: string | null
          supplier_id: string
          supplier_priced?: boolean | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_approved?: boolean | null
          barcode?: string | null
          created_at?: string | null
          customer_id?: string
          delivery_address?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          id?: string
          images?: string[] | null
          item_description?: string | null
          item_dimensions?: string | null
          item_weight?: number | null
          payment_method?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          price?: number | null
          recipient_name?: string | null
          recipient_phone?: string | null
          shipment_type?: string
          status?: string | null
          supplier_id?: string
          supplier_priced?: boolean | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shipments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          delivery_location: string
          description: string | null
          id: string
          payment_method: string | null
          pickup_location: string
          status: string
          supplier_id: string | null
          weight: number | null
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id: string
          delivery_location: string
          description?: string | null
          id?: string
          payment_method?: string | null
          pickup_location: string
          status?: string
          supplier_id?: string | null
          weight?: number | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          delivery_location?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          pickup_location?: string
          status?: string
          supplier_id?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      supplier_public_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          is_default: boolean | null
          supplier_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          is_default?: boolean | null
          supplier_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          is_default?: boolean | null
          supplier_id?: string
        }
        Relationships: []
      }
      supplier_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          reference_id: string | null
          supplier_id: string
          type: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          supplier_id: string
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          supplier_id?: string
          type?: string
        }
        Relationships: []
      }
      supplier_working_areas: {
        Row: {
          region_id: number
          supplier_id: string
        }
        Insert: {
          region_id: number
          supplier_id: string
        }
        Update: {
          region_id?: number
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_working_areas_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          partner_earning: number
          partner_id: string | null
          payment_method: string | null
          platform_fee: number
          reference_id: string | null
          refunded_at: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          partner_earning?: number
          partner_id?: string | null
          payment_method?: string | null
          platform_fee?: number
          reference_id?: string | null
          refunded_at?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          partner_earning?: number
          partner_id?: string | null
          payment_method?: string | null
          platform_fee?: number
          reference_id?: string | null
          refunded_at?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_types: {
        Row: {
          id: number
          name_ar: string
          slug: string
        }
        Insert: {
          id?: number
          name_ar: string
          slug: string
        }
        Update: {
          id?: number
          name_ar?: string
          slug?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          amenities: Json | null
          arrival_time: string | null
          available_seats: number
          bus_company: string | null
          bus_number: string | null
          capacity: number | null
          check_in_location: string | null
          check_in_time: string | null
          created_at: string
          departure_days: string[] | null
          departure_time: string
          description: string | null
          driver_phone: string | null
          from_city: string
          from_region_id: number | null
          id: string
          image_url: string | null
          is_offer: boolean | null
          luggage_weight: string | null
          notes: string | null
          offer_type: string | null
          offer_until: string | null
          offer_value: number | null
          period: string | null
          price: number
          status: string
          supplier_id: string
          to_city: string
          to_region_id: number | null
          trip_type: string | null
          type_id: number | null
          updated_at: string
        }
        Insert: {
          amenities?: Json | null
          arrival_time?: string | null
          available_seats?: number
          bus_company?: string | null
          bus_number?: string | null
          capacity?: number | null
          check_in_location?: string | null
          check_in_time?: string | null
          created_at?: string
          departure_days?: string[] | null
          departure_time: string
          description?: string | null
          driver_phone?: string | null
          from_city: string
          from_region_id?: number | null
          id?: string
          image_url?: string | null
          is_offer?: boolean | null
          luggage_weight?: string | null
          notes?: string | null
          offer_type?: string | null
          offer_until?: string | null
          offer_value?: number | null
          period?: string | null
          price?: number
          status?: string
          supplier_id: string
          to_city: string
          to_region_id?: number | null
          trip_type?: string | null
          type_id?: number | null
          updated_at?: string
        }
        Update: {
          amenities?: Json | null
          arrival_time?: string | null
          available_seats?: number
          bus_company?: string | null
          bus_number?: string | null
          capacity?: number | null
          check_in_location?: string | null
          check_in_time?: string | null
          created_at?: string
          departure_days?: string[] | null
          departure_time?: string
          description?: string | null
          driver_phone?: string | null
          from_city?: string
          from_region_id?: number | null
          id?: string
          image_url?: string | null
          is_offer?: boolean | null
          luggage_weight?: string | null
          notes?: string | null
          offer_type?: string | null
          offer_until?: string | null
          offer_value?: number | null
          period?: string | null
          price?: number
          status?: string
          supplier_id?: string
          to_city?: string
          to_region_id?: number | null
          trip_type?: string | null
          type_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_from_region_id_fkey"
            columns: ["from_region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_to_region_id_fkey"
            columns: ["to_region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "trip_types"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "customer"
        | "supplier"
        | "delivery_company"
        | "admin"
        | "driver"
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
      app_role: ["customer", "supplier", "delivery_company", "admin", "driver"],
    },
  },
} as const
