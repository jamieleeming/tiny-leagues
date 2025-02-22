import { useState, useEffect, Fragment } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  useTheme,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import {
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material'
import { format } from 'date-fns'
import { supabase } from '../config/supabaseClient'
import { Game, RSVP, GameStatus, Result, Payment } from '../types/database'
import { useAuth } from '../contexts/AuthContext'
import GameForm from '../components/games/GameForm'
import { GameResultsDialog } from '../components/games/GameResultsDialog'
import { ChatSection } from '../components/games/ChatSection'
import { linkifyText } from '../utils/textUtils'
import { PageWrapper, ContentWrapper } from '../components/styled/Layouts'
import { PageTitle, SectionTitle, CardHeader } from '../components/styled/Typography'
import { StyledDialog, StyledDialogTitle, StyledDialogContent } from '../components/styled/Dialogs'
import { HoverListItem, StyledList } from '../components/styled/Lists'
import { IconText, FlexBetween } from '../components/styled/Common'
import { ContentCard } from '../components/styled/Layout'
import { GradientButton } from '../components/styled/Buttons'
import { BackLink } from '../components/styled/Navigation'

const GameDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const theme = useTheme()
  const { user } = useAuth()
  const [game, setGame] = useState<Game | null>(null)
  const [rsvps, setRsvps] = useState<RSVP[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRsvp, setUserRsvp] = useState<RSVP | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<Result[]>([])

  useEffect(() => {
    // Redirect if ID is invalid
    if (id === 'create') {
      navigate('/games')
      return
    }

    fetchGameDetails()
  }, [id])

  useEffect(() => {
    if (!user) {
      // Clear sensitive data when user signs out
      setRsvps([])
      setUserRsvp(null)
      setResults([])
      
      // Re-fetch public game data
      fetchGameDetails()
    }
  }, [user])

  const fetchGameDetails = async () => {
    try {
      setLoading(true)
      
      // First get the game with a count of confirmed players
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          host:users!games_host_id_fkey(
            id,
            username,
            first_name,
            last_name,
            payments(
              payment_id,
              type
            )
          ),
          rsvp!inner(confirmed, waitlist_position)
        `)
        .eq('id', id)
        .single()

      if (gameError) throw gameError
      if (!gameData) throw new Error('Game not found')

      // Transform the host data to include payment info and calculate confirmed count
      const venmoPayment = gameData.host?.payments?.find((p: Payment) => p.type === 'venmo')
      const transformedGame = {
        ...gameData,
        host: {
          ...gameData.host,
          payment: venmoPayment || null
        },
        confirmed_count: gameData.rsvp?.filter(r => 
          r.confirmed && r.waitlist_position === null
        ).length || 0
      }

      setGame(transformedGame)

      // Only fetch RSVPs and results if user is logged in
      if (user) {
        // Fetch RSVPs
        const { data: rsvpData, error: rsvpError } = await supabase
          .from('rsvp')
          .select(`
            *,
            user:users(
              id,
              username,
              first_name,
              last_name,
              email
            )
          `)
          .eq('game_id', id)
          .order('created_at', { ascending: true })

        if (!rsvpError) {
          setRsvps(rsvpData || [])
          const userRsvp = rsvpData?.find(rsvp => rsvp.user_id === user?.id)
          setUserRsvp(userRsvp || null)
        }

        // Fetch results if game is completed
        if (gameData.status === 'completed') {
          // First get the results
          const { data: resultsData, error: resultsError } = await supabase
            .from('results')
            .select(`
              *,
              user:users(
                first_name,
                last_name,
                username
              )
            `)
            .eq('game_id', id)
            .order('created_at', { ascending: true })

          if (resultsError) throw resultsError

          // Then get venmo payments for all users in the results
          const userIds = resultsData?.map(result => result.user_id) || []
          const { data: paymentsData, error: paymentsError } = await supabase
            .from('payments')
            .select('*')
            .in('user_id', userIds)
            .eq('type', 'venmo')

          if (paymentsError) throw paymentsError

          // Combine results with payment data
          const combinedResults = resultsData?.map(result => ({
            ...result,
            payment: paymentsData?.find(p => p.user_id === result.user_id)
          }))

          setResults(combinedResults || [])
        }
      } else {
        // For non-logged in users, set empty arrays
        setRsvps([])
        setUserRsvp(null)
        setResults([])
      }

    } catch (err) {
      console.error('Error in fetchGameDetails:', err)
      setError('Failed to load game details')
    } finally {
      setLoading(false)
    }
  }

  const isGameFull = () => {
    if (!game) return false
    return rsvps.filter(rsvp => !rsvp.waitlist_position).length >= game.seats
  }

  const handleRSVP = async () => {
    if (!user) {
      // Store the current game ID in localStorage for redirect after auth
      localStorage.setItem('redirectGameId', id || '')
      // Take them to the unified auth page
      navigate('../../auth', { 
        state: { 
          mode: 'signup',  // Default to signup but user can switch to login
          from: `/games/${id}` 
        } 
      })
      return
    }

    try {
      if (!game || !user) return
      if (userRsvp) {
        // Handle cancellation as before
        const { error } = await supabase
          .from('rsvp')
          .delete()
          .eq('id', userRsvp.id)

        if (error) throw error
        
        setUserRsvp(null)
        setRsvps(rsvps.filter(r => r.id !== userRsvp.id))
      } else {
        // Check if game is full
        const willBeOnWaitlist = isGameFull()

        // Handle new RSVP
        const newRsvp = {
          game_id: game.id,
          user_id: user?.id,
          waitlist_position: willBeOnWaitlist 
            ? rsvps.filter(r => r.waitlist_position !== null).length 
            : null,
          confirmed: !willBeOnWaitlist && game.reserve === 0, // Only auto-confirm if seat available and no fee
          created_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('rsvp')
          .insert(newRsvp)
          .select(`
            *,
            user:users(
              id,
              username,
              first_name,
              last_name,
              email
            )
          `)
          .single()

        if (error) throw error

        setUserRsvp(data)
        setRsvps([...rsvps, data])

        // Only open payment link if there's a reservation fee and host has payment set up
        if (game.reserve > 0 && game.host?.payment?.payment_id && !willBeOnWaitlist) {
          window.open(
            `https://venmo.com/${game.host.payment.payment_id}?txn=pay&amount=${game.reserve}&note=⛽`,
            '_blank'
          )
        }
      }

      fetchGameDetails()
    } catch (err) {
      console.error('Error handling RSVP:', err)
      setError('Failed to update RSVP')
    }
  }

  const handleConfirmRSVP = async (rsvpId: string, confirmed: boolean) => {
    try {
      if (!game) return

      // Get the RSVP to check if it's the host
      const { data: rsvpData, error: rsvpError } = await supabase
        .from('rsvp')
        .select('*')
        .eq('id', rsvpId)

      if (rsvpError) throw rsvpError
      if (!rsvpData || rsvpData.length === 0) {
        console.error('RSVP not found')
        return
      }

      const rsvp = rsvpData[0]
      
      // Don't allow modifying host's RSVP
      if (rsvp.user_id === game.host_id) {
        console.error('Cannot modify host RSVP')
        return
      }

      // If confirming a waitlisted player, check if there's space
      if (confirmed && rsvp.waitlist_position !== null) {
        const confirmedCount = rsvps.filter(r => r.confirmed && r.waitlist_position === null).length
        if (confirmedCount >= game.seats) {
          setError('Cannot confirm player: game is full')
          return
        }

        // Update the RSVP to move them off waitlist and confirm them
        const { error } = await supabase
          .from('rsvp')
          .update({ 
            confirmed: true,
            waitlist_position: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', rsvpId)

        if (error) throw error

        // Reorder remaining waitlist
        const waitlistRsvps = rsvps
          .filter(r => r.waitlist_position !== null && r.id !== rsvpId)
          .sort((a, b) => (a.waitlist_position || 0) - (b.waitlist_position || 0))

        for (let i = 0; i < waitlistRsvps.length; i++) {
          const { error: updateError } = await supabase
            .from('rsvp')
            .update({ 
              waitlist_position: i,
              updated_at: new Date().toISOString()
            })
            .eq('id', waitlistRsvps[i].id)

          if (updateError) throw updateError
        }
      } else {
        // Regular confirmation update for non-waitlisted players
        const { error } = await supabase
          .from('rsvp')
          .update({ 
            confirmed,
            updated_at: new Date().toISOString()
          })
          .eq('id', rsvpId)

        if (error) throw error
      }
      
      // Refresh the game details to show updated status
      await fetchGameDetails()
    } catch (err) {
      console.error('Error updating RSVP:', err)
      setError('Failed to update player confirmation')
    }
  }

  const promoteFromWaitlist = async () => {
    if (!game) return

    // Get the first person on the waitlist
    const { data: nextInLine, error: fetchError } = await supabase
      .from('rsvp')
      .select('*')
      .eq('game_id', game.id)
      .not('waitlist_position', 'is', null)
      .order('waitlist_position', { ascending: true })
      .limit(1)
      .single()

    if (fetchError || !nextInLine) return

    // Remove them from waitlist
    const { error: updateError } = await supabase
      .from('rsvp')
      .update({
        waitlist_position: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', nextInLine.id)

    if (updateError) throw updateError

    // Reorder remaining waitlist
    const { data: waitlistRsvps, error: listError } = await supabase
      .from('rsvp')
      .select('id, waitlist_position')
      .eq('game_id', game.id)
      .gt('waitlist_position', nextInLine.waitlist_position)
      .order('waitlist_position', { ascending: true })

    if (listError) throw listError

    // Update positions
    for (const rsvp of waitlistRsvps || []) {
      const { error: positionError } = await supabase
        .from('rsvp')
        .update({ 
          waitlist_position: (rsvp.waitlist_position as number) - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', rsvp.id)

      if (positionError) throw positionError
    }
  }

  const handleRemovePlayer = async (rsvpId: string) => {
    try {
      // Get the RSVP to check if it's the host
      const { data: rsvpData, error: rsvpError } = await supabase
        .from('rsvp')
        .select('user_id')
        .eq('id', rsvpId)
        .single()

      if (rsvpError) throw rsvpError
      
      // Don't allow removing host
      if (rsvpData.user_id === game?.host_id) {
        console.error('Cannot remove host from game')
        return
      }

      const { error } = await supabase
        .from('rsvp')
        .delete()
        .eq('id', rsvpId)

      if (error) throw error

      // Check if we should promote someone from waitlist
      if (!isGameFull()) {
        await promoteFromWaitlist()
      }
      
      fetchGameDetails()
    } catch (err) {
      console.error('Error removing player:', err)
    }
  }

  const handleStatusUpdate = async (newStatus: GameStatus) => {
    try {
      if (!game) return

      if (newStatus === 'completed') {
        setShowResults(true)
        return
      }

      const { error } = await supabase
        .from('games')
        .update({ 
          status: newStatus,
          date_end: new Date().toISOString()
        })
        .eq('id', game.id)

      if (error) throw error

      fetchGameDetails()
    } catch (err) {
      console.error('Error updating game status:', err)
      setError('Failed to update game status')
    }
  }

  // Add this helper function to sort RSVPs
  const sortedRsvps = () => {
    return [...rsvps].sort((a, b) => {
      // Host always first
      if (a.user_id === game?.host_id) return -1
      if (b.user_id === game?.host_id) return 1
      
      // Then active players (no waitlist position)
      if (a.waitlist_position === null && b.waitlist_position !== null) return -1
      if (a.waitlist_position !== null && b.waitlist_position === null) return 1
      
      // Then sort by waitlist position
      if (a.waitlist_position !== null && b.waitlist_position !== null) {
        return a.waitlist_position - b.waitlist_position
      }
      
      // Finally sort by creation date
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }

  // Add function to handle seat changes
  const handleSeatChange = async (newSeats: number) => {
    try {
      if (!game) return

      // Get all non-waitlist RSVPs ordered by creation date (newest first)
      const activeRsvps = rsvps
        .filter(r => r.waitlist_position === null && r.user_id !== game.host_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      // Get current waitlist
      const waitlistRsvps = rsvps
        .filter(r => r.waitlist_position !== null)
        .sort((a, b) => (a.waitlist_position || 0) - (b.waitlist_position || 0))

      // Calculate how many seats are available (excluding host)
      const availableSeats = newSeats - 1
      const currentActivePlayers = activeRsvps.length

      if (availableSeats > currentActivePlayers) {
        // Promote players from waitlist
        const playersToPromote = waitlistRsvps.slice(0, availableSeats - currentActivePlayers)
        for (const rsvp of playersToPromote) {
          await supabase
            .from('rsvp')
            .update({ 
              waitlist_position: null,
              confirmed: game.reserve === 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', rsvp.id)
        }

        // Reorder remaining waitlist
        const remainingWaitlist = waitlistRsvps.slice(playersToPromote.length)
        for (let i = 0; i < remainingWaitlist.length; i++) {
          await supabase
            .from('rsvp')
            .update({ 
              waitlist_position: i,
              updated_at: new Date().toISOString()
            })
            .eq('id', remainingWaitlist[i].id)
        }
      } else if (availableSeats < currentActivePlayers) {
        // Move excess players to waitlist
        const playersToWaitlist = activeRsvps.slice(0, currentActivePlayers - availableSeats)
        for (let i = 0; i < playersToWaitlist.length; i++) {
          await supabase
            .from('rsvp')
            .update({ 
              waitlist_position: waitlistRsvps.length + i,
              confirmed: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', playersToWaitlist[i].id)
        }
      }

      // Update game with new seat count
      await supabase
        .from('games')
        .update({ seats: newSeats })
        .eq('id', game.id)

      fetchGameDetails()
    } catch (err) {
      console.error('Error updating seats:', err)
      setError('Failed to update seats')
    }
  }

  // Add this helper function near the other helper functions
  const isAtMaxConfirmed = () => {
    if (!game) return false
    const confirmedCount = rsvps.filter(r => r.confirmed && r.waitlist_position === null).length
    return confirmedCount >= game.seats
  }

  const handleDeleteGame = async () => {
    try {
      if (!game) return
      
      const { error } = await supabase
        .from('games')
        .update({ 
          status: 'cancelled',
          date_end: new Date().toISOString()
        })
        .eq('id', game.id)

      if (error) throw error

      // Navigate back to games list
      navigate('/games', { 
        state: { message: 'Game successfully cancelled' }
      })
    } catch (err) {
      console.error('Error cancelling game:', err)
      setError('Failed to cancel game')
    }
  }

  // Add a helper function to format location based on auth status
  const formatLocation = () => {
    if (!game) return 'Location TBD'
    if (user) {
      return [game.street, game.city, game.zip].filter(Boolean).join(', ')
    }
    return game.city || 'Location TBD'
  }

  // Add a helper function to get confirmed player count
  const getConfirmedCount = () => {
    if (!game) return 0
    if (user) {
      return rsvps.filter(r => r.confirmed && r.waitlist_position === null).length
    }
    // For non-logged in users, get the count from the query
    return game.confirmed_count || 0
  }

  if (loading) {
    return (
      <PageWrapper maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </PageWrapper>
    )
  }

  if (error || !game) {
    return (
      <PageWrapper maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error || 'Game not found'}
        </Alert>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper maxWidth="lg">
      <ContentWrapper>
        <BackLink onClick={() => navigate('/games')}>
          <ArrowBackIcon />
          Back to Games
        </BackLink>

        <Grid container spacing={3}>
          {/* Header Card - No bottom margin needed due to Grid spacing */}
          <Grid item xs={12}>
            <ContentCard>
              <FlexBetween className="maintain-row">
                <Box>
                  <PageTitle>
                    {game.type === 'cash' ? 'Cash Game' : 'Tournament'}
                  </PageTitle>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Chip
                      label={game.status?.replace('_', ' ').toUpperCase() || 'SCHEDULED'}
                      color={
                        !game.status || game.status === 'scheduled' ? 'default' :
                        game.status === 'in_progress' ? 'primary' :
                        game.status === 'completed' ? 'success' :
                        'error'
                      }
                    />
                  </Box>
                </Box>
                {user?.id === game.host_id && (game.status === 'scheduled' || game.status === 'in_progress') && (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: { xs: 1, sm: 2 },
                    alignItems: { xs: 'stretch', sm: 'center' }
                  }}>
                    {/* Primary Game Actions */}
                    <Box sx={{ 
                      display: 'flex',
                      gap: 1
                    }}>
                      {(game.status === 'scheduled' || game.status === 'in_progress') && (
                        <GradientButton
                          className="auto-width"
                          startIcon={<MoneyIcon />}
                          onClick={() => handleStatusUpdate('completed')}
                          size="small"
                          fullWidth
                        >
                          Log Results
                        </GradientButton>
                      )}
                    </Box>
                    
                    {/* Secondary Game Actions */}
                    <Box sx={{ 
                      display: 'flex',
                      gap: 1
                    }}>
                      <GradientButton
                        className="auto-width"
                        startIcon={<EditIcon />}
                        onClick={() => setEditMode(true)}
                        size="small"
                        variant="outlined"
                        fullWidth
                      >
                        Edit
                      </GradientButton>
                      {(game.status === 'scheduled' || game.status === 'in_progress') && (
                        <GradientButton
                          className="auto-width"
                          startIcon={<CancelIcon />}
                          onClick={() => setDeleteDialogOpen(true)}
                          size="small"
                          color="error"
                          variant="outlined"
                          fullWidth
                        >
                          Cancel
                        </GradientButton>
                      )}
                    </Box>
                  </Box>
                )}
              </FlexBetween>
            </ContentCard>
          </Grid>

          {/* Main Content Column */}
          <Grid item xs={12} lg={8}>
            {/* Stack cards with consistent spacing */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Game Details Card */}
              <ContentCard>
                <CardHeader>
                  <SectionTitle>Details</SectionTitle>
                </CardHeader>
                <IconText>
                  <CalendarIcon />
                  <Typography>
                    {format(new Date(game.date_start!), 'PPP p')}
                  </Typography>
                </IconText>

                <IconText>
                  <LocationIcon />
                  <Typography>
                    {formatLocation()}
                  </Typography>
                </IconText>

                <IconText>
                  <MoneyIcon />
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography>
                      {game.buyin_min === 0 
                        ? `Buy-in: $${game.buyin_max}`
                        : `Buy-in: $${game.buyin_min} - $${game.buyin_max}`
                      }
                    </Typography>
                    {game.rebuy && (
                      <Chip 
                        label="Rebuys Allowed" 
                        size="small" 
                        color="success"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                </IconText>

                {/* Only show reservation fee if it's greater than 0 */}
                {game.reserve > 0 && (
                  <IconText>
                    <MoneyIcon />
                    <Typography>
                      Reservation Fee: ${game.reserve}
                    </Typography>
                  </IconText>
                )}
              </ContentCard>

              {/* Additional Info Card - Only render if there's a note */}
              {game.note && (
                <ContentCard>
                  <CardHeader>
                    <SectionTitle>Additional Info</SectionTitle>
                  </CardHeader>
                  <Typography color="text.secondary">
                    {linkifyText(game.note)}
                  </Typography>
                </ContentCard>
              )}

              {/* Host Information Card */}
              <ContentCard>
                <CardHeader>
                  <SectionTitle>Host Information</SectionTitle>
                </CardHeader>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Avatar 
                      sx={{ 
                        mr: 2, 
                        bgcolor: theme.palette.primary.main,
                        width: 40,
                        height: 40
                      }}
                    >
                      {game.host?.username?.[0]?.toUpperCase() || <PersonIcon />}
                    </Avatar>
                    <Box>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontSize: '1.125rem',
                          fontWeight: 600,
                          mb: 0.5
                        }}
                      >
                        {game.host?.username || 'Anonymous'}
                      </Typography>
                      {user && (userRsvp?.confirmed || user.id === game.host_id) && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                          }}
                        >
                          <span>{game.host?.first_name} {game.host?.last_name}</span>
                          {game.host?.payment?.payment_id && (
                            <>
                              <span>•</span>
                              <span>@{game.host.payment.payment_id}</span>
                            </>
                          )}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Reserve Payment Button */}
                  {user && 
                    user.id !== game.host_id && 
                    game.reserve > 0 && 
                    userRsvp && 
                    !userRsvp.confirmed && (
                      <Button
                        size="small"
                        startIcon={<MoneyIcon />}
                        disabled={!game.host?.payment?.payment_id}
                        onClick={() => window.open(
                          `https://venmo.com/${game.host?.payment?.payment_id}?txn=pay&amount=${game.reserve}&note=⛽`,
                          '_blank'
                        )}
                        sx={{ 
                          color: 'text.secondary',
                          fontSize: '0.75rem',
                          '&:hover': {
                            color: 'primary.main'
                          }
                        }}
                      >
                        {game.host?.payment?.payment_id ? 'PAY RESERVE' : 'UNAVAILABLE'}
                      </Button>
                    )}
                </Box>
              </ContentCard>
            </Box>
          </Grid>

          {/* Players Card */}
          <Grid 
            item 
            xs={12} 
            lg={4}
            sx={{ 
              order: { xs: 3, lg: 2 }
            }}
          >
            <ContentCard>
              <CardHeader>
                <SectionTitle>
                  Players ({getConfirmedCount()}/{game.seats})
                </SectionTitle>
              </CardHeader>

              {/* Show player list only to logged in users */}
              {user ? (
                <StyledList>
                  {sortedRsvps().map((rsvp, index, array) => {
                    const showDivider = index > 0 && 
                      array[index-1].waitlist_position === null && 
                      rsvp.waitlist_position !== null

                    return (
                      <Fragment key={rsvp.id}>
                        {showDivider && (
                          <HoverListItem>
                            <Typography variant="body2" color="text.secondary">
                              Waitlist
                            </Typography>
                          </HoverListItem>
                        )}
                        <HoverListItem
                          secondaryAction={
                            user?.id === game.host_id && rsvp.user_id !== game.host_id && (
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                {/* Only show confirm button if not at max confirmed or this RSVP is already confirmed */}
                                {(!isAtMaxConfirmed() || rsvp.confirmed) && (
                                  <Tooltip title={rsvp.confirmed ? "Remove Confirmation" : "Confirm Player"}>
                                    <IconButton
                                      onClick={() => handleConfirmRSVP(rsvp.id, !rsvp.confirmed)}
                                      color={rsvp.confirmed ? "success" : "default"}
                                      size="small"
                                    >
                                      {rsvp.confirmed ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip title="Remove Player">
                                  <IconButton
                                    onClick={() => handleRemovePlayer(rsvp.id)}
                                    color="error"
                                    size="small"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )
                          }
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            width: '100%',
                            pr: user?.id === game.host_id ? 8 : 0 // Add padding when host controls are shown
                          }}>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {rsvp.user?.first_name} {rsvp.user?.last_name}
                            </Typography>
                            {rsvp.user_id === game.host_id ? (
                              <Chip 
                                label="Host" 
                                size="small" 
                                color="primary" 
                                sx={{ ml: 1 }}
                              />
                            ) : rsvp.waitlist_position !== null ? (
                              <Chip 
                                label={`Waitlist #${rsvp.waitlist_position + 1}`}
                                size="small"
                                color="warning"
                                sx={{ ml: 1 }}
                              />
                            ) : (
                              <Chip 
                                label={rsvp.confirmed ? "Confirmed" : "Pending"}
                                size="small"
                                color={rsvp.confirmed ? "success" : "default"}
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Box>
                        </HoverListItem>
                      </Fragment>
                    )
                  })}
                </StyledList>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  Sign in to see player details
                </Typography>
              )}

              {/* Always show RSVP button */}
              {game.status !== 'completed' && (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleRSVP}
                  sx={{
                    mt: 2,
                    background: userRsvp 
                      ? theme.palette.error.main 
                      : `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                  }}
                >
                  {!user 
                    ? 'Sign Up to RSVP'
                    : userRsvp 
                    ? 'Cancel RSVP' 
                    : isGameFull()
                    ? `Join Waitlist (#${rsvps.filter(r => r.waitlist_position !== null).length + 1})`
                    : game.reserve > 0
                    ? `RSVP - $${game.reserve} Reservation`
                    : 'RSVP'}
                </Button>
              )}
            </ContentCard>
          </Grid>

          {/* Chat Section Card */}
          <Grid 
            item 
            xs={12} 
            lg={8}
            sx={{ 
              order: { xs: 4, lg: 3 }
            }}
          >
            {/* Only render chat card if user is logged in */}
            {user && (
              <ContentCard>
                <CardHeader>
                  <SectionTitle>Chat</SectionTitle>
                </CardHeader>
                <ChatSection 
                  gameId={game.id}
                  userId={user.id}
                  isParticipant={Boolean(userRsvp || game.host_id === user.id)}
                />
              </ContentCard>
            )}
          </Grid>
        </Grid>
      </ContentWrapper>

      {/* Dialogs */}
      <GameForm 
        open={editMode}
        onClose={() => setEditMode(false)}
        gameId={game.id}
        initialData={game}
        onSuccess={() => {
          fetchGameDetails()
          setEditMode(false)
        }}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Cancel Game</DialogTitle>
        <DialogContent>
          Are you sure you want to cancel this game? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Keep Game
          </Button>
          <Button 
            onClick={async () => {
              await handleDeleteGame()
              setDeleteDialogOpen(false)
            }}
            color="error"
            variant="contained"
          >
            Cancel Game
          </Button>
        </DialogActions>
      </Dialog>

      <GameResultsDialog
        open={showResults}
        onClose={() => setShowResults(false)}
        gameId={game.id}
        players={rsvps}
        existingResults={game.status === 'completed' ? results : undefined}
        isEdit={game.status === 'completed'}
        onComplete={async () => {
          // Update game status after results are saved
          if (game.status !== 'completed') {
            const { error } = await supabase
              .from('games')
              .update({ 
                status: 'completed',
                date_end: new Date().toISOString()
              })
              .eq('id', game.id)

            if (error) {
              console.error('Error completing game:', error)
              return
            }
          }

          setShowResults(false)
          fetchGameDetails()
        }}
      />
    </PageWrapper>
  )
}

export default GameDetails