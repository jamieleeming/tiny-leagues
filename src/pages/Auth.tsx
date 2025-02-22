import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
  Container,
  Paper
} from '@mui/material'
import { supabase } from '../config/supabaseClient'
import { GradientButton } from '../components/styled/Buttons'

const Auth = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [mode, setMode] = useState<'signup' | 'login'>(
    location.state?.mode || 'signup'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    username: ''
  })

  useEffect(() => {
    if (user) {
      // Check for redirect game ID first
      const redirectGameId = localStorage.getItem('redirectGameId')
      if (redirectGameId) {
        localStorage.removeItem('redirectGameId')
        navigate(`/games/${redirectGameId}`)
        return
      }

      // Otherwise use the state.from or default to /games
      const from = location.state?.from || '/games'
      navigate(from)
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
              username: formData.username
            }
          }
        })
        if (signUpError) throw signUpError
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        })
        if (signInError) throw signInError
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </Typography>

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <TextField
                  fullWidth
                  label="First Name"
                  margin="normal"
                  value={formData.firstName}
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
                <TextField
                  fullWidth
                  label="Last Name"
                  margin="normal"
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
                <TextField
                  fullWidth
                  label="Username"
                  margin="normal"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </>
            )}

            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <GradientButton
              type="submit"
              fullWidth
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
            >
              {mode === 'signup' ? 'Sign Up' : 'Log In'}
            </GradientButton>

            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
              >
                {mode === 'signup' 
                  ? 'Already have an account? Log in' 
                  : 'Need an account? Sign up'}
              </Link>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  )
}

export default Auth 