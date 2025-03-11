import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Container, 
  Box, 
  Typography, 
  Alert,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabaseClient'
import { format } from 'date-fns'
import { PaymentType, UserType } from '../types/database'
import { ContentCard } from '../components/styled/Cards'
import { PageTitle, SectionTitle } from '../components/styled/Typography'
import { FormSection, StyledTextField, FormActions } from '../components/styled/Forms'
import { GradientButton } from '../components/styled/Buttons'
import { PageWrapper, ContentWrapper } from '../components/styled/Layouts'
import { useAnalytics } from '../contexts/AnalyticsContext'

// Add interface for recent games
interface RecentGame {
  id: string
  game_id: string
  date: string
  type: string
  variant: string
  delta: number
}

// Add interface for stats
interface UserStats {
  gamesPlayed: number
  totalWinnings: number
  gamesHosted: number
  playersInvited: number
  favoriteGame: string
  favoriteHost: string
}

// Fix the type issue with games
interface GameResult {
  id: string
  game_id: string
  delta: number
  games: {
    date_start: string
    type: string
    variant: string
    host: {
      username: string
    }
  }
}

interface UserProfile {
  username: string
  first_name: string
  last_name: string
  phone: string
  venmo_id: string
  referral_code: string
  type?: UserType
}

const Profile = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profile, setProfile] = useState<UserProfile>({
    username: '',
    first_name: '',
    last_name: '',
    phone: '',
    venmo_id: '',
    referral_code: ''
  })
  const [stats, setStats] = useState<UserStats>({
    gamesPlayed: 0,
    totalWinnings: 0,
    gamesHosted: 0,
    playersInvited: 0,
    favoriteGame: '-',
    favoriteHost: '-'
  })
  const [recentGames, setRecentGames] = useState<RecentGame[]>([])
  const [, setStatsLoading] = useState(true)
  const navigate = useNavigate()
  const { trackEvent } = useAnalytics()

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return
      
      try {
        setStatsLoading(true)

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
              variant,
              host:users!games_host_id_fkey(
                username
              )
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
          variant: result.games.variant,
          delta: result.delta
        })) || []

        setRecentGames(recentGamesData)

        // Calculate favorite game variant
        const variantCounts = gamesData?.reduce((acc: Record<string, number>, game) => {
          const variant = game.games.variant === 'holdem' ? "Hold'em" : 'Omaha'
          acc[variant] = (acc[variant] || 0) + 1
          return acc
        }, {})

        const favoriteGame = variantCounts ? 
          Object.entries(variantCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-' : 
          '-'

        // Calculate favorite host
        const hostCounts = gamesData?.reduce((acc: Record<string, number>, game) => {
          const hostUsername = game.games.host?.username || 'Unknown'
          if (hostUsername !== profile.username) {
            acc[hostUsername] = (acc[hostUsername] || 0) + 1
          }
          return acc
        }, {})

        const favoriteHost = hostCounts && Object.keys(hostCounts).length > 0 ? 
          Object.entries(hostCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-' : 
          '-'

        // Calculate stats
        const stats = {
          gamesPlayed: gamesData?.length || 0,
          totalWinnings: gamesData?.reduce((sum, game) => sum + game.delta, 0) || 0,
          gamesHosted: hostedGamesCount || 0,
          playersInvited: 0,
          favoriteGame,
          favoriteHost
        }

        // Get count of players invited (users who used this user's referral code)
        const { count: invitedCount, error: invitedError } = await supabase
          .from('users')
          .select('id', { count: 'exact' })
          .eq('referred_by', user.id)
        
        if (!invitedError) {
          stats.playersInvited = invitedCount || 0
        }

        setStats(stats)
      } catch (err) {
        // No console.error statements
      } finally {
        setStatsLoading(false)
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

      // Update the display name in Supabase Auth
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          display_name: `${first_name} ${last_name}`.trim()
        }
      })

      if (authUpdateError) throw authUpdateError

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
      trackEvent('Profile', 'update_profile_success')
    } catch (err) {
      setError('An unexpected error occurred')
      trackEvent('Profile', 'update_profile_error', 'unexpected_error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyReferralLink = async () => {
    try {
      const referralLink = `https://jamieleeming.github.io/tiny-leagues/auth?referral=${profile.referral_code}`
      await navigator.clipboard.writeText(referralLink)
      setSuccess('Referral link copied to clipboard')
      trackEvent('Profile', 'copy_referral_link')
      
      setTimeout(() => {
        setSuccess('')
      }, 2000)
    } catch (err) {
      console.error('Failed to copy referral link', err)
      trackEvent('Profile', 'copy_referral_link_error')
    }
  }

  return (
    <Container>
      <PageWrapper maxWidth="lg">
        <ContentWrapper>
          <PageTitle gutterBottom>
            Profile Settings
          </PageTitle>

          <ContentCard>
            <SectionTitle gutterBottom>
              Statistics
            </SectionTitle>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={2}>
                <Box>
                  <Typography variant="h4" color="primary">
                    {stats.gamesPlayed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Games Played
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Box>
                  <Typography variant="h4" color="primary">
                    {stats.gamesHosted}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Games Hosted
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Box>
                  <Typography variant="h4" color="primary">
                    {stats.playersInvited}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Players Invited
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box>
                  <Typography variant="h4" color="primary">
                    {stats.favoriteGame}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Favorite Game
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box>
                  <Typography variant="h4" color="primary">
                    {stats.favoriteHost}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Favorite Host
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </ContentCard>

          <ContentCard sx={{ mt: 4 }}>
            <FormSection>
              <SectionTitle gutterBottom>
                Account Information
              </SectionTitle>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <StyledTextField
                    fullWidth
                    label="First Name"
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <StyledTextField
                    fullWidth
                    label="Last Name"
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <StyledTextField
                    fullWidth
                    label="Username"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <StyledTextField
                    fullWidth
                    label="Email"
                    value={user?.email || ''}
                    disabled
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <StyledTextField
                    fullWidth
                    label="Phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <StyledTextField
                    fullWidth
                    label="Venmo ID"
                    value={profile.venmo_id}
                    onChange={(e) => setProfile({ ...profile, venmo_id: e.target.value })}
                  />
                </Grid>
              </Grid>
            </FormSection>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <FormActions>
              <GradientButton
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
              >
                Save Changes
              </GradientButton>
            </FormActions>
          </ContentCard>

          <ContentCard sx={{ mt: 4 }}>
            <SectionTitle gutterBottom>
              Referral Code
            </SectionTitle>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h4" color="primary" sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>
                {profile.referral_code || 'Loading...'}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Tiny Leagues is currently invite-only. Your unique referral code can be used by new players to sign up for an account and get access to games.
            </Typography>
            <FormActions>
              <GradientButton
                variant="contained"
                onClick={handleCopyReferralLink}
                disabled={loading}
              >
                Copy Referral Link
              </GradientButton>
            </FormActions>
          </ContentCard>

          <ContentCard sx={{ mt: 4 }}>
            <SectionTitle gutterBottom>
              Recent Games
            </SectionTitle>
            {recentGames.length === 0 ? (
              <Typography color="text.secondary">
                No games played yet
              </Typography>
            ) : (
              <List>
                {recentGames.map((game) => (
                  <ListItem
                    key={game.id}
                    sx={{
                      borderRadius: 1,
                      pr: 12,
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <ListItemText
                      primary={format(new Date(game.date), 'PPP')}
                      secondary={`${game.type === 'cash' ? 'Cash Game' : 'Tournament'} - ${game.variant === 'holdem' ? "Hold'em" : 'Omaha'}`}
                    />
                    <ListItemSecondaryAction>
                      <GradientButton
                        size="small"
                        onClick={() => navigate(`/games/${game.game_id}`)}
                        className="auto-width"
                        variant="outlined"
                      >
                        View
                      </GradientButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </ContentCard>
        </ContentWrapper>
      </PageWrapper>
    </Container>
  )
}

export default Profile 