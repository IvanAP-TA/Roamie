// Generated from the Supabase schema: run `npm run types` after changing a migration. Do not edit by hand.

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
      availability: {
        Row: {
          day: string
          status: string
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          day: string
          status: string
          trip_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          day?: string
          status?: string
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          done: boolean
          done_at: string | null
          id: string
          kind: string
          title: string
          trip_id: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          done?: boolean
          done_at?: string | null
          id?: string
          kind?: string
          title: string
          trip_id: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          done?: boolean
          done_at?: string | null
          id?: string
          kind?: string
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          destination_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          destination_id: string
          id?: string
          user_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          destination_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_reasons: {
        Row: {
          created_at: string
          destination_id: string
          id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_id: string
          id?: string
          text: string
          user_id?: string
        }
        Update: {
          created_at?: string
          destination_id?: string
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "destination_reasons_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_reasons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_reviews: {
        Row: {
          created_at: string
          destination_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_id: string
          id?: string
          rating: number
          user_id?: string
        }
        Update: {
          created_at?: string
          destination_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "destination_reviews_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destination_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          budget_level: number | null
          country: string | null
          country_code: string | null
          created_at: string
          created_by: string | null
          expectations: string | null
          id: string
          image_attribution: string | null
          image_url: string | null
          lat: number | null
          lng: number | null
          mood: string[]
          name: string
          selected_at: string | null
          status: string
          trip_id: string
          visited_at: string | null
        }
        Insert: {
          budget_level?: number | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          expectations?: string | null
          id?: string
          image_attribution?: string | null
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          mood?: string[]
          name: string
          selected_at?: string | null
          status?: string
          trip_id: string
          visited_at?: string | null
        }
        Update: {
          budget_level?: number | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          expectations?: string | null
          id?: string
          image_attribution?: string | null
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          mood?: string[]
          name?: string
          selected_at?: string | null
          status?: string
          trip_id?: string
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destinations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "destinations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          comments: boolean
          dates: boolean
          destinations: boolean
          members: boolean
          mentions: boolean
          roulette: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          comments?: boolean
          dates?: boolean
          destinations?: boolean
          members?: boolean
          mentions?: boolean
          roulette?: boolean
          updated_at?: string
          user_id?: string
        }
        Update: {
          comments?: boolean
          dates?: boolean
          destinations?: boolean
          members?: boolean
          mentions?: boolean
          roulette?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_outbox: {
        Row: {
          claimed_at: string | null
          created_at: string
          data: Json
          id: number
          kind: string
          trip_id: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          data?: Json
          id?: never
          kind: string
          trip_id?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          data?: Json
          id?: never
          kind?: string
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_outbox_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          lang: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          lang?: string
          p256dh: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          lang?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reason_likes: {
        Row: {
          created_at: string
          id: string
          reason_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reason_likes_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "destination_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reason_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roulette_spins: {
        Row: {
          created_at: string
          entries: Json
          id: string
          landing: number
          revealed_votes: boolean
          spun_by: string | null
          trip_id: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          entries: Json
          id?: string
          landing: number
          revealed_votes?: boolean
          spun_by?: string | null
          trip_id: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          entries?: Json
          id?: string
          landing?: number
          revealed_votes?: boolean
          spun_by?: string | null
          trip_id?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roulette_spins_spun_by_fkey"
            columns: ["spun_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roulette_spins_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roulette_spins_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_days: {
        Row: {
          date: string | null
          day_number: number
          id: string
          title: string | null
          trip_id: string
        }
        Insert: {
          date?: string | null
          day_number: number
          id?: string
          title?: string | null
          trip_id: string
        }
        Update: {
          date?: string | null
          day_number?: number
          id?: string
          title?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          description: string | null
          id: string
          itinerary_day_id: string
          lat: number | null
          lng: number | null
          order_index: number
          place_name: string | null
          time: string | null
          title: string
        }
        Insert: {
          description?: string | null
          id?: string
          itinerary_day_id: string
          lat?: number | null
          lng?: number | null
          order_index?: number
          place_name?: string | null
          time?: string | null
          title: string
        }
        Update: {
          description?: string | null
          id?: string
          itinerary_day_id?: string
          lat?: number | null
          lng?: number | null
          order_index?: number
          place_name?: string | null
          time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_itinerary_day_id_fkey"
            columns: ["itinerary_day_id"]
            isOneToOne: false
            referencedRelation: "itinerary_days"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_exclusions: {
        Row: {
          created_at: string
          destination_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          destination_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "passport_exclusions_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passport_exclusions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      trending_places: {
        Row: {
          chosen: number
          country: string | null
          country_code: string
          image_attribution: string | null
          image_url: string | null
          name: string
          rank: number
          refreshed_at: string
          trips: number
        }
        Insert: {
          chosen: number
          country?: string | null
          country_code: string
          image_attribution?: string | null
          image_url?: string | null
          name: string
          rank: number
          refreshed_at?: string
          trips: number
        }
        Update: {
          chosen?: number
          country?: string | null
          country_code?: string
          image_attribution?: string | null
          image_url?: string | null
          name?: string
          rank?: number
          refreshed_at?: string
          trips?: number
        }
        Relationships: []
      }
      trip_links: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          title: string
          trip_id: string
          url: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          title: string
          trip_id: string
          url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          title?: string
          trip_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_links_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          trip_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          trip_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          cover_image_attribution: string | null
          cover_image_url: string | null
          created_at: string
          date_window_end: string | null
          date_window_start: string | null
          description: string | null
          end_date: string | null
          id: string
          invite_code: string
          name: string
          owner_id: string
          public_slug: string | null
          start_date: string | null
          trip_length: number | null
          roulette_spin_at: string | null
          secret_voting: boolean
          votes_revealed_at: string | null
        }
        Insert: {
          cover_image_attribution?: string | null
          cover_image_url?: string | null
          created_at?: string
          date_window_end?: string | null
          date_window_start?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          invite_code?: string
          name: string
          owner_id?: string
          public_slug?: string | null
          start_date?: string | null
          trip_length?: number | null
          roulette_spin_at?: string | null
          secret_voting?: boolean
          votes_revealed_at?: string | null
        }
        Update: {
          cover_image_attribution?: string | null
          cover_image_url?: string | null
          created_at?: string
          date_window_end?: string | null
          date_window_start?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
          public_slug?: string | null
          start_date?: string | null
          trip_length?: number | null
          roulette_spin_at?: string | null
          secret_voting?: boolean
          votes_revealed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visited_places: {
        Row: {
          country: string | null
          country_code: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          rating: number | null
          user_id: string
          visited_on: string | null
        }
        Insert: {
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          rating?: number | null
          user_id?: string
          visited_on?: string | null
        }
        Update: {
          country?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          rating?: number | null
          user_id?: string
          visited_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visited_places_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          destination_id: string
          id: string
          points: number
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_id: string
          id?: string
          points: number
          user_id?: string
        }
        Update: {
          created_at?: string
          destination_id?: string
          id?: string
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_trip: { Args: { _trip_id: string }; Returns: boolean }
      delete_account: { Args: never; Returns: undefined }
      destination_is_visited: {
        Args: { _destination_id: string }
        Returns: boolean
      }
      destination_trip_id: {
        Args: { _destination_id: string }
        Returns: string
      }
      generate_invite_code: { Args: never; Returns: string }
      get_public_trip: { Args: { p_slug: string }; Returns: Json }
      get_trip_preview: {
        Args: { p_code: string }
        Returns: {
          cover_image_attribution: string
          cover_image_url: string
          id: string
          is_member: boolean
          member_count: number
          name: string
        }[]
      }
      is_member_of_trip: {
        Args: { _trip_id: string; _user_id: string }
        Returns: boolean
      }
      is_trip_member: { Args: { _trip_id: string }; Returns: boolean }
      is_trip_owner: { Args: { _trip_id: string }; Returns: boolean }
      itinerary_day_trip_id: { Args: { _day_id: string }; Returns: string }
      join_trip: { Args: { p_code: string }; Returns: string }
      regenerate_invite_code: { Args: { p_trip_id: string }; Returns: string }
      reset_points: {
        Args: { p_everyone?: boolean; p_trip_id: string }
        Returns: number
      }
      save_push_subscription: {
        Args: { p_auth: string; p_endpoint: string; p_lang: string; p_p256dh: string }
        Returns: undefined
      }
      reveal_votes: { Args: { p_trip_id: string }; Returns: undefined }
      set_secret_voting: {
        Args: { p_secret: boolean; p_trip_id: string }
        Returns: undefined
      }
      vote_progress: {
        Args: { p_trip_id: string }
        Returns: { done: number; members: number; voted: number }[]
      }
      schedule_roulette: {
        Args: { p_at?: string; p_trip_id: string }
        Returns: undefined
      }
      set_availability: {
        Args: { p_days: string[]; p_status?: string; p_trip_id: string }
        Returns: undefined
      }
      set_points: {
        Args: { p_destination_id: string; p_points: number }
        Returns: number
      }
      set_rating: {
        Args: { p_destination_id: string; p_rating: number }
        Returns: undefined
      }
      set_trip_public: {
        Args: { p_public: boolean; p_trip_id: string }
        Returns: string
      }
      shares_trip_with: { Args: { _user_id: string }; Returns: boolean }
      spin_roulette: { Args: { p_trip_id: string }; Returns: string }
      trip_role: { Args: { _trip_id: string }; Returns: string }
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
