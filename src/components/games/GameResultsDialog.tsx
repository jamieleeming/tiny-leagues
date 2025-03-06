import { useState, useEffect } from 'react'
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
  DialogContent,
  Divider,
  IconButton,
  Autocomplete,
  CircularProgress,
  Tooltip
} from '@mui/material'
import { 
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material'
import { RSVP, Result as DBResult, User } from '../../types/database'
import { supabase } from '../../config/supabaseClient'
import { GradientButton } from '../styled/Buttons'
import { SectionTitle } from '../styled/Typography'
import { StyledDialog } from '../styled/Layout'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [hostId, setHostId] = useState<string>('')

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Get the host ID when the component mounts
  useEffect(() => {
    const getHostId = async () => {
      if (!gameId) return;
      
      try {
        const { data, error } = await supabase
          .from('games')
          .select('host_id')
          .eq('id', gameId)
          .single();
          
        if (error) {
          console.error('Error fetching host ID:', error);
          return;
        }
        
        if (data) {
          setHostId(data.host_id);
        }
      } catch (err) {
        console.error('Error in getHostId:', err);
      }
    };
    
    getHostId();
  }, [gameId]);

  // Search for users when the search query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      console.log('Searching for users with query:', searchQuery);
      setSearchLoading(true);
      try {
        // Simplified search query to focus on username and name
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .or(`username.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
          .limit(50);

        if (error) {
          console.error('Error searching users:', error);
          setSearchResults([]);
          return;
        }

        console.log('Raw search results:', data);
        
        if (!data || data.length === 0) {
          console.log('No users found matching the query');
          setSearchResults([]);
          return;
        }

        // Filter out users that are already in the results
        const filteredData = data.filter(
          user => !results.some(result => result.userId === user.id)
        );
        
        console.log('Filtered search results:', filteredData.length, 'users found');
        setSearchResults(filteredData);
      } catch (err) {
        console.error('Error in user search:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimeout = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, results]);

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

  const hasEnteredResults = () => {
    return results.some(result => result.buyIn > 0 || result.cashOut > 0);
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

  const handleAddUser = (newUser: User | null) => {
    if (!newUser) return;
    
    // Create a new player result for the selected user
    const newPlayerResult: PlayerResult = {
      rsvpId: `temp-${Date.now()}`, // Temporary ID for non-RSVP players
      userId: newUser.id,
      name: `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim(),
      username: newUser.username || 'Anonymous',
      buyIn: 0,
      cashOut: 0,
      delta: 0
    };
    
    setResults([...results, newPlayerResult]);
    setSelectedUser(null);
    setSearchQuery('');
  };

  const handleRemoveUser = (index: number) => {
    const userToRemove = results[index];
    
    // Prevent removing the host
    if (userToRemove.userId === hostId) {
      console.log('Cannot remove the host from results');
      return;
    }
    
    const newResults = [...results];
    newResults.splice(index, 1);
    setResults(newResults);
  };

  const total = results.reduce((sum, r) => sum + r.delta, 0)

  return (
    <StyledDialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >
      <Box sx={{ 
        p: 3, 
        pb: 2,
        bgcolor: 'background.default' // App background color
      }}>
        <SectionTitle>
          {isEdit ? 'Edit Game Results' : 'Log Game Results'}
        </SectionTitle>
      </Box>
      
      <DialogContent sx={{ 
        p: 3,
        bgcolor: 'background.default', // App background color
        backgroundImage: 'none'
      }}>
        {/* User Search Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
            Add Player
          </Typography>
          <Autocomplete
            fullWidth
            options={searchResults}
            getOptionLabel={(option) => {
              const username = option.username || 'Anonymous';
              const name = `${option.first_name || ''} ${option.last_name || ''}`.trim();
              return name ? `${username} (${name})` : username;
            }}
            filterOptions={(x) => x} // Disable client-side filtering
            loading={searchLoading}
            loadingText="Searching users..."
            noOptionsText="No users found"
            value={selectedUser}
            onChange={(_, newValue) => {
              console.log('Selected user:', newValue);
              handleAddUser(newValue);
            }}
            inputValue={searchQuery}
            onInputChange={(_, newInputValue) => {
              console.log('Search input changed:', newInputValue);
              setSearchQuery(newInputValue);
            }}
            open={searchLoading || (searchResults.length > 0 && !!searchQuery)}
            renderOption={(props, option) => (
              <li {...props}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {option.username || 'Anonymous'}
                  </Typography>
                  {(option.first_name || option.last_name) && (
                    <Typography variant="caption" color="text.secondary">
                      {`${option.first_name || ''} ${option.last_name || ''}`.trim()}
                    </Typography>
                  )}
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search by username or name"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <SearchIcon color="action" sx={{ ml: 1, mr: 0.5 }} />
                      {params.InputProps.startAdornment}
                    </>
                  ),
                  endAdornment: (
                    <>
                      {searchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Box>

        {isMobile ? (
          <Stack spacing={0} sx={{ mb: 3 }}>
            {results.map((result, index) => (
              <Box
                key={result.rsvpId}
                sx={{ 
                  py: 2,
                  ...(index < results.length - 1 && {
                    borderBottom: '1px solid',
                    borderColor: 'divider'
                  })
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2
                }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                    {result.username}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        color: result.delta > 0 
                          ? 'success.main' 
                          : result.delta < 0 
                          ? 'error.main' 
                          : 'text.primary',
                        mr: 1
                      }}
                    >
                      {result.delta > 0 ? '+' : ''}{result.delta}
                    </Typography>
                    {result.userId !== hostId && (
                      <Tooltip title="Remove player">
                        <IconButton 
                          size="small" 
                          onClick={() => handleRemoveUser(index)}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    type="number"
                    label="Buy-in"
                    size="small"
                    fullWidth
                    value={result.buyIn || ''}
                    onChange={(e) => handleInputChange(index, 'buyIn', e.target.value)}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography>
                    }}
                  />
                  <TextField
                    type="number"
                    label="Cash-out"
                    size="small"
                    fullWidth
                    value={result.cashOut || ''}
                    onChange={(e) => handleInputChange(index, 'cashOut', e.target.value)}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography>
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        ) : (
          <Box sx={{ 
            mb: 3, 
            overflow: 'auto'
          }}>
            <Table sx={{ minWidth: 500 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ 
                    fontWeight: 600, 
                    pl: { xs: 1, sm: 2 },
                    borderBottom: '2px solid',
                    borderColor: 'primary.main',
                    width: '30%'
                  }}>
                    Player
                  </TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      fontWeight: 600, 
                      px: { xs: 0.5, sm: 1 },
                      borderBottom: '2px solid',
                      borderColor: 'primary.main',
                      width: '20%'
                    }}
                  >
                    Buy-in ($)
                  </TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      fontWeight: 600, 
                      px: { xs: 0.5, sm: 1 },
                      borderBottom: '2px solid',
                      borderColor: 'primary.main',
                      width: '20%'
                    }}
                  >
                    Cash-out ($)
                  </TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      fontWeight: 600, 
                      px: { xs: 0.5, sm: 1 },
                      borderBottom: '2px solid',
                      borderColor: 'primary.main',
                      width: '20%'
                    }}
                  >
                    Net
                  </TableCell>
                  <TableCell 
                    align="center" 
                    sx={{ 
                      fontWeight: 600, 
                      pr: { xs: 1, sm: 2 },
                      pl: { xs: 0.5, sm: 1 },
                      borderBottom: '2px solid',
                      borderColor: 'primary.main',
                      width: '10%'
                    }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow 
                    key={result.rsvpId}
                    sx={{ 
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      },
                      '&:last-child td, &:last-child th': {
                        borderBottom: 0
                      }
                    }}
                  >
                    <TableCell 
                      component="th" 
                      scope="row"
                      sx={{ 
                        pl: { xs: 1, sm: 2 },
                        py: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {result.username}
                      </Typography>
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        px: { xs: 0.5, sm: 1 }, 
                        borderBottom: '1px solid', 
                        borderColor: 'divider' 
                      }}
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
                      sx={{ 
                        px: { xs: 0.5, sm: 1 }, 
                        borderBottom: '1px solid', 
                        borderColor: 'divider' 
                      }}
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
                        px: { xs: 0.5, sm: 1 },
                        color: result.delta > 0 
                          ? 'success.main' 
                          : result.delta < 0 
                          ? 'error.main' 
                          : 'text.primary',
                        fontWeight: 600,
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      {result.delta > 0 ? '+$' : result.delta < 0 ? '-$' : '$'}{Math.abs(result.delta)}
                    </TableCell>
                    <TableCell 
                      align="center"
                      sx={{ 
                        pr: { xs: 1, sm: 2 },
                        pl: { xs: 0.5, sm: 1 },
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      {result.userId !== hostId && (
                        <Tooltip title="Remove player">
                          <IconButton 
                            size="small" 
                            onClick={() => handleRemoveUser(index)}
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3,
          py: 1
        }}>
          <Typography 
            color={isBalanced() ? 'success.main' : 'warning.main'}
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontWeight: 500
            }}
          >
            {isBalanced() 
              ? '✓ Results are balanced' 
              : `⚠️ Results are off by $${Math.abs(total).toFixed(2)}`}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Total: {total > 0 ? '+$' : total < 0 ? '-$' : '$'}{Math.abs(total).toFixed(2)}
          </Typography>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          gap: 2,
          justifyContent: 'flex-end',
          mt: 3
        }}>
          <Button 
            onClick={onClose}
            variant="outlined"
            sx={{ 
              borderRadius: 1,
              px: 3
            }}
          >
            Cancel
          </Button>
          <GradientButton
            onClick={handleSubmit}
            disabled={!isBalanced() || !hasEnteredResults()}
            size="medium"
            className="auto-width"
            sx={{ px: 3 }}
          >
            Save Results
          </GradientButton>
        </Box>
      </DialogContent>
    </StyledDialog>
  )
} 