import { useState } from 'react'
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom'
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Alert,
  Paper,
  Link
} from '@mui/material'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabaseClient'

const Login = () => {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const location = useLocation()
  const message = location.state?.message

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError('')
      setLoading(true)
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      if (err instanceof Error && err.message.includes('Email not confirmed')) {
        // Offer to resend verification email
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        })
        
        if (resendError) {
          setError('Failed to resend verification email')
        } else {
          setError('Please check your email for verification link')
        }
      } else {
        setError('Failed to sign in')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Sign In
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 3 }}
            >
              Sign In
            </Button>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link component={RouterLink} to="/signup">
                  Sign Up
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default Login 