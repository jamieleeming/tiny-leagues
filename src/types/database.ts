export type UserType = 'admin' | 'user' // Changed to lowercase to match database enum
export type GameType = 'cash' | 'tournament' // These are correct
export type GAME_FORMAT = 'cash' | 'tournament';
export type GAME_VARIANT = 'holdem' | 'omaha';
export type PaymentType = 'venmo' | 'zelle' // Update PaymentType to match database values
export type GameStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type SettlementType = 'centralized' | 'decentralized'
export type ReserveType = 'fee' | 'buyin'

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
  variant: GAME_VARIANT
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
  reserve_type: ReserveType
  created_at: string
  updated_at: string
  status: GameStatus
  bomb_pots: boolean
  host?: GameHost
  confirmed_count?: number
  rsvp?: { id: string }[]
  league_id: string | null
  league?: League  // Optional joined field
  format: GAME_FORMAT
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
    username: string | null
    first_name: string | null
    last_name: string | null
  }
  payment?: Payment
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
  payment_id: string
  type: string
  user_id: string
}

interface GameHost {
  id: string
  username: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  payment?: Payment | null
  payments?: Payment[]
}

export interface League {
  id: string
  created_at: string
  updated_at: string | null
  name: string | null
  owner: string | null  // UUID of the owner (references users.id)
  tag: string | null    // Limited to 3 characters by DB constraint
} 