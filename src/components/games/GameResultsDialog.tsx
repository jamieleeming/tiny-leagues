import { useState } from 'react'
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
  useMediaQuery,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import { RSVP, Result as DBResult } from '../../types/database'
import { supabase } from '../../config/supabaseClient'
import { GradientButton } from '../styled/Buttons'

interface GameResultsDialogProps {
  open: boolean
  onClose: () => void
  gameId: string
  players: RSVP[]
  onComplete: () => void
  existingResults?: DBResult[]
  isEdit?: boolean
}

interface PlayerResult {
  rsvpId: string
  userId: string
  name: string
  username: string
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
          rsvpId: r.id,
          userId: r.user_id,
          name: `${r.user?.first_name} ${r.user?.last_name}`,
          username: r.user?.username || 'Anonymous',
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
            username: p.user?.username || 'Anonymous',
            buyIn: 0,
            cashOut: 0,
            delta: 0
          }))
  )

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

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
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        {isEdit ? 'Edit Game Results' : 'Log Game Results'}
      </DialogTitle>
      <DialogContent>
        {isMobile ? (
          <Stack spacing={0} sx={{ mb: 3 }}>
            {results.map((result, index) => (
              <Box
                key={result.rsvpId}
                sx={{ 
                  py: 2,
                  borderBottom: 1,
                  borderColor: 'divider'
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2
                }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                    {result.username}
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
                    {result.delta > 0 ? '+' : ''}{result.delta}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    type="number"
                    label="Buy-in"
                    size="small"
                    fullWidth
                    value={result.buyIn || ''}
                    onChange={(e) => handleInputChange(index, 'buyIn', e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    type="number"
                    label="Cash Out"
                    size="small"
                    fullWidth
                    value={result.cashOut || ''}
                    onChange={(e) => handleInputChange(index, 'cashOut', e.target.value)}
                    inputProps={{ min: 0 }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        ) : (
          <Box sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell 
                    sx={{ 
                      fontWeight: 500,
                      width: '40%',
                      pl: 2,
                      borderBottom: 1,
                      borderColor: 'divider'
                    }}
                  >
                    Player
                  </TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      fontWeight: 500,
                      width: '20%',
                      px: 2,
                      borderBottom: 1,
                      borderColor: 'divider'
                    }}
                  >
                    Buy-in
                  </TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      fontWeight: 500,
                      width: '20%',
                      px: 2,
                      borderBottom: 1,
                      borderColor: 'divider'
                    }}
                  >
                    Cash Out
                  </TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      fontWeight: 500,
                      width: '20%',
                      pr: 2,
                      borderBottom: 1,
                      borderColor: 'divider'
                    }}
                  >
                    Net
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow key={result.rsvpId}>
                    <TableCell 
                      sx={{ 
                        pl: { xs: 1, sm: 2 },
                        pr: { xs: 0.5, sm: 1 },
                        borderBottom: 1,
                        borderColor: 'divider'
                      }}
                    >
                      <Typography 
                        sx={{ 
                          fontWeight: 500,
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: { xs: '120px', sm: '200px' }
                        }}
                      >
                        {result.username}
                      </Typography>
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ px: { xs: 0.5, sm: 1 }, borderBottom: 1, borderColor: 'divider' }}
                    >
                      <TextField
                        type="number"
                        size="small"
                        value={result.buyIn || ''}
                        onChange={(e) => handleInputChange(index, 'buyIn', e.target.value)}
                        inputProps={{ 
                          min: 0,
                          style: { 
                            textAlign: 'right',
                            padding: '6px',
                            fontSize: '0.875rem'
                          }
                        }}
                        sx={{ 
                          width: { xs: 70, sm: 100 },
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ px: { xs: 0.5, sm: 1 }, borderBottom: 1, borderColor: 'divider' }}
                    >
                      <TextField
                        type="number"
                        size="small"
                        value={result.cashOut || ''}
                        onChange={(e) => handleInputChange(index, 'cashOut', e.target.value)}
                        inputProps={{ 
                          min: 0,
                          style: { 
                            textAlign: 'right',
                            padding: '6px',
                            fontSize: '0.875rem'
                          }
                        }}
                        sx={{ 
                          width: { xs: 70, sm: 100 },
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        pr: { xs: 1, sm: 2 },
                        pl: { xs: 0.5, sm: 1 },
                        color: result.delta > 0 
                          ? 'success.main' 
                          : result.delta < 0 
                          ? 'error.main' 
                          : 'text.primary',
                        fontWeight: 500,
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        borderBottom: 1,
                        borderColor: 'divider'
                      }}
                    >
                      {result.delta > 0 ? '+' : ''}{result.delta}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}>
          <Typography 
            color={isBalanced() ? 'success.main' : 'warning.main'}
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontSize: '0.875rem'
            }}
          >
            {isBalanced() 
              ? '✓ Results are balanced' 
              : `⚠️ Results are off by $${Math.abs(total).toFixed(2)}`}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            Total: ${total.toFixed(2)}
          </Typography>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          justifyContent: 'flex-end'
        }}>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <GradientButton
            onClick={handleSubmit}
            disabled={!isBalanced()}
            size="large"
            className="auto-width"
          >
            Save Results
          </GradientButton>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={!isBalanced()}
        >
          Save Results
        </Button>
      </DialogActions>
    </Dialog>
  )
} 