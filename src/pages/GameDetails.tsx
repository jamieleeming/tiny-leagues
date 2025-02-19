import { useState, useEffect, Fragment } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Chip,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Chat as ChatIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PlayArrow as StartIcon,
  Stop as EndIcon,
  Cancel as CancelIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material'
import { format } from 'date-fns'
import { supabase } from '../config/supabaseClient'
import { Game, RSVP, GameStatus, Result } from '../types/database'
import { useAuth } from '../contexts/AuthContext'
import { EditGameForm } from '../components/games/EditGameForm'
import { GameResultsDialog } from '../components/games/GameResultsDialog'
import { ChatSection } from '../components/games/ChatSection'
import { linkifyText } from '../utils/textUtils'

const GameDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const theme = useTheme()
  const { user } = useAuth()
  const [game, setGame] = useState<Game | null>(null)
  const [rsvps, setRsvps] = useState<RSVP[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<any[]>([])
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
      
      // Fetch game with host information
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select(`
          *,
          host:users(
            username,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('id', id)
        .single()

      if (gameError) throw gameError
      if (!gameData) throw new Error('Game not found')

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
      console.error('Error fetching game details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load game details')
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
      if (!user || !game) return

      if (userRsvp) {
        // Cancel RSVP
        const { error } = await supabase
          .from('rsvp')
          .delete()
          .eq('id', userRsvp.id)

        if (error) throw error
        setUserRsvp(null)

        // Reorder waitlist after cancellation
        if (userRsvp.waitlist_position !== null) {
          // Get all waitlisted RSVPs after the cancelled one
          const { data: waitlistRsvps, error: fetchError } = await supabase
            .from('rsvp')
            .select('id, waitlist_position')
            .eq('game_id', game.id)
            .gt('waitlist_position', userRsvp.waitlist_position)
            .order('waitlist_position', { ascending: true })

          if (fetchError) throw fetchError

          // Update each RSVP's position
          for (const rsvp of waitlistRsvps || []) {
            const { error: updateError } = await supabase
              .from('rsvp')
              .update({ 
                waitlist_position: (rsvp.waitlist_position as number) - 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', rsvp.id)

            if (updateError) throw updateError
          }
        }
      } else {
        // Get current waitlist position if game is full
        const waitlistPosition = isGameFull() ? 
          (rsvps.filter(r => r.waitlist_position !== null).length > 0
            ? Math.max(...rsvps
                .filter(r => r.waitlist_position !== null)
                .map(r => r.waitlist_position || 0)) + 1
            : 0) : null

        // Create RSVP with waitlist position if game is full
        const { data, error } = await supabase
          .from('rsvp')
          .insert({
            game_id: game.id,
            user_id: user.id,
            confirmed: false,
            waitlist_position: waitlistPosition,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) throw error
        setUserRsvp(data)
      }

      fetchGameDetails()
    } catch (err) {
      console.error('Error updating RSVP:', err)
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
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  if (error || !game) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error || 'Game not found'}
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/games')}
          sx={{ mb: 2 }}
        >
          Back to Games
        </Button>

        <Paper sx={{ p: 4 }}>
          <Grid container spacing={4}>
            {/* Game Details Section */}
            <Grid item xs={12} lg={8}>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h4">
                    {game.type === 'cash' ? 'Cash Game' : 'Tournament'}
                  </Typography>
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
                
                {user?.id === game.host_id && (
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    {/* Primary Actions based on game status */}
                    <Box>
                      {game.status === 'scheduled' && (
                        <Button
                          startIcon={<StartIcon />}
                          variant="contained"
                          color="primary"
                          onClick={() => handleStatusUpdate('in_progress')}
                          sx={{ mr: 1 }}
                        >
                          Start Game
                        </Button>
                      )}
                      {game.status === 'in_progress' && (
                        <Button
                          startIcon={<EndIcon />}
                          variant="contained"
                          color="primary"
                          onClick={() => handleStatusUpdate('completed')}
                        >
                          End Game
                        </Button>
                      )}
                    </Box>

                    {/* Secondary Actions */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        startIcon={<EditIcon />}
                        variant="outlined"
                        onClick={() => setEditMode(true)}
                      >
                        Edit
                      </Button>
                      
                      {game.status === 'scheduled' && (
                        <Button
                          startIcon={<CancelIcon />}
                          variant="outlined"
                          color="error"
                          onClick={() => setDeleteDialogOpen(true)}
                        >
                          Cancel
                        </Button>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Details</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography>
                        {format(new Date(game.date_start!), 'PPP p')}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography>
                        {game.street || game.city || game.zip
                          ? [
                              game.street,
                              game.city,
                              game.zip
                            ]
                              .filter(Boolean)  // Remove empty values
                              .join(', ')      // Join with commas
                          : 'Location TBD'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <MoneyIcon sx={{ mr: 1, color: 'text.secondary' }} />
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
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <MoneyIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography>
                        Reservation Fee: ${game.reserve}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography>
                        {rsvps.length} / {game.seats} players
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>

              {game.note && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Additional Info</Typography>
                  <Typography color="text.secondary">
                    {linkifyText(game.note)}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Host Information</Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2,
                    background: alpha(theme.palette.background.paper, 0.5)
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography>
                          {game.host?.first_name} {game.host?.last_name}
                        </Typography>
                      </Box>
                    </Grid>
                    {user && game.host?.email && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Contact: {game.host.email}
                          {game.host.phone && ` • ${game.host.phone}`}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Box>
            </Grid>

            {/* Players Section - Will appear after host info on mobile */}
            <Grid item xs={12} lg={4} order={{ xs: 3, lg: 2 }}>
              {game.status !== 'completed' ? (
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2,
                    background: alpha(theme.palette.background.paper, 0.5)
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    Players ({rsvps.filter(r => r.waitlist_position === null).length}/{game.seats})
                    {rsvps.filter(r => r.waitlist_position !== null).length > 0 && (
                      <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                        • {rsvps.filter(r => r.waitlist_position !== null).length} on waitlist
                      </Typography>
                    )}
                  </Typography>
                  
                  {rsvps.length > 0 ? (
                    <List>
                      {sortedRsvps().map((rsvp, index, array) => {
                        // Add divider before first waitlisted player
                        const showDivider = index > 0 && 
                          array[index-1].waitlist_position === null && 
                          rsvp.waitlist_position !== null

                        return (
                          <Fragment key={rsvp.id}>
                            {showDivider && (
                              <Box sx={{ px: 2, py: 1 }}>
                                <Divider>
                                  <Typography variant="body2" color="text.secondary">
                                    Waitlist
                                  </Typography>
                                </Divider>
                              </Box>
                            )}
                            <ListItem 
                              sx={{
                                borderRadius: 1,
                                mb: 1,
                                '&:hover': {
                                  bgcolor: alpha(theme.palette.primary.main, 0.1)
                                }
                              }}
                              secondaryAction={
                                user?.id === game.host_id && rsvp.user_id !== game.host_id && (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Tooltip title={rsvp.confirmed ? "Remove Confirmation" : "Confirm Reservation"}>
                                      <IconButton
                                        onClick={() => handleConfirmRSVP(rsvp.id, !rsvp.confirmed)}
                                        color={rsvp.confirmed ? "success" : "default"}
                                      >
                                        {rsvp.confirmed ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Remove Player">
                                      <IconButton
                                        onClick={() => handleRemovePlayer(rsvp.id)}
                                        color="error"
                                      >
                                        <DeleteIcon />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                )
                              }
                            >
                              <ListItemAvatar>
                                <Avatar sx={{ 
                                  bgcolor: rsvp.user_id === game.host_id 
                                    ? theme.palette.primary.main 
                                    : rsvp.confirmed
                                    ? theme.palette.success.main
                                    : theme.palette.secondary.main 
                                }}>
                                  {rsvp.user?.first_name?.[0] || rsvp.user?.username?.[0] || <PersonIcon />}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText 
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                                }
                                secondary={
                                  <Typography variant="body2" color="text.secondary">
                                    {rsvp.user?.username}
                                    {rsvp.user_id === user?.id && " (You)"}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          </Fragment>
                        )
                      })}
                    </List>
                  ) : (
                    <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                      No players have RSVP'd yet
                    </Typography>
                  )}

                  {user && user.id !== game.host_id && (
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
                </Paper>
              ) : null}
            </Grid>

            {/* Ledger and Chat Section */}
            <Grid item xs={12} lg={8} order={{ xs: 4, lg: 3 }}>
              {game.status === 'completed' && (
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Ledger</Typography>
                    {user?.id === game.host_id && (
                      <Button
                        startIcon={<EditIcon />}
                        variant="outlined"
                        size="small"
                        onClick={() => setShowResults(true)}
                      >
                        Edit Results
                      </Button>
                    )}
                  </Box>
                  <Paper 
                    variant="outlined"
                    sx={{ 
                      p: 2,
                      background: alpha(theme.palette.background.paper, 0.5)
                    }}
                  >
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Player</TableCell>
                            <TableCell align="right">Buy In</TableCell>
                            <TableCell align="right">Cash Out</TableCell>
                            <TableCell align="right">Net</TableCell>
                            {game.status === 'completed' && game.host_id === user?.id && (
                              <TableCell align="right">Settle</TableCell>
                            )}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {results.map((result) => {
                            const net = result.out - result.in
                            return (
                              <TableRow 
                                key={result.id}
                                sx={{ 
                                  '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.05)
                                  }
                                }}
                              >
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Avatar 
                                      sx={{ 
                                        width: 32, 
                                        height: 32,
                                        bgcolor: result.user_id === game.host_id 
                                          ? theme.palette.primary.main
                                          : theme.palette.secondary.main
                                      }}
                                    >
                                      {result.user?.first_name?.[0] || <PersonIcon />}
                                    </Avatar>
                                    <Box>
                                      <Typography>
                                        {result.user?.first_name} {result.user?.last_name}
                                        {result.user_id === game.host_id && (
                                          <Chip 
                                            label="Host" 
                                            size="small" 
                                            color="primary"
                                            sx={{ ml: 1 }}
                                          />
                                        )}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell align="right">${result.in.toLocaleString()}</TableCell>
                                <TableCell align="right">${result.out.toLocaleString()}</TableCell>
                                <TableCell 
                                  align="right"
                                  sx={{ 
                                    color: net > 0 ? 'success.main' : net < 0 ? 'error.main' : 'text.primary',
                                    fontWeight: 600
                                  }}
                                >
                                  {net > 0 ? '+' : ''}${Math.abs(net).toLocaleString()}
                                </TableCell>
                                {game.status === 'completed' && game.host_id === user?.id && (
                                  <TableCell align="right">
                                    {result.out > 0 && result.payment?.payment_id && (
                                      <Button
                                        variant="contained"
                                        size="small"
                                        endIcon={<OpenInNewIcon />}
                                        href={`https://venmo.com/${result.payment.payment_id}?txn=pay&note=⛽&amount=${result.out}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        Pay
                                      </Button>
                                    )}
                                  </TableCell>
                                )}
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Box 
                      sx={{ 
                        mt: 3,
                        pt: 2, 
                        borderTop: 1,
                        borderColor: 'divider',
                        display: 'flex', 
                        justifyContent: 'flex-end' 
                      }}
                    >
                      <Typography variant="h6">
                        Total: ${results.reduce((sum, r) => sum + r.delta, 0).toLocaleString()}
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              )}

              {user && (userRsvp || game.host_id === user.id) && (
                <ChatSection 
                  gameId={game.id}
                  userId={user.id}
                  isParticipant={Boolean(userRsvp || game.host_id === user.id)}
                />
              )}
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Dialogs */}
      <Dialog 
        open={editMode} 
        onClose={() => setEditMode(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Game</DialogTitle>
        <DialogContent>
          <EditGameForm 
            game={game}
            onSubmit={handleEditGame}
            onCancel={() => setEditMode(false)}
          />
        </DialogContent>
      </Dialog>

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
    </Container>
  )
}

export default GameDetails