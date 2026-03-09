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
      accounting_settings: {
        Row: {
          auto_suspend_days: number
          currency: string | null
          global_commission_booking: number
          global_commission_delivery: number
          global_commission_ride: number
          global_commission_shipment: number
          id: number
          payment_due_days: number
          updated_at: string | null
        }
        Insert: {
          auto_suspend_days?: number
          currency?: string | null
          global_commission_booking?: number
          global_commission_delivery?: number
          global_commission_ride?: number
          global_commission_shipment?: number
          id?: number
          payment_due_days?: number
          updated_at?: string | null
        }
        Update: {
          auto_suspend_days?: number
          currency?: string | null
          global_commission_booking?: number
          global_commission_delivery?: number
          global_commission_ride?: number
          global_commission_shipment?: number
          id?: number
          payment_due_days?: number
          updated_at?: string | null
        }
        Relationships: []
      }
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
      alert_history: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          id: string
          is_acknowledged: boolean | null
          message: string
          metadata: Json | null
          metric_value: number | null
          resolved_at: string | null
          rule_id: string | null
          triggered_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          id?: string
          is_acknowledged?: boolean | null
          message: string
          metadata?: Json | null
          metric_value?: number | null
          resolved_at?: string | null
          rule_id?: string | null
          triggered_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          id?: string
          is_acknowledged?: boolean | null
          message?: string
          metadata?: Json | null
          metric_value?: number | null
          resolved_at?: string | null
          rule_id?: string | null
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          condition: Json
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          notification_channels: string[] | null
          rule_name: string
          rule_type: string
          severity: string
          updated_at: string | null
        }
        Insert: {
          condition?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notification_channels?: string[] | null
          rule_name: string
          rule_type?: string
          severity?: string
          updated_at?: string | null
        }
        Update: {
          condition?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          notification_channels?: string[] | null
          rule_name?: string
          rule_type?: string
          severity?: string
          updated_at?: string | null
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
      auto_healing_logs: {
        Row: {
          action_type: string
          created_at: string | null
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          status: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          status?: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          status?: string
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
      bulk_notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string | null
          sent_at: string | null
          sent_count: number | null
          sound: string | null
          status: string | null
          target_role: string | null
          title: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string | null
          sent_at?: string | null
          sent_count?: number | null
          sound?: string | null
          status?: string | null
          target_role?: string | null
          title: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string | null
          sent_at?: string | null
          sent_count?: number | null
          sound?: string | null
          status?: string | null
          target_role?: string | null
          title?: string
        }
        Relationships: []
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
      carts: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          items: Json
          restaurant_id: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          items?: Json
          restaurant_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          items?: Json
          restaurant_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
      custom_regions: {
        Row: {
          created_at: string | null
          id: string
          name_ar: string
          parent_region_id: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name_ar: string
          parent_region_id?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name_ar?: string
          parent_region_id?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_regions_parent_region_id_fkey"
            columns: ["parent_region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_name: string
          building_number: string | null
          city: string | null
          created_at: string | null
          customer_id: string
          district: string | null
          full_address: string
          id: string
          is_default: boolean | null
          landmark: string | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          street: string | null
          updated_at: string | null
        }
        Insert: {
          address_name: string
          building_number?: string | null
          city?: string | null
          created_at?: string | null
          customer_id: string
          district?: string | null
          full_address: string
          id?: string
          is_default?: boolean | null
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Update: {
          address_name?: string
          building_number?: string | null
          city?: string | null
          created_at?: string | null
          customer_id?: string
          district?: string | null
          full_address?: string
          id?: string
          is_default?: boolean | null
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_performance_stats: {
        Row: {
          avg_response_time: number | null
          created_at: string | null
          error_count: number | null
          id: string
          new_users: number | null
          platform_commission: number | null
          stat_date: string
          total_deliveries: number | null
          total_revenue: number | null
          total_rides: number | null
          total_shipments: number | null
          total_transactions: number | null
          total_trips: number | null
          total_users: number | null
        }
        Insert: {
          avg_response_time?: number | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          new_users?: number | null
          platform_commission?: number | null
          stat_date: string
          total_deliveries?: number | null
          total_revenue?: number | null
          total_rides?: number | null
          total_shipments?: number | null
          total_transactions?: number | null
          total_trips?: number | null
          total_users?: number | null
        }
        Update: {
          avg_response_time?: number | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          new_users?: number | null
          platform_commission?: number | null
          stat_date?: string
          total_deliveries?: number | null
          total_revenue?: number | null
          total_rides?: number | null
          total_shipments?: number | null
          total_transactions?: number | null
          total_trips?: number | null
          total_users?: number | null
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
      delivery_drivers: {
        Row: {
          created_at: string | null
          current_lat: number | null
          current_lng: number | null
          delivery_company_id: string | null
          id: string
          is_approved: boolean | null
          is_online: boolean | null
          license_number: string | null
          rating: number | null
          total_deliveries: number | null
          total_earnings: number | null
          updated_at: string | null
          user_id: string
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          delivery_company_id?: string | null
          id?: string
          is_approved?: boolean | null
          is_online?: boolean | null
          license_number?: string | null
          rating?: number | null
          total_deliveries?: number | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id: string
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string | null
          current_lat?: number | null
          current_lng?: number | null
          delivery_company_id?: string | null
          id?: string
          is_approved?: boolean | null
          is_online?: boolean | null
          license_number?: string | null
          rating?: number | null
          total_deliveries?: number | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id?: string
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      delivery_orders: {
        Row: {
          assigned_at: string | null
          barcode: string | null
          cancellation_reason: string | null
          created_at: string | null
          customer_accepted: boolean | null
          customer_address: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          customer_phone_hidden: boolean | null
          delivered_at: string | null
          delivery_company_id: string
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          estimated_delivery_time: string | null
          final_price: number | null
          id: string
          items: Json
          negotiation_status: string | null
          notes: string | null
          order_type: string | null
          payment_method: string | null
          payment_status: string | null
          picked_up_at: string | null
          price_accepted_at: string | null
          price_offered_at: string | null
          proposed_price: number | null
          qr_code_url: string | null
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
          barcode?: string | null
          cancellation_reason?: string | null
          created_at?: string | null
          customer_accepted?: boolean | null
          customer_address: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          customer_phone_hidden?: boolean | null
          delivered_at?: string | null
          delivery_company_id: string
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          estimated_delivery_time?: string | null
          final_price?: number | null
          id?: string
          items?: Json
          negotiation_status?: string | null
          notes?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          picked_up_at?: string | null
          price_accepted_at?: string | null
          price_offered_at?: string | null
          proposed_price?: number | null
          qr_code_url?: string | null
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
          barcode?: string | null
          cancellation_reason?: string | null
          created_at?: string | null
          customer_accepted?: boolean | null
          customer_address?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          customer_phone_hidden?: boolean | null
          delivered_at?: string | null
          delivery_company_id?: string
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          estimated_delivery_time?: string | null
          final_price?: number | null
          id?: string
          items?: Json
          negotiation_status?: string | null
          notes?: string | null
          order_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          picked_up_at?: string | null
          price_accepted_at?: string | null
          price_offered_at?: string | null
          proposed_price?: number | null
          qr_code_url?: string | null
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
      delivery_proof: {
        Row: {
          barcode_scanned: boolean | null
          created_at: string | null
          id: string
          notes: string | null
          order_id: string
          order_type: string
          photo_url: string | null
          recipient_name: string | null
          scanned_at: string | null
          scanned_by: string | null
          signature_url: string | null
        }
        Insert: {
          barcode_scanned?: boolean | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id: string
          order_type: string
          photo_url?: string | null
          recipient_name?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          signature_url?: string | null
        }
        Update: {
          barcode_scanned?: boolean | null
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          order_type?: string
          photo_url?: string | null
          recipient_name?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          signature_url?: string | null
        }
        Relationships: []
      }
      driver_documents: {
        Row: {
          document_type: string
          document_url: string
          driver_id: string
          id: string
          is_verified: boolean | null
          uploaded_at: string | null
          verified_at: string | null
        }
        Insert: {
          document_type?: string
          document_url: string
          driver_id: string
          id?: string
          is_verified?: boolean | null
          uploaded_at?: string | null
          verified_at?: string | null
        }
        Update: {
          document_type?: string
          document_url?: string
          driver_id?: string
          id?: string
          is_verified?: boolean | null
          uploaded_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_locations: {
        Row: {
          driver_id: string
          heading: number | null
          id: string
          is_online: boolean | null
          lat: number
          lng: number
          speed: number | null
          updated_at: string | null
        }
        Insert: {
          driver_id: string
          heading?: number | null
          id?: string
          is_online?: boolean | null
          lat?: number
          lng?: number
          speed?: number | null
          updated_at?: string | null
        }
        Update: {
          driver_id?: string
          heading?: number | null
          id?: string
          is_online?: boolean | null
          lat?: number
          lng?: number
          speed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_locations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          approval_date: string | null
          bio: string | null
          created_at: string | null
          date_of_birth: string | null
          id: string
          is_approved: boolean | null
          is_online: boolean | null
          license_expiry: string | null
          license_number: string | null
          rating: number | null
          rejection_reason: string | null
          total_earnings: number | null
          total_trips: number | null
          updated_at: string | null
          user_id: string
          years_experience: number | null
        }
        Insert: {
          approval_date?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          id?: string
          is_approved?: boolean | null
          is_online?: boolean | null
          license_expiry?: string | null
          license_number?: string | null
          rating?: number | null
          rejection_reason?: string | null
          total_earnings?: number | null
          total_trips?: number | null
          updated_at?: string | null
          user_id: string
          years_experience?: number | null
        }
        Update: {
          approval_date?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          id?: string
          is_approved?: boolean | null
          is_online?: boolean | null
          license_expiry?: string | null
          license_number?: string | null
          rating?: number | null
          rejection_reason?: string | null
          total_earnings?: number | null
          total_trips?: number | null
          updated_at?: string | null
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string | null
          endpoint: string | null
          error_code: string | null
          error_message: string
          id: string
          is_resolved: boolean | null
          request_data: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint?: string | null
          error_code?: string | null
          error_message: string
          id?: string
          is_resolved?: boolean | null
          request_data?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string | null
          error_code?: string | null
          error_message?: string
          id?: string
          is_resolved?: boolean | null
          request_data?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          customer_id: string
          due_date: string | null
          id: string
          metadata: Json | null
          notes: string | null
          paid_at: string | null
          partner_bank_account: string | null
          partner_earning: number
          partner_id: string
          partner_name: string | null
          partner_phone: string | null
          payment_method: string
          payment_status: string | null
          payment_transaction_id: string | null
          platform_commission: number
          reference_id: string
          transaction_date: string | null
          transaction_time: string | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          customer_id: string
          due_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          partner_bank_account?: string | null
          partner_earning?: number
          partner_id: string
          partner_name?: string | null
          partner_phone?: string | null
          payment_method?: string
          payment_status?: string | null
          payment_transaction_id?: string | null
          platform_commission?: number
          reference_id: string
          transaction_date?: string | null
          transaction_time?: string | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          customer_id?: string
          due_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          partner_bank_account?: string | null
          partner_earning?: number
          partner_id?: string
          partner_name?: string | null
          partner_phone?: string | null
          payment_method?: string
          payment_status?: string | null
          payment_transaction_id?: string | null
          platform_commission?: number
          reference_id?: string
          transaction_date?: string | null
          transaction_time?: string | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          created_at: string | null
          file_url: string | null
          generated_by: string | null
          id: string
          period_end: string
          period_start: string
          report_type: string
          status: string
          summary: Json | null
          title: string
        }
        Insert: {
          created_at?: string | null
          file_url?: string | null
          generated_by?: string | null
          id?: string
          period_end: string
          period_start: string
          report_type?: string
          status?: string
          summary?: Json | null
          title: string
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          generated_by?: string | null
          id?: string
          period_end?: string
          period_start?: string
          report_type?: string
          status?: string
          summary?: Json | null
          title?: string
        }
        Relationships: []
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
      loyalty_points: {
        Row: {
          id: string
          points: number
          total_earned: number
          total_redeemed: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          points?: number
          total_earned?: number
          total_redeemed?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          points?: number
          total_earned?: number
          total_redeemed?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loyalty_points_history: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          points: number
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name_ar: string
          name_en: string | null
          restaurant_id: string | null
          sort_order: number | null
        }
        Insert: {
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name_ar: string
          name_en?: string | null
          restaurant_id?: string | null
          sort_order?: number | null
        }
        Update: {
          description?: string | null
          id?: string
          image_url?: string | null
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
      menu_item_options: {
        Row: {
          choices: Json | null
          created_at: string | null
          id: string
          is_required: boolean | null
          max_selections: number | null
          menu_item_id: string | null
          name_ar: string
          name_en: string | null
          option_type: string | null
        }
        Insert: {
          choices?: Json | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          max_selections?: number | null
          menu_item_id?: string | null
          name_ar: string
          name_en?: string | null
          option_type?: string | null
        }
        Update: {
          choices?: Json | null
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          max_selections?: number | null
          menu_item_id?: string | null
          name_ar?: string
          name_en?: string | null
          option_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_options_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          calories: number | null
          category_id: string | null
          created_at: string | null
          description: string | null
          discounted_price: number | null
          id: string
          image_url: string | null
          ingredients: string[] | null
          is_available: boolean | null
          is_featured: boolean | null
          is_popular: boolean | null
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
          calories?: number | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discounted_price?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_available?: boolean | null
          is_featured?: boolean | null
          is_popular?: boolean | null
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
          calories?: number | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          discounted_price?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_available?: boolean | null
          is_featured?: boolean | null
          is_popular?: boolean | null
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
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          body: string
          data: Json | null
          delivered_at: string | null
          id: string
          is_read: boolean | null
          sent_at: string | null
          sound: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body: string
          data?: Json | null
          delivered_at?: string | null
          id?: string
          is_read?: boolean | null
          sent_at?: string | null
          sound?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string
          data?: Json | null
          delivered_at?: string | null
          id?: string
          is_read?: boolean | null
          sent_at?: string | null
          sound?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string | null
          enable_push_notifications: boolean | null
          enable_sound: boolean | null
          id: string
          notification_sound: string | null
          notify_delivery_updates: boolean | null
          notify_payments: boolean | null
          notify_promotions: boolean | null
          notify_ride_requests: boolean | null
          notify_shipment_updates: boolean | null
          notify_trip_reminders: boolean | null
          updated_at: string | null
          user_id: string
          vibration_enabled: boolean | null
        }
        Insert: {
          created_at?: string | null
          enable_push_notifications?: boolean | null
          enable_sound?: boolean | null
          id?: string
          notification_sound?: string | null
          notify_delivery_updates?: boolean | null
          notify_payments?: boolean | null
          notify_promotions?: boolean | null
          notify_ride_requests?: boolean | null
          notify_shipment_updates?: boolean | null
          notify_trip_reminders?: boolean | null
          updated_at?: string | null
          user_id: string
          vibration_enabled?: boolean | null
        }
        Update: {
          created_at?: string | null
          enable_push_notifications?: boolean | null
          enable_sound?: boolean | null
          id?: string
          notification_sound?: string | null
          notify_delivery_updates?: boolean | null
          notify_payments?: boolean | null
          notify_promotions?: boolean | null
          notify_ride_requests?: boolean | null
          notify_shipment_updates?: boolean | null
          notify_trip_reminders?: boolean | null
          updated_at?: string | null
          user_id?: string
          vibration_enabled?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          notification_type: string | null
          read_at: string | null
          sent_by: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          notification_type?: string | null
          read_at?: string | null
          sent_by?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          notification_type?: string | null
          read_at?: string | null
          sent_by?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_messages: {
        Row: {
          attachment_url: string | null
          block_reason: string | null
          created_at: string | null
          id: string
          is_blocked: boolean | null
          is_read: boolean | null
          message: string
          order_id: string
          order_type: string
          sender_id: string
          sender_role: string
          type: string | null
        }
        Insert: {
          attachment_url?: string | null
          block_reason?: string | null
          created_at?: string | null
          id?: string
          is_blocked?: boolean | null
          is_read?: boolean | null
          message: string
          order_id: string
          order_type: string
          sender_id: string
          sender_role: string
          type?: string | null
        }
        Update: {
          attachment_url?: string | null
          block_reason?: string | null
          created_at?: string | null
          id?: string
          is_blocked?: boolean | null
          is_read?: boolean | null
          message?: string
          order_id?: string
          order_type?: string
          sender_id?: string
          sender_role?: string
          type?: string | null
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
      partner_commission_settings: {
        Row: {
          commission_type: string | null
          commission_value: number
          created_at: string | null
          id: string
          override_global: boolean | null
          partner_id: string
          updated_at: string | null
        }
        Insert: {
          commission_type?: string | null
          commission_value?: number
          created_at?: string | null
          id?: string
          override_global?: boolean | null
          partner_id: string
          updated_at?: string | null
        }
        Update: {
          commission_type?: string | null
          commission_value?: number
          created_at?: string | null
          id?: string
          override_global?: boolean | null
          partner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      partner_invoices: {
        Row: {
          created_at: string | null
          currency: string | null
          due_date: string
          id: string
          invoice_number: string
          net_amount: number
          notes: string | null
          paid_at: string | null
          partner_id: string
          pdf_url: string | null
          period_end: string
          period_start: string
          period_type: string | null
          status: string | null
          total_amount: number
          total_commission: number
          total_transactions: number
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          due_date: string
          id?: string
          invoice_number: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          partner_id: string
          pdf_url?: string | null
          period_end: string
          period_start: string
          period_type?: string | null
          status?: string | null
          total_amount?: number
          total_commission?: number
          total_transactions?: number
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          partner_id?: string
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          period_type?: string | null
          status?: string | null
          total_amount?: number
          total_commission?: number
          total_transactions?: number
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
      partner_price_references: {
        Row: {
          created_at: string | null
          from_city: string
          id: string
          is_active: boolean | null
          item_description: string | null
          partner_id: string
          reference_price: number
          service_type: string
          to_city: string
        }
        Insert: {
          created_at?: string | null
          from_city: string
          id?: string
          is_active?: boolean | null
          item_description?: string | null
          partner_id: string
          reference_price: number
          service_type: string
          to_city: string
        }
        Update: {
          created_at?: string | null
          from_city?: string
          id?: string
          is_active?: boolean | null
          item_description?: string | null
          partner_id?: string
          reference_price?: number
          service_type?: string
          to_city?: string
        }
        Relationships: []
      }
      partner_settings: {
        Row: {
          allow_direct_payment: boolean | null
          cash_on_delivery_enabled: boolean | null
          cash_on_ride_enabled: boolean | null
          created_at: string | null
          partner_id: string
          updated_at: string | null
        }
        Insert: {
          allow_direct_payment?: boolean | null
          cash_on_delivery_enabled?: boolean | null
          cash_on_ride_enabled?: boolean | null
          created_at?: string | null
          partner_id: string
          updated_at?: string | null
        }
        Update: {
          allow_direct_payment?: boolean | null
          cash_on_delivery_enabled?: boolean | null
          cash_on_ride_enabled?: boolean | null
          created_at?: string | null
          partner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_accounts: {
        Row: {
          account_name: string
          account_number: string
          account_type: string
          bank_name: string
          created_at: string | null
          iban: string | null
          id: string
          is_active: boolean | null
          owner_id: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          account_type: string
          bank_name: string
          created_at?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          owner_id?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          account_type?: string
          bank_name?: string
          created_at?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          owner_id?: string | null
        }
        Relationships: []
      }
      payment_logs: {
        Row: {
          amount_paid: number
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          received_by: string | null
        }
        Insert: {
          amount_paid: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          received_by?: string | null
        }
        Update: {
          amount_paid?: number
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          received_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "partner_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string | null
          entity_type: string
          id: string
          notes: string | null
          partner_id: string | null
          payment_method: string
          related_entity_id: string
          status: string | null
          transfer_receipt_url: string | null
          transfer_reference: string | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          entity_type: string
          id?: string
          notes?: string | null
          partner_id?: string | null
          payment_method: string
          related_entity_id: string
          status?: string | null
          transfer_receipt_url?: string | null
          transfer_reference?: string | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          entity_type?: string
          id?: string
          notes?: string | null
          partner_id?: string | null
          payment_method?: string
          related_entity_id?: string
          status?: string | null
          transfer_receipt_url?: string | null
          transfer_reference?: string | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
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
      platform_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string
          iban: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          notes: string | null
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string
          iban?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          notes?: string | null
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          iban?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          notes?: string | null
          swift_code?: string | null
          updated_at?: string
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
          default_address: string | null
          default_lat: number | null
          default_lng: number | null
          description: string | null
          full_name: string
          full_name_arabic: string | null
          google_id: string | null
          id: string
          id_image_back: string | null
          id_image_front: string | null
          id_number: string | null
          is_trial_active: boolean | null
          is_verified: boolean | null
          last_violation_date: string | null
          license_image: string | null
          logo_url: string | null
          onesignal_player_id: string | null
          phone: string | null
          phone_secondary: string | null
          phone_verified: boolean | null
          profile_completed: boolean | null
          rejection_reason: string | null
          selfie_image: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string
          user_id: string
          vehicle_color: string | null
          vehicle_image: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
          vehicle_type: string | null
          violations_count: number | null
        }
        Insert: {
          account_status?: string | null
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          default_address?: string | null
          default_lat?: number | null
          default_lng?: number | null
          description?: string | null
          full_name?: string
          full_name_arabic?: string | null
          google_id?: string | null
          id?: string
          id_image_back?: string | null
          id_image_front?: string | null
          id_number?: string | null
          is_trial_active?: boolean | null
          is_verified?: boolean | null
          last_violation_date?: string | null
          license_image?: string | null
          logo_url?: string | null
          onesignal_player_id?: string | null
          phone?: string | null
          phone_secondary?: string | null
          phone_verified?: boolean | null
          profile_completed?: boolean | null
          rejection_reason?: string | null
          selfie_image?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id: string
          vehicle_color?: string | null
          vehicle_image?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          violations_count?: number | null
        }
        Update: {
          account_status?: string | null
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          default_address?: string | null
          default_lat?: number | null
          default_lng?: number | null
          description?: string | null
          full_name?: string
          full_name_arabic?: string | null
          google_id?: string | null
          id?: string
          id_image_back?: string | null
          id_image_front?: string | null
          id_number?: string | null
          is_trial_active?: boolean | null
          is_verified?: boolean | null
          last_violation_date?: string | null
          license_image?: string | null
          logo_url?: string | null
          onesignal_player_id?: string | null
          phone?: string | null
          phone_secondary?: string | null
          phone_verified?: boolean | null
          profile_completed?: boolean | null
          rejection_reason?: string | null
          selfie_image?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id?: string
          vehicle_color?: string | null
          vehicle_image?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_type?: string | null
          violations_count?: number | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string | null
          delivery_company_id: string
          description: string | null
          discount_type: string | null
          discount_value: number | null
          end_date: string | null
          id: string
          is_active: boolean | null
          max_discount: number | null
          min_order_amount: number | null
          promo_code: string | null
          restaurant_id: string | null
          start_date: string | null
          title: string
          usage_count: number | null
          usage_limit: number | null
        }
        Insert: {
          created_at?: string | null
          delivery_company_id: string
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_amount?: number | null
          promo_code?: string | null
          restaurant_id?: string | null
          start_date?: string | null
          title: string
          usage_count?: number | null
          usage_limit?: number | null
        }
        Update: {
          created_at?: string | null
          delivery_company_id?: string
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_amount?: number | null
          promo_code?: string | null
          restaurant_id?: string | null
          start_date?: string | null
          title?: string
          usage_count?: number | null
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
      request_messages: {
        Row: {
          block_reason: string | null
          created_at: string | null
          id: string
          is_blocked: boolean | null
          message: string
          read_at: string | null
          request_id: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          block_reason?: string | null
          created_at?: string | null
          id?: string
          is_blocked?: boolean | null
          message: string
          read_at?: string | null
          request_id: string
          sender_id: string
          sender_role: string
        }
        Update: {
          block_reason?: string | null
          created_at?: string | null
          id?: string
          is_blocked?: boolean | null
          message?: string
          read_at?: string | null
          request_id?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_reviews: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          rating: number
          restaurant_id: string | null
          review: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          rating: number
          restaurant_id?: string | null
          review?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          rating?: number
          restaurant_id?: string | null
          review?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
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
          cuisine_type: string[] | null
          delivery_company_id: string
          delivery_fee: number | null
          description: string | null
          estimated_delivery_time: number | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          location_lat: number | null
          location_lng: number | null
          logo_url: string | null
          min_order_amount: number | null
          name_ar: string
          name_en: string | null
          opening_hours: Json | null
          phone: string | null
          rating: number | null
          total_ratings: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          commission_rate?: number | null
          cover_image?: string | null
          created_at?: string | null
          cuisine_type?: string[] | null
          delivery_company_id: string
          delivery_fee?: number | null
          description?: string | null
          estimated_delivery_time?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          logo_url?: string | null
          min_order_amount?: number | null
          name_ar: string
          name_en?: string | null
          opening_hours?: Json | null
          phone?: string | null
          rating?: number | null
          total_ratings?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          commission_rate?: number | null
          cover_image?: string | null
          created_at?: string | null
          cuisine_type?: string[] | null
          delivery_company_id?: string
          delivery_fee?: number | null
          description?: string | null
          estimated_delivery_time?: number | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          location_lat?: number | null
          location_lng?: number | null
          logo_url?: string | null
          min_order_amount?: number | null
          name_ar?: string
          name_en?: string | null
          opening_hours?: Json | null
          phone?: string | null
          rating?: number | null
          total_ratings?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          rating: number
          rating_cleanliness: number | null
          rating_communication: number | null
          rating_punctuality: number | null
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          rating: number
          rating_cleanliness?: number | null
          rating_communication?: number | null
          rating_punctuality?: number | null
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          rating?: number
          rating_cleanliness?: number | null
          rating_communication?: number | null
          rating_punctuality?: number | null
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: []
      }
      ride_requests: {
        Row: {
          assigned_at: string | null
          barcode: string | null
          cancellation_reason: string | null
          completed_at: string | null
          created_at: string | null
          customer_accepted: boolean | null
          customer_id: string
          customer_phone_hidden: boolean | null
          driver_id: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          final_price: number | null
          from_address: string | null
          from_city: string
          id: string
          negotiation_status: string | null
          notes: string | null
          passenger_count: number | null
          payment_method: string | null
          payment_status: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          price_accepted_at: string | null
          price_offered_at: string | null
          proposed_price: number | null
          qr_code_url: string | null
          ride_type: string | null
          started_at: string | null
          status: string | null
          to_address: string | null
          to_city: string
          updated_at: string | null
          waiting_time: number | null
        }
        Insert: {
          assigned_at?: string | null
          barcode?: string | null
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_accepted?: boolean | null
          customer_id: string
          customer_phone_hidden?: boolean | null
          driver_id?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          final_price?: number | null
          from_address?: string | null
          from_city: string
          id?: string
          negotiation_status?: string | null
          notes?: string | null
          passenger_count?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          price_accepted_at?: string | null
          price_offered_at?: string | null
          proposed_price?: number | null
          qr_code_url?: string | null
          ride_type?: string | null
          started_at?: string | null
          status?: string | null
          to_address?: string | null
          to_city: string
          updated_at?: string | null
          waiting_time?: number | null
        }
        Update: {
          assigned_at?: string | null
          barcode?: string | null
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_accepted?: boolean | null
          customer_id?: string
          customer_phone_hidden?: boolean | null
          driver_id?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          final_price?: number | null
          from_address?: string | null
          from_city?: string
          id?: string
          negotiation_status?: string | null
          notes?: string | null
          passenger_count?: number | null
          payment_method?: string | null
          payment_status?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          price_accepted_at?: string | null
          price_offered_at?: string | null
          proposed_price?: number | null
          qr_code_url?: string | null
          ride_type?: string | null
          started_at?: string | null
          status?: string | null
          to_address?: string | null
          to_city?: string
          updated_at?: string | null
          waiting_time?: number | null
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
      rides: {
        Row: {
          created_at: string | null
          customer_id: string
          distance_km: number | null
          driver_earning: number | null
          driver_id: string | null
          dropoff_location: string | null
          ended_at: string | null
          id: string
          pickup_location: string | null
          platform_commission: number | null
          price: number
          rating_by_customer: number | null
          rating_by_driver: number | null
          request_id: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          distance_km?: number | null
          driver_earning?: number | null
          driver_id?: string | null
          dropoff_location?: string | null
          ended_at?: string | null
          id?: string
          pickup_location?: string | null
          platform_commission?: number | null
          price?: number
          rating_by_customer?: number | null
          rating_by_driver?: number | null
          request_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          distance_km?: number | null
          driver_earning?: number | null
          driver_id?: string | null
          dropoff_location?: string | null
          ended_at?: string | null
          id?: string
          pickup_location?: string | null
          platform_commission?: number | null
          price?: number
          rating_by_customer?: number | null
          rating_by_driver?: number | null
          request_id?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "ride_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          agreed_price: number | null
          approved_at: string | null
          completed_at: string | null
          created_at: string | null
          customer_display_id: string
          customer_id: string
          description: string | null
          from_address: string | null
          from_city: string
          id: string
          notes: string | null
          partner_id: string | null
          partner_net: number | null
          partner_type: string | null
          payment_method: string | null
          payment_status: string | null
          platform_commission: number | null
          platform_commission_rate: number | null
          proposed_price: number | null
          quantity: number | null
          receiver_name: string | null
          receiver_phone: string | null
          receiver_phone_masked: string | null
          request_number: string
          status: string
          to_address: string | null
          to_city: string
          type: string
          updated_at: string | null
          whatsapp_shared: boolean | null
        }
        Insert: {
          agreed_price?: number | null
          approved_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_display_id?: string
          customer_id: string
          description?: string | null
          from_address?: string | null
          from_city: string
          id?: string
          notes?: string | null
          partner_id?: string | null
          partner_net?: number | null
          partner_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          platform_commission?: number | null
          platform_commission_rate?: number | null
          proposed_price?: number | null
          quantity?: number | null
          receiver_name?: string | null
          receiver_phone?: string | null
          receiver_phone_masked?: string | null
          request_number?: string
          status?: string
          to_address?: string | null
          to_city: string
          type: string
          updated_at?: string | null
          whatsapp_shared?: boolean | null
        }
        Update: {
          agreed_price?: number | null
          approved_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_display_id?: string
          customer_id?: string
          description?: string | null
          from_address?: string | null
          from_city?: string
          id?: string
          notes?: string | null
          partner_id?: string | null
          partner_net?: number | null
          partner_type?: string | null
          payment_method?: string | null
          payment_status?: string | null
          platform_commission?: number | null
          platform_commission_rate?: number | null
          proposed_price?: number | null
          quantity?: number | null
          receiver_name?: string | null
          receiver_phone?: string | null
          receiver_phone_masked?: string | null
          request_number?: string
          status?: string
          to_address?: string | null
          to_city?: string
          type?: string
          updated_at?: string | null
          whatsapp_shared?: boolean | null
        }
        Relationships: []
      }
      shipment_requests: {
        Row: {
          admin_approved: boolean | null
          barcode: string | null
          created_at: string | null
          customer_accepted: boolean | null
          customer_id: string
          customer_phone_hidden: boolean | null
          delivery_address: string | null
          delivery_landmark: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          final_price: number | null
          id: string
          images: string[] | null
          item_description: string | null
          item_dimensions: string | null
          item_weight: number | null
          negotiation_status: string | null
          payment_method: string | null
          pickup_address: string | null
          pickup_landmark: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          price: number | null
          price_accepted_at: string | null
          price_offered_at: string | null
          proposed_price: number | null
          qr_code_url: string | null
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
          customer_accepted?: boolean | null
          customer_id: string
          customer_phone_hidden?: boolean | null
          delivery_address?: string | null
          delivery_landmark?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          final_price?: number | null
          id?: string
          images?: string[] | null
          item_description?: string | null
          item_dimensions?: string | null
          item_weight?: number | null
          negotiation_status?: string | null
          payment_method?: string | null
          pickup_address?: string | null
          pickup_landmark?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          price?: number | null
          price_accepted_at?: string | null
          price_offered_at?: string | null
          proposed_price?: number | null
          qr_code_url?: string | null
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
          customer_accepted?: boolean | null
          customer_id?: string
          customer_phone_hidden?: boolean | null
          delivery_address?: string | null
          delivery_landmark?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          final_price?: number | null
          id?: string
          images?: string[] | null
          item_description?: string | null
          item_dimensions?: string | null
          item_weight?: number | null
          negotiation_status?: string | null
          payment_method?: string | null
          pickup_address?: string | null
          pickup_landmark?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          price?: number | null
          price_accepted_at?: string | null
          price_offered_at?: string | null
          proposed_price?: number | null
          qr_code_url?: string | null
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
      support_messages: {
        Row: {
          admin_reply: string | null
          created_at: string | null
          id: string
          message: string
          replied_at: string | null
          replied_by: string | null
          status: string | null
          user_email: string | null
          user_id: string | null
          user_name: string
          user_phone: string | null
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string | null
          id?: string
          message: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name: string
          user_phone?: string | null
        }
        Update: {
          admin_reply?: string | null
          created_at?: string | null
          id?: string
          message?: string
          replied_at?: string | null
          replied_by?: string | null
          status?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string
          user_phone?: string | null
        }
        Relationships: []
      }
      system_event_logs: {
        Row: {
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          severity: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          severity?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          severity?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          created_at: string | null
          id: string
          metric_name: string
          metric_value: number
          tags: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_name: string
          metric_value: number
          tags?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_name?: string
          metric_value?: number
          tags?: Json | null
        }
        Relationships: []
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
      vehicles: {
        Row: {
          brand: string
          color: string | null
          created_at: string | null
          driver_id: string
          id: string
          image_url: string | null
          insurance_number: string | null
          is_active: boolean | null
          is_default: boolean | null
          model: string
          plate_number: string
          vehicle_type: string
          year: number | null
        }
        Insert: {
          brand?: string
          color?: string | null
          created_at?: string | null
          driver_id: string
          id?: string
          image_url?: string | null
          insurance_number?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          model?: string
          plate_number?: string
          vehicle_type?: string
          year?: number | null
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string | null
          driver_id?: string
          id?: string
          image_url?: string | null
          insurance_number?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          model?: string
          plate_number?: string
          vehicle_type?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          expires_at: string
          id: string
          phone_number: string
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone_number: string
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone_number?: string
        }
        Relationships: []
      }
      violation_logs: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          related_entity_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string | null
          status: string | null
          user_id: string
          violation_type: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          related_entity_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string | null
          status?: string | null
          user_id: string
          violation_type?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          related_entity_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string | null
          status?: string | null
          user_id?: string
          violation_type?: string | null
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          driver_phone: string
          id: string
          message_sent: string | null
          order_id: string
          order_type: string
          partner_id: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          driver_phone: string
          id?: string
          message_sent?: string | null
          order_id: string
          order_type: string
          partner_id: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          driver_phone?: string
          id?: string
          message_sent?: string | null
          order_id?: string
          order_type?: string
          partner_id?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_loyalty_points: {
        Args: {
          _description?: string
          _points: number
          _reference_id?: string
          _reference_type?: string
          _user_id: string
        }
        Returns: undefined
      }
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
      redeem_loyalty_points: {
        Args: { _description?: string; _points: number; _user_id: string }
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
        | "delivery_driver"
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
      app_role: [
        "customer",
        "supplier",
        "delivery_company",
        "admin",
        "driver",
        "delivery_driver",
      ],
    },
  },
} as const
