import { Box, Typography, useTheme, Paper } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { AnimatedHandIllustration } from '../components/illustrations'
import { GradientButton } from '../components/styled/Buttons'

const HeroSection = styled(Box)(({ theme }) => ({
  height: '100vh',
  width: '100vw',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  [theme.breakpoints.up('md')]: {
    flexDirection: 'row',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at 30% 30%, ${theme.palette.primary.main}10 0%, transparent 60%),
                 radial-gradient(circle at 70% 70%, ${theme.palette.secondary.main}10 0%, transparent 60%)`,
    pointerEvents: 'none',
  }
}))

const FloatingCard = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(6),
  maxWidth: 1000,
  width: '100%',
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
  position: 'relative',
  overflow: 'hidden',
  background: theme.palette.background.paper,
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(4),
  },
}))

const AnimationContainer = styled(Box)(({ theme }) => ({
  height: '200px',
  width: '300px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(4),
  position: 'relative',
  transform: 'scale(0.9)',
  [theme.breakpoints.up('md')]: {
    position: 'absolute',
    top: '15%',
    left: '50%',
    transform: 'translateX(-50%) scale(1.2)',
    height: '300px',
    marginBottom: 0,
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '400px',
    height: '400px',
    background: `radial-gradient(circle, ${theme.palette.primary.main}22 0%, transparent 70%)`,
    borderRadius: '50%',
    zIndex: -1
  }
}))

const FeatureItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
}))

const FeatureDot = styled(Box)(({ theme }) => ({
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
  marginRight: theme.spacing(2),
}))

const Home = () => {
  const theme = useTheme()
  const navigate = useNavigate()

  const features = [
    'Create and join poker games with friends',
    'Track results and statistics',
    'Manage players and tournaments',
    'Simple, intuitive interface'
  ]

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      <Helmet>
        <title>Tiny Leagues</title>
      </Helmet>
      
      <HeroSection>
        <AnimationContainer>
          <AnimatedHandIllustration />
        </AnimationContainer>
        
        <Box sx={{ 
          padding: 3, 
          width: '100%', 
          maxWidth: 1000,
          position: 'relative',
          zIndex: 5
        }}>
          <FloatingCard elevation={0}>
            <Box sx={{ width: '100%', maxWidth: 600, textAlign: 'center', mb: 6 }}>
              <Typography 
                variant="h2" 
                sx={{ 
                  fontWeight: 700,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 3,
                  letterSpacing: '-0.02em'
                }}
              >
                The Modern Poker Experience
              </Typography>
              
              <Typography 
                variant="body1" 
                color="text.secondary" 
                sx={{ fontSize: '1.1rem' }}
              >
                Streamlined poker management for casual games and serious tournaments
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, width: '100%', mb: 6 }}>
              <Box sx={{ flex: 1, pr: { xs: 0, md: 4 }, mb: { xs: 4, md: 0 } }}>
                {features.map((feature, index) => (
                  <FeatureItem key={index}>
                    <FeatureDot />
                    <Typography>{feature}</Typography>
                  </FeatureItem>
                ))}
              </Box>
              
              <Box sx={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center',
                alignItems: { xs: 'center', md: 'flex-start' },
                pl: { xs: 0, md: 4 },
                borderLeft: { xs: 'none', md: `1px solid ${theme.palette.divider}` }
              }}>
                <Typography 
                  variant="h6" 
                  sx={{ mb: 3, fontWeight: 600, textAlign: { xs: 'center', md: 'left' } }}
                >
                  Ready to transform your poker nights?
                </Typography>
                
                <GradientButton
                  size="large"
                  onClick={() => navigate('/auth', { state: { mode: 'signup' }})}
                  fullWidth={true}
                  sx={{ py: 1.5 }}
                >
                  Get Started
                </GradientButton>
              </Box>
            </Box>
          </FloatingCard>
        </Box>
      </HeroSection>
      
      <Box 
        component="footer"
        sx={{ 
          py: 2,
          textAlign: 'center',
          position: 'absolute',
          bottom: 0,
          width: '100%'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © Tiny Leagues {new Date().getFullYear()}
        </Typography>
      </Box>
    </Box>
  )
}

export default Home