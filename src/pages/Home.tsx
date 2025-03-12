import { Box, Container, Typography, Button, Grid, useTheme } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import {
  Groups as CommunityIcon,
  Security as SecurityIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material'
import { GradientButton } from '../components/styled/Buttons'
import { CardsIcon } from '../components/icons/CardsIcon'
import { AnimatedHandIllustration } from '../components/illustrations'

const HeroSection = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
  padding: theme.spacing(12, 0),
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(6, 0),
  },
  position: 'relative',
  overflow: 'hidden',
  borderRadius: `0 0 ${theme.shape.borderRadius * 2}px ${theme.shape.borderRadius * 2}px`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at 20% 150%, ${theme.palette.primary.main}22 0%, transparent 50%),
                 radial-gradient(circle at 80% -50%, ${theme.palette.secondary.main}22 0%, transparent 50%)`,
    pointerEvents: 'none',
  }
}))

const FeatureCard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius * 2,
  background: theme.palette.background.paper,
  height: '100%',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
  }
}))

const Home = () => {
  const theme = useTheme()
  const navigate = useNavigate()

  const features = [
    {
      icon: <CardsIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: 'Organize Games',
      description: 'Create and manage poker games with customizable buy-ins, locations, and player limits.'
    },
    {
      icon: <CommunityIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: 'Build Community',
      description: 'Connect with local players and maintain a trusted network of poker enthusiasts.'
    },
    {
      icon: <LocationIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: 'Find Games',
      description: 'Discover games in your area and easily RSVP to secure your seat at the table.'
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />,
      title: 'Private & Secure',
      description: 'Control who sees your games and manage your player list with confidence.'
    }
  ]

  return (
    <Box>
      <HeroSection>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 2, md: 6 }} alignItems="center" direction={{ xs: 'column', md: 'row' }}>
            <Grid item xs={12} md={7} sx={{ order: { xs: 2, md: 1 } }}>
              <Typography 
                variant="h1" 
                sx={{ 
                  fontWeight: 700,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2
                }}
              >
                Your Poker Night,
                <br />
                Organized
              </Typography>
              <Typography 
                variant="h5" 
                color="text.secondary" 
                sx={{ mb: 4, maxWidth: 600 }}
              >
                Host and find local poker games, manage players, and build your poker community—all in one place.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <GradientButton
                  size="large"
                  onClick={() => navigate('/auth', { state: { mode: 'signup' }})}
                >
                  Get Started
                </GradientButton>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/games')}
                  sx={{
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '&:hover': {
                      borderColor: 'primary.light',
                    }
                  }}
                >
                  Browse Games
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={5} sx={{ 
              order: { xs: 1, md: 2 },
              mb: { xs: 2, md: 0 },
              py: { xs: 0, md: 2 }
            }}>
              <Box
                sx={{
                  position: 'relative',
                  transform: { xs: 'scale(0.85)', md: 'scale(1)' },
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '300px',
                    height: '300px',
                    background: `radial-gradient(circle, ${theme.palette.primary.main}22 0%, transparent 70%)`,
                    borderRadius: '50%',
                  }
                }}
              >
                <AnimatedHandIllustration />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </HeroSection>

      <Container maxWidth="lg" sx={{ py: 12 }}>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <FeatureCard>
                {feature.icon}
                <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                  {feature.title}
                </Typography>
                <Typography color="text.secondary">
                  {feature.description}
                </Typography>
              </FeatureCard>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Box 
        sx={{ 
          bgcolor: 'background.paper', 
          py: 12,
          borderRadius: theme => `${theme.shape.borderRadius * 2}px ${theme.shape.borderRadius * 2}px 0 0`
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" sx={{ mb: 3, fontWeight: 700 }}>
                Ready to host your next game?
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                Join our community of poker enthusiasts and start organizing games with ease. 
                Set up your first game in minutes and let Tiny Leagues handle the details.
              </Typography>
              <GradientButton
                size="large"
                onClick={() => navigate('/auth', { state: { mode: 'signup' }})}
              >
                Create Your First Game
              </GradientButton>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  )
}

export default Home 