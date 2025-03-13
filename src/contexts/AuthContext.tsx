import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../config/supabaseClient'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, referralCode: string, userData: { firstName: string, lastName: string, username: string }) => Promise<{ user: User | null, error: Error | null }>
  signOut: () => Promise<void>
  getUserReferralCode: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (
    email: string, 
    password: string, 
    referralCode: string,
    userData: { firstName: string, lastName: string, username: string }
  ) => {
    try {
      // Validate referral code
      if (!referralCode) {
        throw new Error('Referral code is required')
      }

      // Check if referral code exists and get the referrer's ID
      const { data: referrerData, error: referrerError } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referralCode)
        .single()

      if (referrerError || !referrerData) {
        throw new Error('Invalid referral code')
      }

      // Create the auth user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/games`,
          data: {
            email: email,
            first_name: userData.firstName,
            last_name: userData.lastName,
            username: userData.username
          }
        }
      })
      
      if (error) {
        return { user: null, error }
      }

      return { user: data.user, error: null }
    } catch (error) {
      return { user: null, error: error instanceof Error ? error : new Error('Signup failed') }
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      // Even if there's an error with the API call, we'll still clear the local state
      if (error) {
        console.warn('Error during sign out:', error.message)
      }
    } catch (err) {
      console.warn('Exception during sign out:', err)
      // We don't rethrow the error to prevent it from breaking the UI
    }
    // Always set user to null to ensure local state is cleared
    setUser(null)
  }

  const getUserReferralCode = async (): Promise<string | null> => {
    if (!user) return null
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', user.id)
        .single()
      
      if (error || !data) {
        return null
      }
      
      return data.referral_code
    } catch (error) {
      return null
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signUp, 
      signOut,
      getUserReferralCode
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 