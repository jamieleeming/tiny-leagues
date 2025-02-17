import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const Navbar = () => {
  const { user, signOut } = useAuth()

  return (
    <AppBar position="static" sx={{ bgcolor: 'primary.main' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Typography 
            variant="h6" 
            component={RouterLink} 
            to="/" 
            sx={{ 
              textDecoration: 'none', 
              color: 'inherit',
              fontWeight: 700,
              fontSize: '1.5rem',
              flexGrow: 1
            }}
          >
            The River
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/games"
              sx={{ fontWeight: 600 }}
            >
              Games
            </Button>
            {user ? (
              <>
                <Button 
                  color="inherit" 
                  component={RouterLink} 
                  to="/profile"
                  sx={{ fontWeight: 600 }}
                >
                  Profile
                </Button>
                <Button 
                  color="inherit"
                  onClick={() => signOut()}
                  sx={{ fontWeight: 600 }}
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/login"
                sx={{ fontWeight: 600 }}
              >
                Sign In
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  )
}

export default Navbar