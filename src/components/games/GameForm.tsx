import { useState, useEffect } from 'react'
import { 
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
import { Game, GameStatus, SettlementType, League } from '../../types/database'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { StyledDialog } from '../styled/Layout'

interface GameFormProps {
  open: boolean
  onClose: () => void
  gameId?: string
  initialData?: Game
  onSuccess?: () => void
  onSubmit?: (gameId: string) => void
}

// Add a function to check if game has advanced settings
const hasAdvancedSettings = (game?: Game) => {
  if (!game) return false
  
  return (
    game.format !== 'cash' ||
    game.variant !== 'holdem' ||
    game.buyin_min > 0 ||
    game.blind_small > 0 ||
    game.blind_large > 0 ||
    game.reserve > 0 ||
    game.rebuy ||
    game.bomb_pots ||
    game.settlement_type !== 'centralized'
  )
}

// Update the form data interface
interface GameFormData {
  date_start: Date;
  time_start: string;
  street: string;
  city: string;
  zip: string;
  seats: number;
  buyin_min: number;
  buyin_max: number;
  reserve: number;
  reserve_type: 'buyin' | 'extra';
  format: 'cash' | 'tournament';
  variant: 'holdem' | 'omaha';
  note: string;
  league_id?: string | null;
  private?: boolean;
  blind_small: number;
  blind_large: number;
  rebuy?: boolean;
  bomb_pots?: boolean;
  settlement_type?: SettlementType;
  require_reservation?: boolean;
}

export default function GameForm({ open, onClose, gameId, initialData, onSuccess, onSubmit }: GameFormProps) {
  const { user } = useAuth()
  // Update mode initialization to check for advanced settings
  const [mode, setMode] = useState<'basic' | 'advanced'>(
    hasAdvancedSettings(initialData) ? 'advanced' : 'basic'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [leagues, setLeagues] = useState<League[]>([])

  // Add leagues fetch when component mounts
  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const { data, error } = await supabase
          .from('leagues')
          .select('*')
          .order('name')
        
        if (error) {
          return
        }
        
        setLeagues(data || [])
      } catch (error) {
        // Error handling
      }
    }

    fetchLeagues()
  }, [])

  // Update the initial form data
  const initialFormData: GameFormData = {
    date_start: new Date(),
    time_start: format(new Date(), 'HH:mm'),
    street: '',
    city: '',
    zip: '',
    seats: 9,
    buyin_min: 0,
    buyin_max: 100,
    reserve: 0,
    reserve_type: 'buyin',
    format: 'cash',
    variant: 'holdem',
    note: '',
    private: false,
    blind_small: 0,
    blind_large: 0,
    rebuy: false,
    bomb_pots: false,
    settlement_type: 'centralized',
    league_id: null,
  };

  const [formData, setFormData] = useState<GameFormData>(initialFormData)

  // Update useEffect to properly handle initialData
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialFormData,
        date_start: new Date(initialData.date_start),
        street: initialData.street || '',
        city: initialData.city,
        zip: initialData.zip || '',
        seats: initialData.seats,
        buyin_min: initialData.buyin_min,
        buyin_max: initialData.buyin_max,
        reserve: initialData.reserve,
        reserve_type: initialData.reserve_type as 'buyin' | 'extra',
        format: initialData.format,
        variant: initialData.variant,
        note: initialData.note || '',
        private: initialData.private,
        blind_small: initialData.blind_small || 0,
        blind_large: initialData.blind_large || 0,
        rebuy: initialData.rebuy,
        bomb_pots: initialData.bomb_pots,
        settlement_type: initialData.settlement_type,
        league_id: initialData.league_id || null,
        require_reservation: initialData.reserve > 0,
      });
    }
  }, [initialData]);

  const [validationErrors, setValidationErrors] = useState<{
    buyIn?: string;
    blinds?: string;
    date?: string;
    city?: string;
    reserve?: string;
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

    if (formData.blind_small > 0 && formData.blind_large > 0 && formData.blind_small > formData.blind_large) {
      errors.blinds = 'Small blind must be less than or equal to big blind'
    }

    if (!formData.city.trim()) {
      errors.city = 'City is required'
    }

    if (formData.require_reservation && (!formData.reserve || formData.reserve <= 0)) {
      errors.reserve = 'Reservation fee must be greater than 0'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      const gameData = {
        host_id: user.id,
        date_start: formData.date_start.toISOString(),
        street: formData.street,
        city: formData.city,
        zip: formData.zip,
        seats: formData.seats,
        buyin_min: formData.buyin_min,
        buyin_max: formData.buyin_max,
        reserve: formData.reserve,
        reserve_type: formData.reserve_type,
        format: formData.format,
        variant: formData.variant,
        note: formData.note,
        status: 'scheduled' as GameStatus,
        updated_at: new Date().toISOString(),
        private: formData.private,
        blind_small: formData.blind_small,
        blind_large: formData.blind_large,
        rebuy: formData.rebuy,
        bomb_pots: formData.bomb_pots,
        settlement_type: formData.settlement_type,
        league_id: formData.league_id,
      };

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

      if (gameId) {
        // Call onSubmit with the new game ID if provided
        if (onSubmit) {
          onSubmit(gameId)
        }
      }
    } catch (err) {
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
      setError('Failed to update reservations')
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
      setError('Failed to update seats')
    }
  }

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <>
      <StyledDialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 1
          }}>
            <Typography sx={{ 
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              fontWeight: 600
            }}>
              {gameId ? 'Edit Game' : 'Create New Game'}
            </Typography>
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
          <Grid 
            container 
            spacing={2} 
            sx={{ 
              mt: 2
            }}
          >
            {/* League selector */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="league-select-label">League</InputLabel>
                <Select
                  labelId="league-select-label"
                  id="league-select"
                  value={formData.league_id || ''}
                  onChange={(e) => handleChange('league_id', e.target.value || null)}
                  label="League"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {leagues.map((league) => (
                    <MenuItem key={league.id} value={league.id}>
                      {league.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Date picker */}
            <Grid item xs={12} md={6}>
              <DateTimePicker
                label="Date & Time"
                value={formData.date_start}
                onChange={(newValue) => {
                  if (newValue) {
                    setFormData(prev => ({ ...prev, date_start: newValue }));
                    setValidationErrors({ ...validationErrors, date: undefined });
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!validationErrors.date,
                    helperText: validationErrors.date
                  }
                }}
              />
            </Grid>

            {mode === 'advanced' && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Game Format</InputLabel>
                    <Select
                      value={formData.format}
                      label="Game Format"
                      onChange={(e) => setFormData({ ...formData, format: e.target.value as 'cash' | 'tournament' })}
                    >
                      <MenuItem value="cash">Cash Game</MenuItem>
                      <MenuItem value="tournament">Tournament</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Game Variant</InputLabel>
                    <Select
                      value={formData.variant}
                      label="Game Variant"
                      onChange={(e) => setFormData({ ...formData, variant: e.target.value as 'holdem' | 'omaha' })}
                    >
                      <MenuItem value="holdem">Texas Hold'em</MenuItem>
                      <MenuItem value="omaha">Pot Limit Omaha</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                label="Number of Seats"
                type="number"
                fullWidth
                value={formData.seats.toString()}
                onChange={async (e) => {
                  // Allow empty string temporarily during typing
                  const inputValue = e.target.value;
                  
                  // If the input is empty or not a valid number, set a temporary empty state
                  if (inputValue === '' || isNaN(parseInt(inputValue))) {
                    setFormData({ ...formData, seats: 0 }); // Temporary value during typing
                    return;
                  }
                  
                  // Parse the input value - allow any number during typing
                  const newSeats = parseInt(inputValue);
                  
                  // Update form data with the exact value typed (no validation during typing)
                  setFormData({ ...formData, seats: newSeats });
                  
                  // If editing an existing game, handle seat changes
                  // Only apply changes if the value is valid (>= 2)
                  if (gameId && newSeats >= 2) {
                    await handleSeatChange(newSeats);
                  }
                }}
                // Use onBlur to ensure a valid value when the field loses focus
                onBlur={() => {
                  if (formData.seats < 2) {
                    setFormData({ ...formData, seats: 2 });
                    
                    // If editing an existing game and we had to adjust the value, handle seat changes
                    if (gameId) {
                      handleSeatChange(2);
                    }
                  }
                }}
                inputProps={{ min: 2 }}
              />
            </Grid>

            {mode === 'advanced' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Min Buy-in"
                  type="number"
                  fullWidth
                  value={formData.buyin_min === 0 ? '0' : formData.buyin_min.toString()}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                    setFormData({ ...formData, buyin_min: value })
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
                value={formData.buyin_max === 0 ? '0' : formData.buyin_max.toString()}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                  setFormData({ ...formData, buyin_max: value })
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
                    value={formData.blind_small === 0 ? '0' : formData.blind_small.toString()}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setFormData({ ...formData, blind_small: value })
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
                    value={formData.blind_large === 0 ? '0' : formData.blind_large.toString()}
                    onChange={(e) => {
                      const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setFormData({ ...formData, blind_large: value })
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
                {/* Reservation controls */}
                <Grid container item xs={12} spacing={2}>
                  <Grid item xs={12} md={6}>
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
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Reservation Fee"
                        type="number"
                        value={formData.reserve === 0 ? '0' : formData.reserve.toString()}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                          if (value <= 0) {
                            setValidationErrors(prev => ({
                              ...prev,
                              reserve: 'Reservation fee must be greater than 0'
                            }))
                          } else {
                            setValidationErrors(prev => ({
                              ...prev,
                              reserve: undefined
                            }))
                          }
                          handleChange('reserve', value)
                        }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                        error={!!validationErrors.reserve}
                        helperText={validationErrors.reserve || "Amount required to secure a seat"}
                        inputProps={{ min: 1 }}
                      />

                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.reserve_type === 'buyin'}
                            onChange={(e) => handleChange('reserve_type', e.target.checked ? 'buyin' : 'fee')}
                          />
                        }
                        label={
                          <Box>
                            <Typography>Contributes to Buy-in</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Reservation fee is put towards the player's first buy-in
                            </Typography>
                          </Box>
                        }
                      />
                    </Grid>
                  )}
                </Grid>

                {/* Game feature toggles - moved inside advanced mode */}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.rebuy}
                        onChange={(e) => handleChange('rebuy', e.target.checked)}
                      />
                    }
                    label="Allow Rebuys"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.bomb_pots}
                        onChange={(e) => handleChange('bomb_pots', e.target.checked)}
                      />
                    }
                    label="Enable Bomb Pots"
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
                        disabled
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box>
                          <Typography>Decentralized Payments</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Players settle up directly with each other instead of through the host
                          </Typography>
                        </Box>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            bgcolor: 'primary.main', 
                            color: 'primary.contrastText',
                            px: 1, 
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.6875rem',
                            fontWeight: 'bold'
                          }}
                        >
                          COMING SOON
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
      </StyledDialog>

      <StyledDialog
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
      </StyledDialog>
    </>
  )
} 