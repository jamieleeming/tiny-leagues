import { 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent,
  useTheme,
  alpha,
  Container
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { 
  Casino as CasinoIcon,
  Groups as GroupsIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon 
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'

const features = [
  {
    icon: CasinoIcon,
    title: 'Organize Games',
    description: 'Create and manage poker games with ease. Set blinds, buy-ins, and game formats.'
  },
  {
    icon: GroupsIcon,
    title: 'Connect Players',
    description: 'Find local games and players. Build your poker network and community.'
  },
  {
    icon: TimelineIcon,
    title: 'Track Results',
    description: 'Keep track of your wins and losses. Monitor your progress over time.'
  },
  {
    icon: SecurityIcon,
    title: 'Secure Platform',
    description: 'Play with confidence. Verified users and secure payment tracking.'
  }
]

const Home = () => {
  const theme = useTheme()
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/games')
    }
  }, [user, navigate])

  // Only render the landing page for non-authenticated users
  if (user) return null

  return (
    <Box sx={{ mt: -4 }}>
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          py: 12,
          background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
          borderRadius: theme.shape.borderRadius,
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%)`,
          }
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography 
                variant="h1" 
                sx={{ 
                  mb: 2,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  textShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.3)}`
                }}
              >
                Your Poker Community Awaits
              </Typography>
              <Typography 
                variant="h5" 
                color="text.secondary" 
                sx={{ mb: 4 }}
              >
                Organize games, connect with players, and track your poker journey.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {user ? (
                  <Button
                    component={RouterLink}
                    to="/games"
                    variant="contained"
                    size="large"
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem'
                    }}
                  >
                    Find Games
                  </Button>
                ) : (
                  <Button
                    component={RouterLink}
                    to="/signup"
                    variant="contained"
                    size="large"
                    sx={{
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem'
                    }}
                  >
                    Get Started
                  </Button>
                )}
                <Button
                  component={RouterLink}
                  to="/about"
                  variant="outlined"
                  size="large"
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem'
                  }}
                >
                  Learn More
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '10%',
                    left: '10%',
                    right: '10%',
                    bottom: '10%',
                    background: `radial-gradient(circle at 50% 50%, ${alpha(theme.palette.primary.main, 0.2)}, transparent)`,
                    filter: 'blur(40px)',
                    borderRadius: '50%'
                  }
                }}
              >
                {/* Add hero image or animated cards here */}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 8 }}>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  background: alpha(theme.palette.background.paper, 0.5),
                  backdropFilter: 'blur(10px)',
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)'
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <feature.icon 
                    sx={{ 
                      fontSize: 48, 
                      mb: 2,
                      color: theme.palette.primary.main 
                    }} 
                  />
                  <Typography variant="h6" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Call to Action */}
      <Box
        sx={{
          mt: 4,
          p: 6,
          textAlign: 'center',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
          borderRadius: theme.shape.borderRadius
        }}
      >
        <Typography variant="h3" gutterBottom>
          Ready to Join?
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Start organizing games and connecting with players today.
        </Typography>
        {!user && (
          <Button
            component={RouterLink}
            to="/signup"
            variant="contained"
            size="large"
            sx={{
              px: 6,
              py: 1.5,
              fontSize: '1.1rem'
            }}
          >
            Sign Up Now
          </Button>
        )}
      </Box>
    </Box>
  )
}

export default Home 