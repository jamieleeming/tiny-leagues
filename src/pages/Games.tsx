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
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Skeleton,
  useTheme,
  alpha
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabaseClient'
import { Game, GameType } from '../types/database'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { 
  Add as AddIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon
} from '@mui/icons-material'
import { PageContainer, ContentCard } from '../components/styled/Layout'
import { HoverCard } from '../components/styled/Cards'
import { GradientButton } from '../components/styled/Buttons'
import { TYPOGRAPHY } from '../theme/constants'
import { FlexBox, FlexBetween, IconText } from '../components/styled/Common'
import { PageWrapper, ContentWrapper, GridContainer } from '../components/styled/Layouts'
import { PageTitle } from '../components/styled/Typography'
import { StyledTextField } from '../components/styled/Forms'

const GameCard = ({ game }: { game: Game }) => {
  const theme = useTheme()
  const navigate = useNavigate()
  
  return (
    <HoverCard>
      <CardContent>
        <FlexBetween className="maintain-row" sx={{ mb: 3 }}>
          <Typography variant="h6">
            {game.type === 'cash' ? 'Cash Game' : 'Tournament'}
          </Typography>
          <Chip 
            label={game.format === 'holdem' ? "Hold'em" : 'Omaha'}
            color={game.type === 'cash' ? 'success' : 'secondary'}
            size="small"
            sx={{ minWidth: 'auto' }}
          />
        </FlexBetween>

        <IconText>
          <CalendarIcon />
          <Typography variant="body2">
            {game.date_start && format(new Date(game.date_start), 'PPP p')}
          </Typography>
        </IconText>

        <IconText>
          <LocationIcon />
          <Typography variant="body2">
            {game.street || game.city || game.zip
              ? [game.street, game.city, game.zip].filter(Boolean).join(', ')
              : 'Location TBD'}
          </Typography>
        </IconText>

        {game.host && (
          <IconText>
            <PersonIcon />
            <Typography variant="body2">
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
          </IconText>
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
      <CardActions>
        <GradientButton 
          onClick={() => navigate(`/games/${game.id}`)}
          variant="contained"
        >
          View Details
        </GradientButton>
      </CardActions>
    </HoverCard>
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

  const filteredGames = games
    .filter(game => filter === 'all' || game.type === filter)
    .filter(game => 
      searchQuery === '' || 
      game.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.note?.toLowerCase().includes(searchQuery.toLowerCase())
    )

  return (
    <PageWrapper maxWidth="lg">
      <ContentWrapper>
        <FlexBetween className="maintain-row" sx={{ mb: 3 }}>
          <PageTitle>Upcoming Games</PageTitle>
          <GradientButton
            className="auto-width"
            startIcon={<AddIcon />}
            onClick={() => navigate('/games/create')}
          >
            Host Game
          </GradientButton>
        </FlexBetween>

        <StyledTextField
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

        <Box sx={{ mb: 3 }}>
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
          <GridContainer>
            {filteredGames.map((game) => (
              <Grid item xs={12} sm={6} md={4} key={game.id}>
                <GameCard game={game} />
              </Grid>
            ))}
          </GridContainer>
        )}
      </ContentWrapper>
    </PageWrapper>
  )
}

export default Games 