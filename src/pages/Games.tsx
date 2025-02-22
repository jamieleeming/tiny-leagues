import { useState, useEffect } from 'react'
import { 
  Box, 
  Typography, 
  Grid,
  Card, 
  CardContent,
  CardActions,
  Chip,
  Tabs,
  Tab,
  Skeleton,
  Container} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabaseClient'
import { Game, GameType } from '../types/database'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { 
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon
} from '@mui/icons-material'
import { PageWrapper, ContentWrapper, GridContainer } from '../components/styled/Layouts'
import { PageTitle } from '../components/styled/Typography'
import { GradientButton } from '../components/styled/Buttons'
import { IconText, FlexBetween } from '../components/styled/Common'
import { HoverCard } from '../components/styled/Cards'
import GameForm from '../components/games/GameForm'

const GameCard = ({ game }: { game: Game }) => {
  const navigate = useNavigate()
  
  // Add helper function to check if game is full
  const isGameFull = () => {
    if (!game.host) return false
    const confirmedCount = game.confirmed_count || 0  // We'll need to add this to our query
    return confirmedCount >= game.seats
  }
  
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

        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          flexWrap: 'wrap',
          alignItems: 'center',
          mt: 2  // Add some margin top to separate from the text above
        }}>
          <Chip 
            label={game.buyin_min === 0 
              ? `$${game.buyin_max}`
              : `$${game.buyin_min} - $${game.buyin_max}`
            }
            variant="outlined"
            size="small"
          />
          {(game.blind_small > 0 || game.blind_large > 0) && (
            <Chip 
              label={`${game.blind_small}/${game.blind_large}`}
              variant="outlined"
              size="small"
            />
          )}
          <Chip 
            icon={<PersonIcon />}
            label={isGameFull() ? "FULL" : game.seats}
            variant="outlined"
            size="small"
            color={isGameFull() ? "error" : "default"}
          />
          {game.bomb_pots && (
            <Chip 
              label="Bomb Pots"
              variant="outlined"
              size="small"
              color="secondary"
            />
          )}
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
  const { user } = useAuth()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<GameType | 'all'>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)

  useEffect(() => {
    fetchGames()
  }, [user])

  const fetchGames = async () => {
    try {
      setLoading(true)
      
      // First get the games
      const { data: gamesData, error } = await supabase
        .from('games')
        .select(`
          *,
          host: host_id (
            username,
            first_name,
            last_name
          ),
          rsvp (
            confirmed,
            waitlist_position
          )
        `)
        .or(`private.eq.false,host_id.eq.${user?.id}`)
        .neq('status', 'cancelled')
        .gte('date_start', new Date().toISOString())
        .order('date_start', { ascending: true })

      if (error) throw error

      // Transform the data to calculate confirmed count
      const gamesWithCount = gamesData?.map(game => ({
        ...game,
        confirmed_count: game.rsvp?.filter((r: { confirmed: boolean; waitlist_position: number | null }) => 
          r.confirmed && r.waitlist_position === null
        ).length || 0,
        rsvp: undefined // Remove the rsvp data as we don't need it anymore
      }))

      setGames(gamesWithCount || [])
    } catch (err) {
      console.error('Error fetching games:', err)
      setError('Failed to load games')
    } finally {
      setLoading(false)
    }
  }

  const filteredGames = games
    .filter(game => filter === 'all' || game.type === filter)

  const handleCreateClick = () => {
    setSelectedGame(null)
    setIsFormOpen(true)
  }


  return (
    <Container>
      <Box sx={{ py: 4 }}>
        <PageWrapper maxWidth="lg">
          <ContentWrapper>
            <FlexBetween className="maintain-row" sx={{ mb: 3 }}>
              <PageTitle>Upcoming Games</PageTitle>
              <GradientButton
                className="auto-width"
                startIcon={<AddIcon />}
                onClick={handleCreateClick}
              >
                Host Game
              </GradientButton>
            </FlexBetween>

            <Box sx={{ mb: 3 }}>
              <Tabs 
                value={filter}
                onChange={(_, newValue) => setFilter(newValue)}
                TabIndicatorProps={{ 
                  sx: { height: 2 }
                }}
                sx={{ 
                  borderBottom: 1, 
                  borderColor: 'divider',
                  '& .MuiTab-root': { 
                    '&.Mui-selected': { 
                      color: 'primary',
                      backgroundColor: 'transparent'
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

        <GameForm
          open={isFormOpen}
          onClose={() => {
            setIsFormOpen(false)
            setSelectedGame(null)
          }}
          gameId={selectedGame?.id}
          initialData={selectedGame || undefined}
        />
      </Box>
    </Container>
  )
}

export default Games 