import { useEffect, useState } from 'react'
import { supabase } from '../config/supabaseClient'
import { Game } from '../types/database'

export const useGames = (limit = 10) => {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .order('date_start', { ascending: true })
          .limit(limit)

        if (error) throw error

        setGames(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [limit])

  return { games, loading, error }
} 