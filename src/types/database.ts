/**
 * Hand-written Supabase Database types (mirrors migrations).
 * Used when local `supabase gen types` is unavailable.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      spaces: {
        Row: {
          id: string
          name: string
          slug: string | null
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['spaces']['Insert']>
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          timezone: string
          locale: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          timezone?: string
          locale?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      space_members: {
        Row: {
          id: string
          space_id: string
          user_id: string
          role: 'owner' | 'member'
          invited_by: string | null
          joined_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          space_id: string
          user_id: string
          role?: 'owner' | 'member'
          invited_by?: string | null
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['space_members']['Insert']>
        Relationships: []
      }
      devices: {
        Row: {
          id: string
          space_id: string
          user_id: string
          label: string
          platform: string | null
          user_agent: string | null
          app_version: string | null
          last_seen_at: string | null
          push_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          space_id: string
          user_id: string
          label?: string
          platform?: string | null
          user_agent?: string | null
          app_version?: string | null
          last_seen_at?: string | null
          push_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['devices']['Insert']>
        Relationships: []
      }
      entities: {
        Row: {
          id: string
          space_id: string
          entity_type: string
          title: string
          subtitle: string | null
          description: string | null
          status: string
          color: string | null
          icon: string | null
          starts_at: string | null
          ends_at: string | null
          all_day_start: string | null
          all_day_end: string | null
          cover_media_id: string | null
          parent_entity_id: string | null
          sort_order: number
          metadata: Json
          version: number
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          space_id: string
          entity_type: string
          title: string
          subtitle?: string | null
          description?: string | null
          status?: string
          color?: string | null
          icon?: string | null
          starts_at?: string | null
          ends_at?: string | null
          all_day_start?: string | null
          all_day_end?: string | null
          cover_media_id?: string | null
          parent_entity_id?: string | null
          sort_order?: number
          metadata?: Json
          version?: number
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['entities']['Insert']>
        Relationships: []
      }
      entity_details: {
        Row: {
          entity_id: string
          detail_type: string
          space_id: string
          payload: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          entity_id: string
          detail_type: string
          space_id: string
          payload?: Json
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['entity_details']['Insert']>
        Relationships: []
      }
      notes: {
        Row: {
          id: string
          space_id: string
          entity_id: string
          content: string
          content_format: 'markdown' | 'plain'
          word_count: number
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          space_id: string
          entity_id: string
          content: string
          content_format?: 'markdown' | 'plain'
          word_count?: number
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['notes']['Insert']>
        Relationships: []
      }
      checklists: {
        Row: {
          id: string
          space_id: string
          entity_id: string
          title: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          space_id: string
          entity_id: string
          title: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['checklists']['Insert']>
        Relationships: []
      }
      checklist_items: {
        Row: {
          id: string
          space_id: string
          checklist_id: string
          title: string
          is_checked: boolean
          checked_at: string | null
          checked_by: string | null
          assignee_id: string | null
          due_date: string | null
          sort_order: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          space_id: string
          checklist_id: string
          title: string
          is_checked?: boolean
          checked_at?: string | null
          checked_by?: string | null
          assignee_id?: string | null
          due_date?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['checklist_items']['Insert']>
        Relationships: []
      }
      budgets: {
        Row: {
          id: string
          space_id: string
          entity_id: string | null
          name: string
          description: string | null
          currency: string
          amount_limit: string | null
          amount_spent: string
          period_start: string | null
          period_end: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          space_id: string
          entity_id?: string | null
          name: string
          description?: string | null
          currency?: string
          amount_limit?: string | null
          amount_spent?: string
          period_start?: string | null
          period_end?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          space_id: string
          budget_id: string | null
          entity_id: string | null
          amount: string
          currency: string
          description: string
          category: string | null
          transaction_date: string
          paid_by: string | null
          is_income: boolean
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          space_id: string
          budget_id?: string | null
          entity_id?: string | null
          amount: string
          currency?: string
          description: string
          category?: string | null
          transaction_date: string
          paid_by?: string | null
          is_income?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
        Relationships: []
      }
      locations: {
        Row: {
          id: string
          space_id: string
          name: string
          address_line: string | null
          city: string | null
          country_code: string | null
          latitude: number | null
          longitude: number | null
          place_id: string | null
          metadata: Json
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          space_id: string
          name: string
          address_line?: string | null
          city?: string | null
          country_code?: string | null
          latitude?: number | null
          longitude?: number | null
          place_id?: string | null
          metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['locations']['Insert']>
        Relationships: []
      }
      entity_locations: {
        Row: {
          id: string
          space_id: string
          entity_id: string
          location_id: string
          role: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          space_id: string
          entity_id: string
          location_id: string
          role?: string
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['entity_locations']['Insert']>
        Relationships: []
      }
      media_assets: {
        Row: {
          id: string
          space_id: string
          storage_path: string
          original_filename: string | null
          mime_type: string
          byte_size: number
          width: number | null
          height: number | null
          duration_ms: number | null
          blurhash: string | null
          variant: string
          parent_media_id: string | null
          uploaded_by: string | null
          taken_at: string | null
          metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          space_id: string
          storage_path: string
          original_filename?: string | null
          mime_type: string
          byte_size: number
          width?: number | null
          height?: number | null
          duration_ms?: number | null
          blurhash?: string | null
          variant?: string
          parent_media_id?: string | null
          uploaded_by?: string | null
          taken_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['media_assets']['Insert']>
        Relationships: []
      }
      entity_media: {
        Row: {
          id: string
          space_id: string
          entity_id: string
          media_id: string
          role: string
          sort_order: number
          caption: string | null
          created_at: string
        }
        Insert: {
          id?: string
          space_id: string
          entity_id: string
          media_id: string
          role?: string
          sort_order?: number
          caption?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['entity_media']['Insert']>
        Relationships: []
      }
      timeline_entries: {
        Row: {
          id: string
          space_id: string
          entity_id: string | null
          entry_type: string
          title: string
          body: string | null
          occurred_at: string
          occurred_on: string | null
          highlight: boolean
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          space_id: string
          entity_id?: string | null
          entry_type: string
          title: string
          body?: string | null
          occurred_at: string
          occurred_on?: string | null
          highlight?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['timeline_entries']['Insert']>
        Relationships: []
      }
      reminders: {
        Row: {
          id: string
          space_id: string
          entity_id: string | null
          title: string
          body: string | null
          remind_at: string
          next_trigger_at: string | null
          timezone: string
          recurrence_rule: string | null
          is_active: boolean
          notify_push: boolean
          notify_in_app: boolean
          created_by: string | null
          assigned_to: string | null
          last_triggered_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          space_id: string
          entity_id?: string | null
          title: string
          body?: string | null
          remind_at: string
          next_trigger_at?: string | null
          timezone?: string
          recurrence_rule?: string | null
          is_active?: boolean
          notify_push?: boolean
          notify_in_app?: boolean
          created_by?: string | null
          assigned_to?: string | null
          last_triggered_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['reminders']['Insert']>
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          space_id: string
          user_id: string
          device_id: string | null
          endpoint: string
          p256dh: string
          auth_key: string
          user_agent: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          space_id: string
          user_id: string
          device_id?: string | null
          endpoint: string
          p256dh: string
          auth_key: string
          user_agent?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>
        Relationships: []
      }
      reminder_deliveries: {
        Row: {
          id: string
          space_id: string
          reminder_id: string
          push_subscription_id: string | null
          user_id: string | null
          status: 'pending' | 'sent' | 'failed' | 'skipped'
          scheduled_for: string
          sent_at: string | null
          error_message: string | null
          response_code: number | null
          created_at: string
        }
        Insert: {
          id?: string
          space_id: string
          reminder_id: string
          push_subscription_id?: string | null
          user_id?: string | null
          status?: 'pending' | 'sent' | 'failed' | 'skipped'
          scheduled_for: string
          sent_at?: string | null
          error_message?: string | null
          response_code?: number | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['reminder_deliveries']['Insert']>
        Relationships: []
      }
      widget_instances: {
        Row: {
          id: string
          space_id: string
          view_layout_id: string | null
          entity_id: string | null
          widget_type: string
          title: string | null
          config: Json
          grid_x: number
          grid_y: number
          grid_w: number
          grid_h: number
          is_visible: boolean
          sort_order: number
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          space_id: string
          view_layout_id?: string | null
          entity_id?: string | null
          widget_type: string
          title?: string | null
          config?: Json
          grid_x?: number
          grid_y?: number
          grid_w?: number
          grid_h?: number
          is_visible?: boolean
          sort_order?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['widget_instances']['Insert']>
        Relationships: []
      }
      view_layouts: {
        Row: {
          id: string
          space_id: string
          user_id: string | null
          view_key: string
          name: string | null
          layout: Json
          is_default: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          space_id: string
          user_id?: string | null
          view_key: string
          name?: string | null
          layout?: Json
          is_default?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['view_layouts']['Insert']>
        Relationships: []
      }
      entity_links: {
        Row: {
          id: string
          space_id: string
          source_entity_id: string
          target_entity_id: string
          link_type: string
          label: string | null
          metadata: Json
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          space_id: string
          source_entity_id: string
          target_entity_id: string
          link_type: string
          label?: string | null
          metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['entity_links']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
