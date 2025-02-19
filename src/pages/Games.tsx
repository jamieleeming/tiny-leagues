import { useState, useEffect } from 'react'
import { 
  Container, 
  Box, 
  Typography, 
  Button, 
  Grid,
  Card, 
  CardContent,
  CardActions,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Skeleton,
  useTheme,
  alpha
} from '@mui/material'
import { 
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Groups as GroupsIcon,
  AttachMoney as MoneyIcon,
  Add as AddIcon,
  Person as PersonIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabaseClient'
import { Game, GameType } from '../types/database'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'

const GameCard = ({ game }: { game: Game }) => {
  const theme = useTheme()
  const navigate = useNavigate()
  
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8]
        },
        background: alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(8px)'
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {game.type === 'cash' ? 'Cash Game' : 'Tournament'}
          </Typography>
          <Chip 
            label={game.format === 'holdem' ? "Hold'em" : 'Omaha'}
            color={game.type === 'cash' ? 'success' : 'secondary'}
            size="small"
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {game.date_start && format(new Date(game.date_start), 'PPP p')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
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

        {game.host && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Hosted by{' '}
              <Typography
                component="span"
                variant="body2"
                color="primary"
                sx={{ fontWeight: 600 }}
              >
                {game.host?.first_name} {game.host?.last_name}
              </Typography>
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={`$${game.buyin_min} - $${game.buyin_max}`} 
            variant="outlined"
            size="small"
          />
          <Chip 
            label={`${game.blind_small}/${game.blind_large}`}
            variant="outlined"
            size="small"
          />
          <Chip 
            icon={<PersonIcon />}
            label={`${game.seats} seats`}
            variant="outlined"
            size="small"
          />
        </Box>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button 
          fullWidth 
          variant="contained"
          onClick={() => navigate(`/games/${game.id}`)}
          sx={{
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'scale(1.02)',
              boxShadow: theme.shadows[4]
            }
          }}
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  )
}

const Games = () => {
  const theme = useTheme()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<GameType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchGames()
  }, [user])

  const fetchGames = async () => {
    try {
      setLoading(true)
      
      // Get all public games OR private games where user is host
      const { data: gamesData, error } = await supabase
        .from('games')
        .select(`
          *,
          host: host_id (
            username,
            first_name,
            last_name
          )
        `)
        .or(`private.eq.false,host_id.eq.${user?.id}`)
        .gte('date_start', new Date().toISOString())
        .order('date_start', { ascending: true })

      if (error) throw error

      setGames(gamesData || [])
    } catch (err) {
      console.error('Error fetching games:', err)
      setError('Failed to load games')
    } finally {
      setLoading(false)
    }
  }

  const handleRSVP = async (gameId: string) => {
    // TODO: Implement RSVP functionality
  }

  const filteredGames = games
    .filter(game => filter === 'all' || game.type === filter)
    .filter(game => 
      searchQuery === '' || 
      game.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.note?.toLowerCase().includes(searchQuery.toLowerCase())
    )

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3
        }}>
          <Typography variant="h4">Upcoming Games</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/games/create')}
            sx={{
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: theme.shadows[4]
              }
            }}
          >
            Host Game
          </Button>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search by city or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <Tabs 
            value={filter}
            onChange={(_, newValue) => setFilter(newValue)}
            TabIndicatorProps={{ 
              sx: { 
                height: 2,  // Height of the bottom indicator
                backgroundColor: theme.palette.primary.main  // Color of the indicator
              } 
            }}
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': { 
                '&.Mui-selected': { 
                  color: theme.palette.primary.main,
                  backgroundColor: 'transparent'  // Remove background color
                },
                '&:focus': {
                  outline: 'none'
                },
                '&.Mui-focusVisible': {
                  outline: 'none'
                }
              }
            }}
          >
            <Tab label="All Games" value="all" />
            <Tab label="Cash Games" value="cash" />
            <Tab label="Tournaments" value="tournament" />
          </Tabs>
        </Box>

        {loading ? (
          <Grid container spacing={3}>
            {[1, 2, 3].map((skeleton) => (
              <Grid item xs={12} sm={6} md={4} key={skeleton}>
                <Card>
                  <CardContent>
                    <Skeleton variant="rectangular" height={118} />
                    <Skeleton sx={{ mt: 1 }} />
                    <Skeleton width="60%" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : filteredGames.length === 0 ? (
          <Typography color="text.secondary" align="center">
            No games found
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {filteredGames.map((game) => (
              <Grid item xs={12} sm={6} md={4} key={game.id}>
                <GameCard game={game} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  )
}

export default Games 