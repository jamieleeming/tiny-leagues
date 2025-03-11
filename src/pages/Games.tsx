import { useState, useEffect, useMemo } from 'react'
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
  Container,
  CircularProgress,
  Alert,
  Snackbar,
  Pagination
} from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../config/supabaseClient'
import { Game, GAME_FORMAT } from '../types/database'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { useAnalytics } from '../contexts/AnalyticsContext'
import { 
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon} from '@mui/icons-material'
import { PageWrapper, ContentWrapper, GridContainer } from '../components/styled/Layouts'
import { PageTitle, SectionTitle } from '../components/styled/Typography'
import { GradientButton } from '../components/styled/Buttons'
import { IconText, FlexBetween } from '../components/styled/Common'
import { HoverCard } from '../components/styled/Cards'
import GameForm from '../components/games/GameForm'


const GameCard = ({ game }: { game: Game }) => {
  const navigate = useNavigate()
  const { trackEvent } = useAnalytics()
  
  // Add helper function to check if game is full
  const isGameFull = () => {
    if (!game.host) return false
    const confirmedCount = game.confirmed_count || 0  // We'll need to add this to our query
    return confirmedCount >= game.seats
  }

  const handleGameClick = () => {
    trackEvent('Game', 'view_game_details', game.id)
    navigate(`/games/${game.id}`)
  }
  
  return (
    <HoverCard onClick={handleGameClick}>
      <CardContent>
        <FlexBetween className="maintain-row" sx={{ mb: 2.5 }}>
          <Typography variant="h6">
            {game.format === 'cash' ? 'Cash Game' : 'Tournament'}
          </Typography>
          {game.league?.name && (
            <Chip 
              label={game.league.name}
              size="small"
              variant="outlined"
              sx={{ 
                minWidth: 'auto',
                borderRadius: 0,
                color: '#FFE600',
                borderColor: '#FFE600',
                transition: 'all 0.2s ease',
                '&:hover': {
                  color: '#FFFF00',
                  borderColor: '#FFFF00',
                  boxShadow: '0 0 8px rgba(255,255,0,0.3)'
                }
              }}
            />
          )}
        </FlexBetween>

        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 1.5,
          mb: 2
        }}>
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
              <PersonIcon fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                Hosted by{' '}
                <Typography
                  component="span"
                  variant="body2"
                  color="primary"
                  sx={{ fontWeight: 500 }}
                >
                  {game.host?.username || 'Unknown'}
                </Typography>
              </Typography>
            </IconText>
          )}
        </Box>

        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          flexWrap: 'wrap',
          alignItems: 'center',
          mt: 1
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
              label={`$${game.blind_small}/$${game.blind_large}`}
              size="small"
              variant="outlined"
            />
          )}
          <Chip 
            label={game.variant === 'holdem' ? "Texas Hold'em" : 'Omaha'}
            variant="outlined"
            size="small"
          />
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
  const { trackEvent } = useAnalytics()
  const location = useLocation()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error] = useState('')
  const [filter, setFilter] = useState<GAME_FORMAT | 'all'>('all')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [previousGames, setPreviousGames] = useState<Game[]>([])
  const [previousGamesFilter, setPreviousGamesFilter] = useState('all')
  const [filteredPreviousGames, setFilteredPreviousGames] = useState<Game[]>([])
  const [previousGamesPage, setPreviousGamesPage] = useState(1)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const gamesPerPage = 9

  useEffect(() => {
    if (location.state?.success) {
      setSuccessMessage(location.state.success)
      setShowSuccessMessage(true)
      
      // Clear the location state to prevent showing the message again on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location])

  useEffect(() => {
    fetchGames()
  }, [user])

  useEffect(() => {
    if (previousGamesFilter === 'all') {
      setFilteredPreviousGames(previousGames)
    } else if (previousGamesFilter === 'awaiting') {
      // Filter for games that are scheduled but the date has passed
      // This is a proxy for "awaiting results"
      setFilteredPreviousGames(
        previousGames.filter(game => 
          game.status === 'scheduled' && 
          new Date(game.date_start) < new Date()
        )
      )
    }
    // Reset to first page when filter changes
    setPreviousGamesPage(1)
  }, [previousGames, previousGamesFilter])

  // Calculate paginated previous games
  const paginatedPreviousGames = useMemo(() => {
    const startIndex = (previousGamesPage - 1) * gamesPerPage
    const endIndex = startIndex + gamesPerPage
    return filteredPreviousGames.slice(startIndex, endIndex)
  }, [filteredPreviousGames, previousGamesPage, gamesPerPage])

  // Calculate total pages
  const totalPreviousGamesPages = useMemo(() => {
    return Math.ceil(filteredPreviousGames.length / gamesPerPage)
  }, [filteredPreviousGames, gamesPerPage])

  // Handle page change
  const handlePreviousGamesPageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setPreviousGamesPage(page)
    // Scroll to the top of the previous games section
    document.getElementById('previous-games-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const fetchGames = async () => {
    try {
      setLoading(true)
      
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('games')
        .select(`
          *,
          host:host_id(
            username,
            first_name,
            last_name
          ),
          league:league_id(*),
          rsvp(
            confirmed,
            waitlist_position
          )
        `)
        .or(`private.eq.false,host_id.eq.${user?.id}`)
        .neq('status', 'cancelled')
        .gte('date_start', new Date().toISOString())
        .order('date_start', { ascending: true })

      if (upcomingError) throw upcomingError

      const { data: previousData, error: previousError } = await supabase
        .from('games')
        .select(`
          *,
          host:users!games_host_id_fkey(
            id,
            username,
            first_name,
            last_name
          ),
          rsvp!inner(id),
          confirmed_count:rsvp(id, confirmed)
        `)
        .or(`status.eq.completed,and(status.eq.scheduled,date_start.lt.${new Date().toISOString()})`)
        .order('date_start', { ascending: false })

      if (previousError) throw previousError

      const gamesWithCount = upcomingData?.map(game => ({
        ...game,
        confirmed_count: game.rsvp?.filter((r: { confirmed: boolean; waitlist_position: number | null }) => 
          r.confirmed && r.waitlist_position === null
        ).length || 0,
        rsvp: undefined
      }))

      const processedUpcomingGames = gamesWithCount || []
      const processedPreviousGames = previousData?.map(game => ({
        ...game,
        confirmed_count: game.rsvp?.filter((r: { confirmed: boolean; waitlist_position: number | null }) => 
          r.confirmed && r.waitlist_position === null
        ).length || 0,
        rsvp: undefined
      })) || []

      setGames(processedUpcomingGames)
      setPreviousGames(processedPreviousGames)
    } catch (err) {
      // Remove console.error but keep the error handling
      // console.error('Error fetching games:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredGames = games
    .filter(game => filter === 'all' || game.format === filter)

  const handleCreateClick = () => {
    trackEvent('Game', 'open_create_game_form')
    setSelectedGame(null)
    setIsFormOpen(true)
  }

  const handleGameFormSubmit = (gameId: string) => {
    trackEvent('Game', 'create_game', gameId)
    setIsFormOpen(false)
    setSelectedGame(null)
    fetchGames()
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    trackEvent('UI', 'change_games_tab', newValue === 0 ? 'upcoming' : 'previous')
    setFilter(newValue === 0 ? 'all' : newValue === 1 ? 'cash' : 'tournament')
  }

  return (
    <Container>
      <Box sx={{ py: 4 }}>
        <PageWrapper maxWidth="lg">
          <ContentWrapper>
            {/* Success message snackbar */}
            <Snackbar
              open={showSuccessMessage}
              autoHideDuration={6000}
              onClose={() => setShowSuccessMessage(false)}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
              <Alert 
                onClose={() => setShowSuccessMessage(false)} 
                severity="success"
                sx={{ width: '100%' }}
              >
                {successMessage}
              </Alert>
            </Snackbar>

            <Box sx={{ mb: 3 }}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: { xs: 'column-reverse', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: 2
                }}
              >
                <PageTitle sx={{ mb: { xs: 0, sm: 0 }, mt: { xs: 1, sm: 0 } }}>Upcoming Games</PageTitle>
                <GradientButton
                  className="auto-width"
                  startIcon={<AddIcon />}
                  onClick={handleCreateClick}
                  sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}
                >
                  Host Game
                </GradientButton>
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Tabs 
                value={filter}
                onChange={handleTabChange}
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

            {/* Previous Games Section */}
            <Box sx={{ mt: 6 }} id="previous-games-section">
              <SectionTitle gutterBottom>
                Previous Games
              </SectionTitle>
              
              {/* Filter Tabs - Correctly styled to match Upcoming Games tabs */}
              <Box sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={previousGamesFilter}
                  onChange={(_, newValue) => setPreviousGamesFilter(newValue)}
                  sx={{
                    minHeight: 'unset',
                    '& .MuiTabs-indicator': {
                      height: 2
                    },
                    '& .MuiTab-root': {
                      '&:focus': {
                        outline: 'none'
                      },
                      '&.Mui-focusVisible': {
                        outline: 'none'
                      }
                    }
                  }}
                >
                  <Tab 
                    label="All Games" 
                    value="all" 
                    sx={{ 
                      py: 1.5,
                      px: 2,
                      fontWeight: 500,
                      minWidth: 'auto',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  />
                  <Tab 
                    label="Awaiting Results" 
                    value="awaiting" 
                    sx={{ 
                      py: 1.5,
                      px: 2,
                      fontWeight: 500,
                      minWidth: 'auto',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  />
                </Tabs>
              </Box>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : filteredPreviousGames.length === 0 ? (
                <Typography color="text.secondary">
                  No previous games found
                </Typography>
              ) : (
                <>
                  <GridContainer>
                    {paginatedPreviousGames.map(game => (
                      <GameCard 
                        key={game.id} 
                        game={game} 
                      />
                    ))}
                  </GridContainer>
                  
                  {/* Pagination Controls */}
                  {totalPreviousGamesPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                      <Pagination 
                        count={totalPreviousGamesPages} 
                        page={previousGamesPage} 
                        onChange={handlePreviousGamesPageChange}
                        color="primary"
                        size="large"
                      />
                    </Box>
                  )}
                </>
              )}
            </Box>
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
          onSubmit={handleGameFormSubmit}
        />
      </Box>
    </Container>
  )
}

export default Games 