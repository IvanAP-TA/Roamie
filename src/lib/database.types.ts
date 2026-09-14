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
      expense_lists: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          name: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name: string
          trip_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_lists_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_shares: {
        Row: {
          expense_id: string
          user_id: string
          weight: number
        }
        Insert: {
          expense_id: string
          user_id: string
          weight: number
        }
        Update: {
          expense_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_shares_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          kind: string
          list_id: string
          paid_by: string | null
          rate: number
          spent_on: string
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          id?: string
          kind?: string
          list_id: string
          paid_by?: string | null
          rate?: number
          spent_on?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          kind?: string
          list_id?: string
          paid_by?: string | null
          rate?: number
          spent_on?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "expense_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      can_manage_expense: { Args: { _expense_id: string }; Returns: boolean }
      delete_account: { Args: never; Returns: undefined }
      destination_is_visited: {
        Args: { _destination_id: string }
        Returns: boolean
      }
      destination_trip_id: {
        Args: { _destination_id: string }
        Returns: string
      }
      expense_list_trip_id: { Args: { _list_id: string }; Returns: string }
      expense_trip_id: { Args: { _expense_id: string }; Returns: string }
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
      save_expense: {
        Args: {
          p_amount: number
          p_category?: string
          p_currency: string
          p_expense_id?: string
          p_kind: string
          p_list_id: string
          p_paid_by: string
          p_rate: number
          p_shares: Json
          p_spent_on: string
          p_title: string
        }
        Returns: string
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
