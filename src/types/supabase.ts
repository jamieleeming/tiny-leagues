export type Database = {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          host_id: string
          type: 'cash' | 'tournament'
          format: 'holdem' | 'omaha'
          date_start: string
          date_end: string | null
          private: boolean
          street: string | null
          city: string
          zip: string | null
          seats: number
          buyin_min: number
          buyin_max: number
          blind_small: number
          blind_large: number
          rebuy: boolean
          note: string | null
          reserve: number
          created_at: string
          updated_at: string
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
        }
      }
      rsvp: {
        Row: {
          id: string
          game_id: string
          user_id: string
          confirmed: boolean
          created_at: string
          updated_at: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          username: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          type: 'user' | 'admin'
          created_at: string
          updated_at: string
        }
      }
    }
  }
} 