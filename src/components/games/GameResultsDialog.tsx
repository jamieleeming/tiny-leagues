import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  Box
} from '@mui/material'
import { RSVP, Result } from '../../types/database'
import { supabase } from '../../config/supabaseClient'

interface GameResultsDialogProps {
  open: boolean
  onClose: () => void
  gameId: string
  players: RSVP[]
  onComplete: () => void
  existingResults?: Result[]
  isEdit?: boolean
}

interface PlayerResult {
  rsvpId: string
  userId: string
  name: string
  buyIn: number
  cashOut: number
  delta: number
}

export const GameResultsDialog = ({ 
  open, 
  onClose, 
  gameId, 
  players,
  onComplete,
  existingResults,
  isEdit = false
}: GameResultsDialogProps) => {
  const [results, setResults] = useState<PlayerResult[]>(
    existingResults 
      ? existingResults.map(r => ({
          rsvpId: r.rsvp_id,
          userId: r.user_id,
          name: `${r.user?.first_name} ${r.user?.last_name}`,
          buyIn: r.in || 0,
          cashOut: r.out || 0,
          delta: r.delta || 0
        }))
      : players
          .filter(p => !p.waitlist_position)
          .map(p => ({
            rsvpId: p.id,
            userId: p.user_id,
            name: `${p.user?.first_name} ${p.user?.last_name}`,
            buyIn: 0,
            cashOut: 0,
            delta: 0
          }))
  )

  const handleInputChange = (
    index: number, 
    field: 'buyIn' | 'cashOut', 
    value: string
  ) => {
    console.log('Input change:', { index, field, value })
    const newResults = [...results]
    const numValue = value === '' ? 0 : Number(value)
    newResults[index][field] = numValue
    newResults[index].delta = newResults[index].cashOut - newResults[index].buyIn
    console.log('Updated results:', newResults)
    setResults(newResults)
  }

  const isBalanced = () => {
    const total = results.reduce((sum, r) => sum + r.delta, 0)
    const balanced = Math.abs(total) < 0.01
    console.log('Balance check:', { total, balanced })
    return balanced
  }

  const handleSubmit = async () => {
    try {
      console.log('Starting handleSubmit...')
      console.log('Current results:', results)

      // Upsert results
      console.log('Upserting results...')
      const insertData = results.map(r => ({
        game_id: gameId,
        user_id: r.userId,
        in: r.buyIn,
        out: r.cashOut,
        delta: r.delta,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      console.log('Upsert payload:', insertData)

      const { data: upsertedData, error } = await supabase
        .from('results')
        .upsert(insertData, {
          onConflict: 'game_id,user_id',
          ignoreDuplicates: false
        })
        .select()

      console.log('Upsert response:', { data: upsertedData, error })

      if (error) {
        console.error('Error saving results:', error)
        throw error
      }
      
      console.log('Results saved successfully')
      onComplete()
    } catch (err) {
      console.error('Error in handleSubmit:', err)
      if (err instanceof Error) {
        console.error('Error details:', {
          message: err.message,
          stack: err.stack
        })
      }
    }
  }

  const total = results.reduce((sum, r) => sum + r.delta, 0)

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>{isEdit ? 'Edit Game Results' : 'Log Game Results'}</DialogTitle>
      <DialogContent>
        <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="40%">Player</TableCell>
                <TableCell align="right" width="20%">Buy-in ($)</TableCell>
                <TableCell align="right" width="20%">Cash-out ($)</TableCell>
                <TableCell align="right" width="20%" sx={{ minWidth: 100 }}>Net</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((result, index) => (
                <TableRow key={result.rsvpId}>
                  <TableCell width="40%">{result.name}</TableCell>
                  <TableCell align="right" width="20%">
                    <TextField
                      type="number"
                      size="small"
                      value={result.buyIn === 0 ? '0' : result.buyIn || ''}
                      onChange={(e) => handleInputChange(index, 'buyIn', e.target.value)}
                      inputProps={{ min: 0 }}
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell align="right" width="20%">
                    <TextField
                      type="number"
                      size="small"
                      value={result.cashOut === 0 ? '0' : result.cashOut || ''}
                      onChange={(e) => handleInputChange(index, 'cashOut', e.target.value)}
                      inputProps={{ min: 0 }}
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell 
                    align="right" 
                    width="20%"
                    sx={{ 
                      minWidth: 100,
                      color: result.delta > 0 
                        ? 'success.main' 
                        : result.delta < 0 
                        ? 'error.main' 
                        : 'text.primary'
                    }}
                  >
                    {result.delta > 0 ? '+' : ''}{result.delta}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography color="text.secondary">
            {isBalanced() 
              ? '✓ Results are balanced' 
              : `⚠️ Results are off by $${Math.abs(total).toFixed(2)}`}
          </Typography>
          <Typography variant="h6">
            Total: ${total.toFixed(2)}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={!isBalanced()}
        >
          Save Results
        </Button>
      </DialogActions>
    </Dialog>
  )
} 