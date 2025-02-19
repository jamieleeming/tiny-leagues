import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Alert,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  FormHelperText,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabaseClient'
import { Game, GameType, GameFormat } from '../types/database'
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material'
import { alpha } from '@mui/material/styles'

// Update the GameFormData type to include date_end and status
type GameFormData = Omit<Game, 'date_start' | 'id' | 'host_id' | 'created_at' | 'updated_at'> & {
  date_start: Date
}

const CreateGame = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [game, setGame] = useState<GameFormData>({
    type: 'cash' as GameType,
    format: 'holdem' as GameFormat,
    date_start: new Date(),
    date_end: null,
    private: false,
    street: '',
    city: '',
    zip: '',
    seats: 8,
    buyin_min: 50,
    buyin_max: 100,
    blind_small: 1,
    blind_large: 2,
    rebuy: true,
    note: '',
    reserve: 20,
    status: 'scheduled',
    settlement_type: 'centralized'
  })

  // Add validation state
  const [validationErrors, setValidationErrors] = useState<{
    buyIn?: string;
    blinds?: string;
    date?: string;
  }>({})

  // Add validation function
  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {}
    const now = new Date()

    // Validate date
    if (game.date_start && new Date(game.date_start) <= now) {
      errors.date = 'Game must start in the future'
    }

    // Validate buy-in
    if (game.buyin_min && game.buyin_max && game.buyin_min >= game.buyin_max) {
      errors.buyIn = 'Minimum buy-in must be less than maximum buy-in'
    }

    // Validate blinds
    if (game.blind_small && game.blind_large && game.blind_small >= game.blind_large) {
      errors.blinds = 'Small blind must be less than big blind'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      setError('')

      // Debug log to see full user object
      console.log('Current user:', user)

      // First verify the user exists in the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')  // Select all fields to see what we get
        .eq('id', user.id)

      // Debug log for user query results
      console.log('User query result:', { userData, userError })

      if (userError) {
        console.error('User verification error:', userError)
        throw new Error('Unable to verify user profile')
      }

      if (!userData || userData.length === 0) {
        // If user doesn't exist, create profile
        const { error: createProfileError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            type: 'user'
          })

        if (createProfileError) {
          console.error('Profile creation error:', createProfileError)
          throw new Error('Failed to create user profile')
        }
      }

      // Then create the game with proper date conversion
      const { error: createError } = await supabase
        .from('games')
        .insert({
          ...game,
          host_id: user.id,
          date_start: game.date_start.toISOString(),
          date_end: null,
          status: 'scheduled',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Game creation error:', createError)
        throw createError
      }

      navigate('/games')
    } catch (err) {
      console.error('Error creating game:', err)
      setError(err instanceof Error ? err.message : 'Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  // Add this function at the top of the component
  const preventScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    e.target instanceof HTMLElement && e.target.blur()
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Host a Game
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Game Type</InputLabel>
                  <Select
                    value={game.type}
                    label="Game Type"
                    onChange={(e) => setGame({ ...game, type: e.target.value as GameType })}
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
                    value={game.format}
                    label="Format"
                    onChange={(e) => setGame({ ...game, format: e.target.value as GameFormat })}
                  >
                    <MenuItem value="holdem">Texas Hold'em</MenuItem>
                    <MenuItem value="omaha">Pot Limit Omaha</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Start Time"
                  value={game.date_start}
                  onChange={(newValue) => {
                    if (newValue) {
                      setGame({ ...game, date_start: newValue })
                      setValidationErrors({ ...validationErrors, date: undefined })
                    }
                  }}
                  sx={{ width: '100%' }}
                  ampm={true}
                  timeSteps={{ hours: 1, minutes: 15 }}
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
                  value={game.seats}
                  onChange={(e) => setGame({ ...game, seats: parseInt(e.target.value) })}
                  onWheel={preventScroll}
                  inputProps={{ 
                    min: 2, 
                    max: 10,
                    inputMode: 'numeric',
                    style: { WebkitAppearance: 'none', MozAppearance: 'textfield' }
                  }}
                  helperText="Between 2 and 10 players"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Min Buy-in ($)"
                  type="number"
                  fullWidth
                  value={game.buyin_min}
                  onChange={(e) => {
                    setGame({ ...game, buyin_min: parseInt(e.target.value) })
                    setValidationErrors({ ...validationErrors, buyIn: undefined })
                  }}
                  onWheel={preventScroll}
                  inputProps={{ 
                    min: 0,
                    inputMode: 'numeric',
                    style: { WebkitAppearance: 'none', MozAppearance: 'textfield' }
                  }}
                  error={!!validationErrors.buyIn}
                  helperText={validationErrors.buyIn}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Max Buy-in ($)"
                  type="number"
                  fullWidth
                  value={game.buyin_max}
                  onChange={(e) => {
                    setGame({ ...game, buyin_max: parseInt(e.target.value) })
                    setValidationErrors({ ...validationErrors, buyIn: undefined })
                  }}
                  onWheel={preventScroll}
                  inputProps={{ 
                    min: 0,
                    inputMode: 'numeric',
                    style: { WebkitAppearance: 'none', MozAppearance: 'textfield' }
                  }}
                  error={!!validationErrors.buyIn}
                  helperText={validationErrors.buyIn}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reservation Fee"
                  name="reserve"
                  type="number"
                  value={game.reserve}
                  onChange={(e) => setGame({ ...game, reserve: parseInt(e.target.value) })}
                  onWheel={preventScroll}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                  inputProps={{ 
                    inputMode: 'numeric',
                    style: { WebkitAppearance: 'none', MozAppearance: 'textfield' }
                  }}
                  helperText="Amount required to secure a seat"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Small Blind"
                  type="number"
                  value={game.blind_small}
                  onChange={(e) => setGame({ ...game, blind_small: parseFloat(e.target.value) })}
                  onWheel={preventScroll}
                  error={!!validationErrors.blinds}
                  helperText={validationErrors.blinds}
                  inputProps={{ 
                    inputMode: 'numeric',
                    style: { WebkitAppearance: 'none', MozAppearance: 'textfield' }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Big Blind"
                  type="number"
                  value={game.blind_large}
                  onChange={(e) => setGame({ ...game, blind_large: parseFloat(e.target.value) })}
                  onWheel={preventScroll}
                  error={!!validationErrors.blinds}
                  helperText={validationErrors.blinds}
                  inputProps={{ 
                    inputMode: 'numeric',
                    style: { WebkitAppearance: 'none', MozAppearance: 'textfield' }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Street Address"
                  fullWidth
                  value={game.street}
                  onChange={(e) => setGame({ ...game, street: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="City"
                  fullWidth
                  value={game.city}
                  onChange={(e) => setGame({ ...game, city: e.target.value })}
                  required
                  helperText="City is required"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="ZIP Code"
                  fullWidth
                  value={game.zip}
                  onChange={(e) => setGame({ ...game, zip: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Additional Notes"
                  fullWidth
                  multiline
                  rows={4}
                  value={game.note}
                  onChange={(e) => setGame({ ...game, note: e.target.value })}
                  helperText="Optional: Add any additional information about the game"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={game.private}
                      onChange={(e) => setGame({ ...game, private: e.target.checked })}
                    />
                  }
                  label="Private Game"
                />
                <FormHelperText>Private games are only visible to invited players</FormHelperText>
              </Grid>
            </Grid>

            {/* Move to advanced settings */}
            <Accordion 
              sx={{ 
                mt: 3,
                width: '100%',
                maxWidth: '100%',
                background: 'transparent',
                '&.MuiAccordion-root': {
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:before': {
                    display: 'none',
                  },
                },
                '& .MuiAccordionSummary-root': {
                  minHeight: 64,
                  borderRadius: '12px',
                  '&:hover': {
                    backgroundColor: alpha('#FFFFFF', 0.05),
                  },
                  '&.Mui-expanded': {
                    borderRadius: '12px 12px 0 0',
                  }
                },
                '& .MuiAccordionDetails-root': {
                  maxWidth: '100%',
                  overflow: 'hidden',
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  pt: 3
                }
              }}
            >
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  width: '100%',
                  maxWidth: '100%',
                  '& .MuiAccordionSummary-content': {
                    my: 0
                  }
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 500 }}>Advanced Settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3} sx={{ width: '100%', m: 0 }}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={game.rebuy}
                          onChange={(e) => setGame({ ...game, rebuy: e.target.checked })}
                        />
                      }
                      label="Allow Rebuys"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={game.settlement_type === 'decentralized'}
                          onChange={(e) => setGame({ ...game, settlement_type: e.target.checked ? 'decentralized' : 'centralized' })}
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
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 4 }}
            >
              Create Game
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default CreateGame 