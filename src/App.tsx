import { ThemeProvider, CssBaseline } from '@mui/material'
import { createTheme } from '@mui/material/styles'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Home from './pages/Home'
import Games from './pages/Games'
import { AuthProvider } from './contexts/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Profile from './pages/Profile'
import CreateGame from './pages/CreateGame'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import AuthCallback from './pages/AuthCallback'

// Create a custom theme with poker-themed colors
const theme = createTheme({
  palette: {
    primary: {
      main: '#1B5E20',
      light: '#4C8C4A',
      dark: '#003300',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#B71C1C',
      light: '#F05545',
      dark: '#7F0000',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        },
      },
    },
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route 
                  path="/games" 
                  element={
                    <ProtectedRoute>
                      <Games />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/games/create" 
                  element={
                    <ProtectedRoute>
                      <CreateGame />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

export default App
