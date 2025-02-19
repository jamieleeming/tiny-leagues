import { useState } from 'react'
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  Container,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  useMediaQuery,
  useTheme,
  alpha
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { Menu as MenuIcon } from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'
import './Navbar.css'

const Navbar = () => {
  const { user, signOut } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const navItems = user ? [
    { text: 'Games', path: '/games' },
    { text: 'Profile', path: '/profile' },
    { text: 'Sign Out', onClick: signOut }
  ] : [
    { text: 'Sign In', path: '/login' }
  ]

  const drawer = (
    <List>
      {navItems.map((item) => (
        <ListItem 
          key={item.text} 
          component={item.path ? RouterLink : 'button'}
          to={item.path}
          onClick={item.onClick || handleDrawerToggle}
          sx={{
            color: 'text.primary',
            '&:hover': {
              bgcolor: alpha(theme.palette.common.white, 0.05)
            },
          }}
        >
          <ListItemText primary={item.text} />
        </ListItem>
      ))}
    </List>
  )

  return (
    <AppBar position="sticky" elevation={0}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          <Typography 
            variant="h6" 
            component={RouterLink} 
            to="/" 
            sx={{ 
              textDecoration: 'none', 
              color: 'inherit',
              fontWeight: 700,
              fontSize: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              '&:hover': {
                color: 'inherit'  // Only keep color consistent on hover, no background change
              }
            }}
          >
            Tiny Leagues
          </Typography>

          {isMobile ? (
            <>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="end"
                onClick={handleDrawerToggle}
              >
                <MenuIcon />
              </IconButton>
              <Drawer
                anchor="right"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                  keepMounted: true // Better mobile performance
                }}
              >
                {drawer}
              </Drawer>
            </>
          ) : (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {navItems.map((item) => (
                item.path ? (
                  <Button
                    key={item.text}
                    component={RouterLink}
                    to={item.path}
                    color="inherit"
                    className="navbar-item"
                    sx={{ fontWeight: 600 }}
                  >
                    {item.text}
                  </Button>
                ) : (
                  <Button
                    key={item.text}
                    onClick={item.onClick}
                    color="inherit"
                    className="navbar-item"
                    sx={{ fontWeight: 600 }}
                  >
                    {item.text}
                  </Button>
                )
              ))}
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  )
}

export default Navbar