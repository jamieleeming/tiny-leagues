import { useState } from 'react'
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  TextField,
  InputAdornment,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Button
} from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers'
import { GradientButton } from '../styled/Buttons'
import { supabase } from '../../config/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { Game, GameType, GameFormat } from '../../types/database'
import { useNavigate } from 'react-router-dom'

interface GameFormProps {
  open: boolean
  onClose: () => void
  gameId?: string
  initialData?: Game
  onSuccess?: () => void
}

// Add a function to check if game has advanced settings
const hasAdvancedSettings = (game?: Game) => {
  if (!game) return false
  
  return (
    game.type !== 'cash' ||
    game.format !== 'holdem' ||
    game.buyin_min > 0 ||
    game.blind_small > 0 ||
    game.blind_large > 0 ||
    game.reserve > 0 ||
    game.rebuy ||
    game.bomb_pots ||
    game.settlement_type !== 'centralized'
  )
}

export default function GameForm({ open, onClose, gameId, initialData, onSuccess }: GameFormProps) {
  const { user } = useAuth()
  // Update mode initialization to check for advanced settings
  const [mode, setMode] = useState<'basic' | 'advanced'>(
    hasAdvancedSettings(initialData) ? 'advanced' : 'basic'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    type: initialData?.type || 'cash',
    format: initialData?.format || 'holdem',
    settlement_type: initialData?.settlement_type || 'centralized',
    date_start: initialData?.date_start ? new Date(initialData.date_start) : new Date(),
    private: initialData?.private || false,
    street: initialData?.street || '',
    city: initialData?.city || '',
    zip: initialData?.zip || '',
    seats: initialData?.seats || 8,
    buyin_min: initialData?.buyin_min || 50,
    buyin_max: initialData?.buyin_max || 100,
    blind_small: initialData?.blind_small || 0.5,
    blind_large: initialData?.blind_large || 1,
    rebuy: initialData?.rebuy || false,
    note: initialData?.note || '',
    require_reservation: initialData?.reserve ? true : false,
    reserve: initialData?.reserve || 20,
    host_id: user?.id,
    status: initialData?.status || 'scheduled',
    bomb_pots: initialData?.bomb_pots || false
  })

  const [validationErrors, setValidationErrors] = useState<{
    buyIn?: string;
    blinds?: string;
    date?: string;
    city?: string;
  }>({})

  const navigate = useNavigate()
  const [showReservationWarning, setShowReservationWarning] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<typeof formData | null>(null)

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {}
    const now = new Date()

    if (formData.date_start && formData.date_start <= now) {
      errors.date = 'Game must start in the future'
    }

    if (formData.buyin_min >= formData.buyin_max) {
      errors.buyIn = 'Minimum buy-in must be less than maximum buy-in'
    }

    if (formData.blind_small >= formData.blind_large) {
      errors.blinds = 'Small blind must be less than big blind'
    }

    if (!formData.city.trim()) {
      errors.city = 'City is required'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    if (gameId && 
        initialData?.reserve === 0 && 
        formData.require_reservation && 
        formData.reserve > 0) {
      setPendingFormData(formData)
      setShowReservationWarning(true)
      return
    }

    try {
      setLoading(true)
      setError('')

      if (!user) throw new Error('No user found')

      const { require_reservation, ...gameDataWithoutUIFields } = formData

      const gameData = {
        ...gameDataWithoutUIFields,
        host_id: user.id,
        date_start: formData.date_start.toISOString(),
        updated_at: new Date().toISOString(),
        
        ...(mode === 'basic' && {
          type: 'cash',
          format: 'holdem',
          buyin_min: 0,
          blind_small: 0,
          blind_large: 0,
          reserve: 0,
          rebuy: false,
          bomb_pots: false,
          settlement_type: 'centralized'
        })
      }

      if (gameId) {
        const { error: updateError } = await supabase
          .from('games')
          .update(gameData)
          .eq('id', gameId)

        if (updateError) throw updateError
      } else {
        const { data: newGame, error: createError } = await supabase
          .from('games')
          .insert([{
            ...gameData,
            created_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (createError) throw createError
        
        navigate(`/games/${newGame.id}`)
      }

      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Error saving game:', err)
      setError('Failed to save game')
    } finally {
      setLoading(false)
    }
  }

  const handleReservationConfirm = async () => {
    if (!pendingFormData) return

    try {
      setLoading(true)
      
      // Remove UI-only fields before sending to database
      const { require_reservation, ...gameDataWithoutUIFields } = pendingFormData

      const gameData = {
        ...gameDataWithoutUIFields,
        updated_at: new Date().toISOString()
      }

      const { error: gameError } = await supabase
        .from('games')
        .update(gameData)
        .eq('id', gameId)

      if (gameError) throw gameError

      // Then unconfirm all non-host RSVPs
      const { error: rsvpError } = await supabase
        .from('rsvp')
        .update({ 
          confirmed: false,
          updated_at: new Date().toISOString()
        })
        .eq('game_id', gameId)
        .neq('user_id', initialData?.host_id)

      if (rsvpError) throw rsvpError

      setFormData(pendingFormData)
      setShowReservationWarning(false)
      setPendingFormData(null)
      onSuccess?.()
    } catch (err) {
      console.error('Error updating reservations:', err)
      setError('Failed to update reservation requirements')
    } finally {
      setLoading(false)
    }
  }

  const handleSeatChange = async (newSeats: number) => {
    try {
      if (!gameId || !initialData) return

      // Get all non-waitlist RSVPs ordered by creation date (newest first)
      const { data: rsvps, error: rsvpsError } = await supabase
        .from('rsvp')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true })

      if (rsvpsError) throw rsvpsError

      const activeRsvps = rsvps
        ?.filter(r => r.waitlist_position === null && r.user_id !== initialData.host_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || []

      const waitlistRsvps = rsvps
        ?.filter(r => r.waitlist_position !== null)
        .sort((a, b) => (a.waitlist_position || 0) - (b.waitlist_position || 0)) || []

      // Calculate how many seats are available (excluding host)
      const availableSeats = newSeats - 1
      const currentActivePlayers = activeRsvps.length

      if (availableSeats < currentActivePlayers) {
        // Move excess players to waitlist
        const playersToWaitlist = activeRsvps.slice(0, currentActivePlayers - availableSeats)
        for (let i = 0; i < playersToWaitlist.length; i++) {
          await supabase
            .from('rsvp')
            .update({ 
              waitlist_position: i,  // Put them at the start of the waitlist
              confirmed: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', playersToWaitlist[i].id)
        }

        // Reorder existing waitlist
        for (let i = 0; i < waitlistRsvps.length; i++) {
          await supabase
            .from('rsvp')
            .update({ 
              waitlist_position: i + playersToWaitlist.length,  // Shift existing waitlist down
              updated_at: new Date().toISOString()
            })
            .eq('id', waitlistRsvps[i].id)
        }
      }
    } catch (err) {
      console.error('Error handling seat change:', err)
      setError('Failed to update seats')
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography>{gameId ? 'Edit Game' : 'Create New Game'}</Typography>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, newMode) => newMode && setMode(newMode)}
              size="small"
            >
              <ToggleButton value="basic">Basic</ToggleButton>
              <ToggleButton value="advanced">Advanced</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {mode === 'advanced' && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Game Type</InputLabel>
                    <Select
                      value={formData.type}
                      label="Game Type"
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as GameType })}
                    >
                      <MenuItem value="cash">Cash Game</MenuItem>
                      <MenuItem value="tournament">Tournament</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Format</InputLabel>
                    <Select
                      value={formData.format}
                      label="Format"
                      onChange={(e) => setFormData({ ...formData, format: e.target.value as GameFormat })}
                    >
                      <MenuItem value="holdem">Texas Hold'em</MenuItem>
                      <MenuItem value="omaha">Pot Limit Omaha</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12} sm={6}>
              <DateTimePicker
                label="Start Time"
                value={formData.date_start}
                onChange={(newValue) => {
                  if (newValue) {
                    setFormData({ ...formData, date_start: newValue })
                    setValidationErrors({ ...validationErrors, date: undefined })
                  }
                }}
                sx={{ width: '100%' }}
                slotProps={{
                  textField: {
                    error: !!validationErrors.date,
                    helperText: validationErrors.date
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Number of Seats"
                type="number"
                fullWidth
                value={formData.seats}
                onChange={async (e) => {
                  const newSeats = parseInt(e.target.value)
                  setFormData({ ...formData, seats: newSeats })
                  
                  // If editing an existing game, handle seat changes
                  if (gameId) {
                    await handleSeatChange(newSeats)
                  }
                }}
                inputProps={{ min: 2, max: 10 }}
              />
            </Grid>

            {mode === 'advanced' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Min Buy-in"
                  type="number"
                  fullWidth
                  value={formData.buyin_min}
                  onChange={(e) => {
                    setFormData({ ...formData, buyin_min: parseInt(e.target.value) })
                    setValidationErrors({ ...validationErrors, buyIn: undefined })
                  }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                  error={!!validationErrors.buyIn}
                  helperText={validationErrors.buyIn}
                />
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                label="Max Buy-in"
                type="number"
                fullWidth
                value={formData.buyin_max}
                onChange={(e) => {
                  setFormData({ ...formData, buyin_max: parseInt(e.target.value) })
                  setValidationErrors({ ...validationErrors, buyIn: undefined })
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
                error={!!validationErrors.buyIn}
                helperText={validationErrors.buyIn}
              />
            </Grid>

            {mode === 'advanced' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Small Blind"
                    type="number"
                    fullWidth
                    value={formData.blind_small}
                    onChange={(e) => {
                      setFormData({ ...formData, blind_small: parseFloat(e.target.value) })
                      setValidationErrors({ ...validationErrors, blinds: undefined })
                    }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                    error={!!validationErrors.blinds}
                    helperText={validationErrors.blinds}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Big Blind"
                    type="number"
                    fullWidth
                    value={formData.blind_large}
                    onChange={(e) => {
                      setFormData({ ...formData, blind_large: parseFloat(e.target.value) })
                      setValidationErrors({ ...validationErrors, blinds: undefined })
                    }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                    error={!!validationErrors.blinds}
                    helperText={validationErrors.blinds}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <TextField
                label="Street Address"
                fullWidth
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="City"
                fullWidth
                value={formData.city}
                onChange={(e) => {
                  setFormData({ ...formData, city: e.target.value })
                  if (e.target.value.trim()) {
                    setValidationErrors({ ...validationErrors, city: undefined })
                  }
                }}
                required
                error={!!validationErrors.city}
                helperText={validationErrors.city || "City is required"}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="ZIP Code"
                fullWidth
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.private}
                    onChange={(e) => setFormData({ ...formData, private: e.target.checked })}
                  />
                }
                label={
                  <Box>
                    <Typography>Private Game</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      This game will not appear on the main games page
                    </Typography>
                  </Box>
                }
              />
            </Grid>

            {mode === 'advanced' && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.require_reservation}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          require_reservation: e.target.checked,
                          reserve: e.target.checked ? prev.reserve : 0
                        }))}
                      />
                    }
                    label={
                      <Box>
                        <Typography>Require Reservation</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Players must pay up-front to reserve a seat
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
                {formData.require_reservation && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Reservation Fee"
                      type="number"
                      fullWidth
                      value={formData.reserve}
                      onChange={(e) => setFormData({ ...formData, reserve: parseInt(e.target.value) })}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                      }}
                    />
                  </Grid>
                )}

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.bomb_pots}
                        onChange={(e) => setFormData({ ...formData, bomb_pots: e.target.checked })}
                      />
                    }
                    label={
                      <Box>
                        <Typography>Include Bomb Pots</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Variety games triggered by a pre-set condition (such as suited flop)
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.rebuy}
                        onChange={(e) => setFormData({ ...formData, rebuy: e.target.checked })}
                      />
                    }
                    label="Allow Rebuys"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.settlement_type === 'decentralized'}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          settlement_type: e.target.checked ? 'decentralized' : 'centralized'
                        }))}
                      />
                    }
                    label={
                      <Box>
                        <Typography>Decentralized Payments</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Players settle up directly with each other instead of through the host
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <TextField
                label="Additional Notes"
                fullWidth
                multiline
                rows={4}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              />
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <GradientButton onClick={onClose} variant="outlined">
            Cancel
          </GradientButton>
          <GradientButton onClick={handleSubmit} disabled={loading}>
            {gameId ? 'Save Changes' : 'Create Game'}
          </GradientButton>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showReservationWarning}
        onClose={() => {
          setShowReservationWarning(false)
          setPendingFormData(null)
        }}
      >
        <DialogTitle>Warning: Reservation Requirement Change</DialogTitle>
        <DialogContent>
          <Typography>
            Adding a reservation requirement will unconfirm all existing RSVPs (except yours). 
            Players will need to pay the reservation fee to confirm their spots.
          </Typography>
          <Typography sx={{ mt: 2 }} color="warning.main">
            Are you sure you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setShowReservationWarning(false)
              setPendingFormData(null)
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleReservationConfirm}
            variant="contained"
            color="primary"
          >
            Confirm Changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
} 