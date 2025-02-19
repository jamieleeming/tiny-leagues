import { useState } from 'react'
import {
  Box,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  InputAdornment,
  Typography
} from '@mui/material'
import { DateTimePicker } from '@mui/x-date-pickers'
import { Game, GameType, GameFormat } from '../../types/database'

interface EditGameFormProps {
  game: Game
  onSubmit: (updatedGame: Partial<Game>) => void
  onCancel: () => void
}

export const EditGameForm = ({ game, onSubmit, onCancel }: EditGameFormProps) => {
  const [formData, setFormData] = useState({
    type: game.type,
    format: game.format,
    settlement_type: game.settlement_type,
    date_start: new Date(game.date_start!),
    private: game.private,
    street: game.street,
    city: game.city,
    zip: game.zip,
    seats: game.seats,
    buyin_min: game.buyin_min,
    buyin_max: game.buyin_max,
    blind_small: game.blind_small,
    blind_large: game.blind_large,
    rebuy: game.rebuy,
    note: game.note,
    reserve: game.reserve
  })

  const [validationErrors, setValidationErrors] = useState<{
    buyIn?: string;
    blinds?: string;
    date?: string;
  }>({})

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {}
    const now = new Date()

    if (formData.date_start && new Date(formData.date_start) <= now) {
      errors.date = 'Game must start in the future'
    }

    if (formData.buyin_min && formData.buyin_max && formData.buyin_min >= formData.buyin_max) {
      errors.buyIn = 'Minimum buy-in must be less than maximum buy-in'
    }

    if (formData.blind_small && formData.blind_large && formData.blind_small >= formData.blind_large) {
      errors.blinds = 'Small blind must be less than big blind'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    onSubmit({
      ...formData,
      date_start: formData.date_start.toISOString(),
      updated_at: new Date().toISOString()
    })
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Grid container spacing={3}>
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
            onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) })}
            inputProps={{ min: 2, max: 10 }}
          />
        </Grid>
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
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
            helperText="City is required"
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
          <TextField
            label="Additional Notes"
            fullWidth
            multiline
            rows={4}
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
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
            label="Private Game"
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
            sx={{ mt: 2, mb: 1 }}
          />
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="contained">
          Save Changes
        </Button>
      </Box>
    </Box>
  )
} 