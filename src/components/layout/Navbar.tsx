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
  ListItemIcon,
  useMediaQuery,
  useTheme,
  alpha,
  Avatar,
  Divider
} from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { 
  Menu as MenuIcon,
  Casino as GamesIcon,
  Person as ProfileIcon,
  ExitToApp as SignOutIcon,
  Login as SignInIcon} from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'
import { styled } from '@mui/material/styles'

// Add type definition for nav items
type NavItem = {
  text: string;
  path?: string;
  icon: JSX.Element;
  onClick?: () => void;
  divider?: boolean;
  state?: { mode: 'login' | 'signup' };
}

// Create a styled ListItem component for drawer buttons
const DrawerItem = styled(ListItem)<{
  component?: React.ElementType;
  to?: string;
  state?: { mode: 'login' | 'signup' };
}>(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  borderRadius: theme.shape.borderRadius,
  marginLeft: theme.spacing(1),
  marginRight: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
  color: theme.palette.common.white,
  opacity: 0.7,
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',

  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.05),
    color: theme.palette.common.white,
    opacity: 1,
  },

  '&.active': {
    backgroundColor: alpha(theme.palette.common.white, 0.1),
    color: theme.palette.common.white,
    opacity: 1,
  },

  '&.MuiButtonBase-root': {
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: alpha(theme.palette.common.white, 0.05),
    }
  },

  '& .MuiListItemIcon-root': {
    minWidth: 40,
    color: 'inherit',
  },

  '& .MuiListItemText-primary': {
    color: 'inherit',
    fontWeight: 400,
  },

  '&.active .MuiListItemText-primary': {
    fontWeight: 600,
  }
}))

const Navbar = () => {
  const { user, signOut } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Common styles for navigation items
  const navStyles = {
    button: {
      fontWeight: 600,
      color: theme.palette.common.white,
      '&:hover': {
        bgcolor: alpha(theme.palette.common.white, 0.05),
        color: theme.palette.common.white,
      }
    },
    mobileItem: {
      py: 1.5,
      px: 2,
      borderRadius: 1,
      mx: 1,
      mb: 0.5,
      color: 'text.primary',
      '&:hover': {
        bgcolor: alpha(theme.palette.common.white, 0.05),
        color: theme.palette.common.white,
      },
      '&.active': {
        color: 'primary.main',
        bgcolor: alpha(theme.palette.primary.main, 0.08),
      }
    },
    icon: {
      minWidth: 40,
      color: 'text.secondary'
    }
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const isCurrentPath = (path: string) => location.pathname === path
  
  // Add a custom sign out handler that handles errors gracefully
  const handleSignOut = async () => {
    try {
      await signOut()
      // No need to reload the page as the AuthContext will update the user state
    } catch (error) {
      console.warn('Error during sign out:', error)
      // Even if there's an error, we'll continue with the UI flow
    }
    // Close the mobile drawer if it's open
    if (mobileOpen) {
      setMobileOpen(false)
    }
  }

  const navItems: NavItem[] = user ? [
    { text: 'Games', path: '/games', icon: <GamesIcon /> },
    { text: 'Profile', path: '/profile', icon: <ProfileIcon /> },
    { text: 'Sign Out', onClick: handleSignOut, icon: <SignOutIcon />, divider: true }
  ] : [
    { 
      text: 'Sign In', 
      path: '/auth', 
      icon: <SignInIcon />, 
      divider: true,
      state: { mode: 'login' }
    }
  ]


  const drawer = (
    <Box sx={{ width: 280, height: '100%', overflow: 'hidden auto' }}>
      {/* Drawer Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        minHeight: 64
      }}>
        {user && (
          <Avatar 
            sx={{ 
              bgcolor: theme.palette.primary.main,
              width: 40,
              height: 40,
              flexShrink: 0
            }}
          >
            {user.email?.[0]?.toUpperCase()}
          </Avatar>
        )}
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          Tiny Leagues
        </Typography>
      </Box>

      {/* Navigation Items */}
      <List sx={{ pt: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {navItems.map((item) => (
          <Box key={item.text}>
            {item.divider && <Divider sx={{ my: 1 }} />}
            {item.path ? (
              <DrawerItem
                component={RouterLink}
                to={item.path}
                state={item.state}
                onClick={handleDrawerToggle}
                className={isCurrentPath(item.path) ? 'active' : ''}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </DrawerItem>
            ) : (
              <DrawerItem
                onClick={() => {
                  if (item.onClick) item.onClick();
                  handleDrawerToggle();
                }}
              >
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </DrawerItem>
            )}
          </Box>
        ))}
      </List>
    </Box>
  )

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{
        bgcolor: alpha(theme.palette.background.default, 0.8),
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${theme.palette.divider}`
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open menu"
                edge="start"
                onClick={handleDrawerToggle}
              >
                <MenuIcon />
              </IconButton>
            )}
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
                  color: 'inherit'
                }
              }}
            >
              Tiny Leagues
            </Typography>
          </Box>

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              {navItems.map((item) => (
                <Button
                  key={item.text}
                  component={item.path ? RouterLink : 'button'}
                  to={item.path}
                  state={item.state}
                  onClick={item.onClick}
                  sx={navStyles.button}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
          )}
        </Toolbar>
      </Container>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            bgcolor: 'background.default',
            borderRight: `1px solid ${theme.palette.divider}`
          }
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  )
}

export default Navbar