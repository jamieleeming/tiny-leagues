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
  FormHelperText
} from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabaseClient'
import { GameType, GameFormat } from '../types/database'

const CreateGame = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [game, setGame] = useState({
    type: 'cash' as GameType,
    format: 'nlhe' as GameFormat,
    date_start: new Date(),
    private: false,
    street: '',
    city: '',
    zip: '',
    seats: 9,
    buyin_min: 20,
    buyin_max: 200,
    blind_small: 1,
    blind_large: 2,
    rebuy: true,
    note: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setLoading(true)
      setError('')

      // Validate form
      if (game.buyin_min > game.buyin_max) {
        throw new Error('Minimum buy-in cannot be greater than maximum buy-in')
      }

      if (game.blind_small >= game.blind_large) {
        throw new Error('Small blind must be less than big blind')
      }

      if (game.seats < 2 || game.seats > 10) {
        throw new Error('Number of seats must be between 2 and 10')
      }

      const { error: createError } = await supabase
        .from('games')
        .insert({
          ...game,
          host_id: user.id,
          date_start: game.date_start.toISOString(),
          date_end: null // We can add end time later if needed
        })

      if (createError) throw createError

      navigate('/games')
    } catch (err) {
      console.error('Error creating game:', err)
      setError(err instanceof Error ? err.message : 'Failed to create game')
    } finally {
      setLoading(false)
    }
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
                    <MenuItem value="nlhe">No Limit Hold'em</MenuItem>
                    <MenuItem value="plo">Pot Limit Omaha</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Start Time"
                  value={game.date_start}
                  onChange={(newValue) => newValue && setGame({ ...game, date_start: newValue })}
                  sx={{ width: '100%' }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Number of Seats"
                  type="number"
                  fullWidth
                  value={game.seats}
                  onChange={(e) => setGame({ ...game, seats: parseInt(e.target.value) })}
                  inputProps={{ min: 2, max: 10 }}
                  helperText="Between 2 and 10 players"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Min Buy-in ($)"
                  type="number"
                  fullWidth
                  value={game.buyin_min}
                  onChange={(e) => setGame({ ...game, buyin_min: parseInt(e.target.value) })}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Max Buy-in ($)"
                  type="number"
                  fullWidth
                  value={game.buyin_max}
                  onChange={(e) => setGame({ ...game, buyin_max: parseInt(e.target.value) })}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Small Blind ($)"
                  type="number"
                  fullWidth
                  value={game.blind_small}
                  onChange={(e) => setGame({ ...game, blind_small: parseFloat(e.target.value) })}
                  inputProps={{ min: 0, step: 0.5 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Big Blind ($)"
                  type="number"
                  fullWidth
                  value={game.blind_large}
                  onChange={(e) => setGame({ ...game, blind_large: parseFloat(e.target.value) })}
                  inputProps={{ min: 0, step: 1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Street Address"
                  fullWidth
                  value={game.street}
                  onChange={(e) => setGame({ ...game, street: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="City"
                  fullWidth
                  value={game.city}
                  onChange={(e) => setGame({ ...game, city: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="ZIP Code"
                  fullWidth
                  value={game.zip}
                  onChange={(e) => setGame({ ...game, zip: e.target.value })}
                  required
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
            </Grid>
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