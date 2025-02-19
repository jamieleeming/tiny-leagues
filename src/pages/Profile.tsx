import { useState, useEffect } from 'react'
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Alert,
  Paper,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  Skeleton
} from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabaseClient'
import { format } from 'date-fns'
import { PaymentType } from '../types/database'
import { useNavigate } from 'react-router-dom'

// Add interface for recent games
interface RecentGame {
  id: string
  game_id: string
  date: string
  type: string
  format: string
  delta: number
}

// Add interface for stats
interface UserStats {
  gamesPlayed: number
  totalWinnings: number
  gamesHosted: number
  averageBuyIn: number
}

// Fix the type issue with games
interface GameResult {
  id: string
  game_id: string
  delta: number
  games: {
    date_start: string
    type: string
    format: string
  }
}

const Profile = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profile, setProfile] = useState({
    username: '',
    first_name: '',
    last_name: '',
    phone: '',
    venmo_id: ''
  })
  const [stats, setStats] = useState<UserStats>({
    gamesPlayed: 0,
    totalWinnings: 0,
    gamesHosted: 0,
    averageBuyIn: 0
  })
  const [recentGames, setRecentGames] = useState<RecentGame[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [recentGamesLoading, setRecentGamesLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return
      
      try {
        setStatsLoading(true)
        setRecentGamesLoading(true)

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError

        // Fetch Venmo ID from payments table
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .select('payment_id')
          .eq('user_id', user.id)
          .eq('type', 'venmo' as PaymentType)
          .single()

        if (paymentError && paymentError.code !== 'PGRST116') throw paymentError

        if (profileData) {
          setProfile({
            ...profileData,
            venmo_id: paymentData?.payment_id || ''
          })
        }

        // Fetch user's recent games
        const { data: gamesData, error: gamesError } = await supabase
          .from('results')
          .select(`
            id,
            game_id,
            delta,
            games (
              date_start,
              type,
              format
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5) as { 
            data: GameResult[] | null
            error: any 
          }

        if (gamesError) throw gamesError

        // Fetch count of hosted games
        const { count: hostedGamesCount, error: hostedError } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('host_id', user.id)
          .or('status.eq.completed,date_start.lt.now()')

        if (hostedError) throw hostedError

        // Transform games data
        const recentGamesData = gamesData?.map((result: GameResult) => ({
          id: result.id,
          game_id: result.game_id,
          date: result.games.date_start,
          type: result.games.type,
          format: result.games.format,
          delta: result.delta
        })) || []

        setRecentGames(recentGamesData)

        // Calculate stats
        const stats = {
          gamesPlayed: gamesData?.length || 0,
          totalWinnings: gamesData?.reduce((sum, game) => sum + game.delta, 0) || 0,
          gamesHosted: hostedGamesCount || 0,
          averageBuyIn: 0 // TODO: Add calculation for average buy-in
        }

        setStats(stats)
      } catch (err) {
        console.error('Error fetching profile data:', err)
      } finally {
        setStatsLoading(false)
        setRecentGamesLoading(false)
      }
    }

    fetchProfile()
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      // First update the user profile (without venmo_id)
      const { username, first_name, last_name, phone, venmo_id } = profile
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          username,
          first_name,
          last_name,
          phone,
          updated_at: new Date().toISOString()
        })

      if (profileError) throw profileError

      // Then handle the Venmo ID in the payments table
      if (venmo_id) {
        // First check if a Venmo payment method already exists
        const { data: existingPayment, error: fetchError } = await supabase
          .from('payments')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'venmo' as PaymentType)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError // PGRST116 is "not found" error

        if (existingPayment) {
          // Update existing payment record
          const { error: updateError } = await supabase
            .from('payments')
            .update({ 
              payment_id: venmo_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPayment.id)

          if (updateError) throw updateError
        } else {
          // Create new payment record
          const { error: insertError } = await supabase
            .from('payments')
            .insert({
              user_id: user.id,
              type: 'venmo' as PaymentType,
              payment_id: venmo_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })

          if (insertError) throw insertError
        }
      }

      setSuccess('Profile updated successfully')
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Profile
          </Typography>
          <Divider sx={{ mb: 4 }} />
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Username"
                  fullWidth
                  value={profile.username || ''}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone"
                  fullWidth
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  fullWidth
                  value={profile.first_name || ''}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  fullWidth
                  value={profile.last_name || ''}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Venmo ID"
                  fullWidth
                  value={profile.venmo_id || ''}
                  onChange={(e) => setProfile({ ...profile, venmo_id: e.target.value })}
                />
              </Grid>
            </Grid>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ mt: 4 }}
            >
              Save Changes
            </Button>
          </Box>
        </Paper>
      </Box>
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Statistics
        </Typography>
        <Divider sx={{ mb: 4 }} />
        {statsLoading ? (
          <Skeleton variant="rectangular" height={100} />
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary">
                  {stats.gamesPlayed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Games Played
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary">
                  ${stats.totalWinnings}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Winnings
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary">
                  {stats.gamesHosted}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Games Hosted
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" color="primary">
                  ${stats.averageBuyIn}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg. Buy-in
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}
      </Paper>
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Recent Games
        </Typography>
        <Divider sx={{ mb: 4 }} />
        {recentGamesLoading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : recentGames.length === 0 ? (
          <Typography color="text.secondary" align="center">
            No games played yet
          </Typography>
        ) : (
          <List>
            {recentGames.map((game) => (
              <ListItem 
                key={game.id}
                secondaryAction={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/games/${game.game_id}`)}
                  >
                    View Game
                  </Button>
                }
              >
                <ListItemText
                  primary={format(new Date(game.date), 'PPP')}
                  secondary={`${game.type === 'cash' ? 'Cash Game' : 'Tournament'} - ${game.format === 'holdem' ? "Hold'em" : 'Omaha'}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  )
}

export default Profile 