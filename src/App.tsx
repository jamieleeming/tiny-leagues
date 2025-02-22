import { ThemeProvider, CssBaseline } from '@mui/material'
import { createTheme, alpha } from '@mui/material/styles'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Home from './pages/Home'
import Games from './pages/Games'
import { AuthProvider } from './contexts/AuthContext'
import Profile from './pages/Profile'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import AuthCallback from './pages/AuthCallback'
import GameDetails from './pages/GameDetails'
import './App.css'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import { HelmetProvider } from 'react-helmet-async'

// Create a modern dark theme
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00C853', // Back to vibrant green
      light: '#5EFF8B',
      dark: '#009624',
      contrastText: '#000000',
    },
    secondary: {
      main: '#FF1744', // A bright red
      light: '#FF616F',
      dark: '#C4001D',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#121212', // Material Design dark theme background
      paper: '#1E1E1E',   // Slightly lighter than background
    },
    text: {
      primary: '#FFFFFF',
      secondary: alpha('#FFFFFF', 0.7),
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      letterSpacing: '-0.00833em',
    },
    h6: {
      fontWeight: 500,
      letterSpacing: '0.0075em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: `${alpha('#FFFFFF', 0.05)} !important`,
            background: `${alpha('#FFFFFF', 0.05)} !important`,
          }
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            backgroundColor: `${alpha('#FFFFFF', 0.05)} !important`,
            background: `${alpha('#FFFFFF', 0.05)} !important`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 6px 12px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(8px)',
          backgroundColor: alpha('#121212', 0.8),
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1E1E1E',
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
})

// Create emotion cache
const cache = createCache({
  key: 'tiny-leagues',
  prepend: true,
})

function App() {
  return (
    <HelmetProvider>
      <CacheProvider value={cache}>
        <AuthProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <BrowserRouter basename="/tiny-leagues">
                <Routes>
                  <Route path="/*" element={<MainLayout />}>
                    <Route index element={<Home />} />
                    <Route path="auth/callback" element={<AuthCallback />} />
                    <Route path="auth" element={<Auth />} />
                    <Route path="auth/reset-password" element={<ResetPassword />} />
                    <Route 
                      path="games" 
                      element={
                        <ProtectedRoute>
                          <Games />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="profile" 
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="games/:id" 
                      element={
                        <ProtectedRoute>
                          <GameDetails />
                        </ProtectedRoute>
                      } 
                    />
                  </Route>
                </Routes>
              </BrowserRouter>
            </LocalizationProvider>
          </ThemeProvider>
        </AuthProvider>
      </CacheProvider>
    </HelmetProvider>
  )
}

export default App
