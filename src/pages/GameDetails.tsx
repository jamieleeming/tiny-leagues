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
import { EditGameForm } from '../components/games/EditGameForm'
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
    fetchGameDetails()
  }, [id])

  const fetchGameDetails = async () => {
    try {
      setLoading(true)
      
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
          )
        `)
        .eq('id', id)
        .single()

      if (gameError) throw gameError
      if (!gameData) throw gameData

      // Transform the host data to include payment info
      const venmoPayment = gameData.host?.payments?.find((p: Payment) => p.type === 'venmo')
      gameData.host = {
        ...gameData.host,
        payment: venmoPayment || null
      }

      setGame(gameData)

      // Fetch RSVPs with user information
      const { data: rsvpData, error: rsvpError } = await supabase
        .from('rsvp')  // Changed from 'rsvps' to 'rsvp'
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

      if (rsvpError) {
        console.error('RSVPs fetch error:', rsvpError)
      } else {
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
        // Handle new RSVP
        const newRsvp = {
          game_id: game.id,
          user_id: user?.id,
          waitlist_position: isGameFull() 
            ? rsvps.filter(r => r.waitlist_position !== null).length 
            : null,
          confirmed: false,
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

        // If there's a reserve fee and host has payment set up, open payment link
        if (game.reserve > 0 && game.host?.payment?.payment_id) {
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

      // Update the RSVP
      const { error } = await supabase
        .from('rsvp')
        .update({ 
          confirmed,
          updated_at: new Date().toISOString()
        })
        .eq('id', rsvpId)

      if (error) {
        console.error('RSVP update error:', error)
        throw error
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

  const handleEditGame = async (updatedGame: Partial<Game>) => {
    try {
      if (!game) return
      
      const { error } = await supabase
        .from('games')
        .update(updatedGame)
        .eq('id', game.id)

      if (error) throw error

      // Refresh game details
      fetchGameDetails()
      setEditMode(false)
    } catch (err) {
      console.error('Error updating game:', err)
      setError('Failed to update game')
    }
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
                    {game.street || game.city || game.zip
                      ? [game.street, game.city, game.zip].filter(Boolean).join(', ')
                      : 'Location TBD'}
                  </Typography>
                </IconText>

                <IconText>
                  <MoneyIcon />
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography>
                      Buy-in: ${game.buyin_min} - ${game.buyin_max}
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

                <IconText>
                  <MoneyIcon />
                  <Typography>
                    Reservation Fee: ${game.reserve}
                  </Typography>
                </IconText>

                <IconText>
                  <PersonIcon />
                  <Typography>
                    {rsvps.length} / {game.seats} players
                  </Typography>
                </IconText>
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
                  {game.status === 'completed' 
                    ? 'Game Results' 
                    : `Players (${rsvps.filter(r => r.waitlist_position === null).length}/${game.seats})`
                  }
                </SectionTitle>
              </CardHeader>
              
              {game.status === 'completed' ? (
                <Box>
                  {/* Edit Results Button */}
                  {user?.id === game.host_id && (
                    <Box sx={{ mb: 2 }}>
                      <GradientButton
                        startIcon={<EditIcon />}
                        onClick={() => setShowResults(true)}
                        size="small"
                        variant="outlined"
                        fullWidth
                      >
                        Edit Results
                      </GradientButton>
                    </Box>
                  )}

                  {/* Results List - Sort by delta */}
                  {[...results]
                    .sort((a, b) => (b.delta || 0) - (a.delta || 0))
                    .map((result) => (
                      <Box
                        key={result.id}
                        sx={{ 
                          py: 2,
                          borderBottom: 1,
                          borderColor: 'divider',
                          '&:last-child': {
                            borderBottom: 0
                          }
                        }}
                      >
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <Typography sx={{ fontWeight: 500 }}>
                            {result.user?.username || 'Anonymous'}
                          </Typography>
                          <Typography
                            sx={{
                              fontWeight: 500,
                              color: result.delta > 0 
                                ? 'success.main' 
                                : result.delta < 0 
                                ? 'error.main' 
                                : 'text.primary'
                            }}
                          >
                            {result.delta > 0 ? '+' : ''}${result.delta}
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mt: 0.5
                        }}>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              In: ${result.in}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Out: ${result.out}
                            </Typography>
                          </Box>
                          {result.out > 0 && (
                            (user?.id === game.host_id || user?.id === result.user_id) && (
                              <Button
                                size="small"
                                startIcon={<MoneyIcon />}
                                disabled={!((user?.id === game.host_id ? result.payment?.payment_id : game.host?.payment?.payment_id))}
                                onClick={() => window.open(
                                  `https://venmo.com/${
                                    user?.id === game.host_id 
                                      ? (result.payment?.payment_id || result.user?.username)
                                      : (game.host?.payment?.payment_id || game.host?.username)
                                  }?txn=${user?.id === game.host_id ? 'pay' : 'request'}&amount=${result.out}&note=⛽`,
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
                                {((user?.id === game.host_id ? result.payment?.payment_id : game.host?.payment?.payment_id))
                                  ? (user?.id === game.host_id ? 'PAY' : 'REQUEST')
                                  : 'UNAVAILABLE'
                                }
                              </Button>
                            )
                          )}
                        </Box>
                      </Box>
                    ))}
                </Box>
              ) : (
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
                                <Tooltip title={rsvp.confirmed ? "Remove Confirmation" : "Confirm Player"}>
                                  <IconButton
                                    onClick={() => handleConfirmRSVP(rsvp.id, !rsvp.confirmed)}
                                    color={rsvp.confirmed ? "success" : "default"}
                                    size="small"
                                  >
                                    {rsvp.confirmed ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
                                  </IconButton>
                                </Tooltip>
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
              )}

              {user && user.id !== game.host_id && game.status !== 'completed' && (
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
                  {userRsvp 
                    ? 'Cancel RSVP' 
                    : isGameFull()
                    ? `Join Waitlist (#${rsvps.filter(r => r.waitlist_position !== null).length + 1})`
                    : `RSVP - $${game.reserve} Reservation`}
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
      <StyledDialog 
        open={editMode} 
        onClose={() => setEditMode(false)}
        maxWidth="md"
        fullWidth
      >
        <StyledDialogTitle>Edit Game</StyledDialogTitle>
        <StyledDialogContent>
          <EditGameForm 
            game={game}
            onSubmit={handleEditGame}
            onCancel={() => setEditMode(false)}
          />
        </StyledDialogContent>
      </StyledDialog>

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
            onClick={handleDeleteGame}
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