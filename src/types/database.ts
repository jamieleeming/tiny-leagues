export type UserType = 'admin' | 'user' // Changed to lowercase to match database enum
export type GameType = 'cash' | 'tournament' // Changed to lowercase like we did with UserType
export type GameFormat = 'nlhe' | 'plo' // Changed to lowercase
export type PaymentType = 'STRIPE' | 'PAYPAL' // Add other types as needed

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
  created_at: string
  updated_at: string
  host_id: string
  type: GameType | null
  format: GameFormat | null
  date_start: string | null
  date_end: string | null
  private: boolean
  street: string | null
  city: string | null
  zip: string | null
  seats: number | null
  buyin_min: number | null
  buyin_max: number | null
  blind_small: number | null
  blind_large: number | null
  rebuy: boolean | null
  note: string | null
}

export interface RSVP {
  id: string
  created_at: string
  updated_at: string
  game_id: string | null
  user_id: string | null
  confirmed: boolean | null
}

export interface Result {
  id: string
  created_at: string
  updated_at: string
  game_id: string | null
  user_id: string | null
  in: number | null
  out: number | null
  delta: number | null
  position: number | null
}

export interface Message {
  id: string
  created_at: string
  updated_at: string
  game_id: string | null
  user_id: string | null
  message: string | null
}

export interface Payment {
  id: string
  created_at: string
  updated_at: string
  user_id: string | null
  type: PaymentType | null
  payment_id: string | null
} 