export type UserType = 'admin' | 'user' // Changed to lowercase to match database enum
export type GameType = 'cash' | 'tournament' // These are correct
export type GameFormat = 'holdem' | 'omaha' // Updated to match database enum values
export type PaymentType = 'venmo' | 'zelle' // Update PaymentType to match database values
export type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type SettlementType = 'centralized' | 'decentralized'

export interface User {
  id: string
  created_at: string
  updated_at: string
  policy: boolean | null
  type: UserType | null
  username: string | null
  password: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: number | null
}

export interface Game {
  id: string
  host_id: string
  type: GameType
  format: GameFormat
  settlement_type: SettlementType
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
  status: GameStatus
  // Joined fields
  host?: {
    username: string | null
    first_name: string | null
    last_name: string | null
    email: string | null
    phone: string | null
  }
}

export interface RSVP {
  id: string
  game_id: string
  user_id: string
  confirmed: boolean
  waitlist_position: number | null
  created_at: string
  updated_at: string
  // Joined fields
  user?: {
    id: string
    username: string | null
    first_name: string | null
    last_name: string | null
    email: string | null
  }
}

export interface Result {
  id: string
  game_id: string
  user_id: string
  in: number
  out: number
  delta: number
  created_at: string
  updated_at: string
  user?: {
    first_name: string | null
    last_name: string | null
    username: string | null
  }
}

export interface Message {
  id: string
  created_at: string
  updated_at: string
  game_id: string
  user_id: string
  message: string
  user?: {
    first_name: string | null
    last_name: string | null
    username: string | null
  }
}

export interface Payment {
  id: string
  created_at: string
  updated_at: string
  user_id: string | null
  type: PaymentType | null
  payment_id: string | null
} 