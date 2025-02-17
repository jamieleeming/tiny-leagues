import { useNavigate } from 'react-router-dom'
import { useGames } from '../hooks/useGames'
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Chip,
  Button,
  IconButton,
  CardActions
} from '@mui/material'
import { Add as AddIcon, Person as PersonIcon } from '@mui/icons-material'
import { format } from 'date-fns'
import { Game } from '../types/database'

const GameCard = ({ game }: { game: Game }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {game.type} - {game.format}
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          {game.date_start && format(new Date(game.date_start), 'PPP p')}
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={`$${game.buyin_min} - $${game.buyin_max}`} 
            color="primary"
            variant="outlined"
          />
          <Chip 
            label={`${game.blind_small}/${game.blind_large}`}
            color="secondary"
            variant="outlined"
          />
          <Chip 
            icon={<PersonIcon />}
            label={`${game.seats} seats`}
            variant="outlined"
          />
        </Box>
        <Typography sx={{ mt: 2 }}>
          {game.street}, {game.city} {game.zip}
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small" color="primary">
          View Details
        </Button>
        <Button size="small" color="primary">
          RSVP
        </Button>
      </CardActions>
    </Card>
  )
}

const Games = () => {
  const navigate = useNavigate()
  const { games, loading, error } = useGames()

  if (loading) return <Typography>Loading...</Typography>
  if (error) return <Typography color="error">{error}</Typography>

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
        <Typography variant="h4">Upcoming Games</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/games/create')}
        >
          Host Game
        </Button>
      </Box>

      <Grid container spacing={3}>
        {games.map((game) => (
          <Grid item xs={12} md={6} lg={4} key={game.id}>
            <GameCard game={game} />
          </Grid>
        ))}
        {games.length === 0 && (
          <Grid item xs={12}>
            <Typography align="center" color="text.secondary">
              No games scheduled. Why not host one?
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

export default Games 