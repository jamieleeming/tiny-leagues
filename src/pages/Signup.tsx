import { useState, useEffect } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Alert,
  Paper,
  Link,
  Grid
} from '@mui/material'
import { supabase } from '../config/supabaseClient'
import { validatePassword, validateEmail } from '../utils/validation'

const SIGNUP_COOLDOWN = 60000 // 60 seconds in milliseconds

const Signup = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    username: '',
    phone: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastAttempt, setLastAttempt] = useState(0)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [countdown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check cooldown with more informative message
    const now = Date.now()
    if (now - lastAttempt < SIGNUP_COOLDOWN) {
      const remainingTime = Math.ceil((SIGNUP_COOLDOWN - (now - lastAttempt)) / 1000)
      setCountdown(remainingTime)
      return setError(
        `Too many attempts. Please wait ${remainingTime} seconds before trying again. ` +
        `This helps prevent spam and protect our service.`
      )
    }
    
    // Validate form
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match')
    }

    const passwordErrors = validatePassword(formData.password)
    if (passwordErrors.length > 0) {
      return setError(passwordErrors[0])
    }

    if (!validateEmail(formData.email)) {
      return setError('Please enter a valid email address')
    }

    try {
      setError('')
      setLoading(true)
      setLastAttempt(now)

      // Create auth user with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            username: formData.username,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone ? Number(formData.phone) : null
          }
        }
      })

      if (authError) {
        console.error('Auth Error:', authError)
        throw authError
      }

      if (!authData.user) {
        throw new Error('No user returned from signup')
      }

      console.log('Auth successful for user:', authData.user.id)

      // No need to manually create profile - the trigger will handle it
      
      // Show success message and redirect
      navigate('/login', { 
        state: { 
          message: 'Please check your email to verify your account before logging in.' 
        }
      })
    } catch (err) {
      console.error('Signup error:', err)
      const errorMessage = err instanceof Error 
        ? err.message
            .replace('AuthApiError: ', '')
            .replace('email rate limit exceeded', 'Too many signup attempts. Please wait a minute before trying again.')
        : 'Failed to create account'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Sign Up
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="firstName"
                  label="First Name"
                  fullWidth
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="lastName"
                  label="Last Name"
                  fullWidth
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="username"
                  label="Username"
                  fullWidth
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="email"
                  label="Email"
                  type="email"
                  fullWidth
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="phone"
                  label="Phone Number"
                  fullWidth
                  value={formData.phone}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="password"
                  label="Password"
                  type="password"
                  fullWidth
                  value={formData.password}
                  onChange={handleChange}
                  required
                  helperText="Password must be at least 8 characters long and contain uppercase, lowercase, and numbers"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  fullWidth
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </Grid>
            </Grid>
            
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading || countdown > 0}
              sx={{ mt: 3 }}
            >
              {loading ? 'Signing Up...' : 
               countdown > 0 ? `Try Again in ${countdown}s` : 
               'Sign Up'}
            </Button>
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2">
                Already have an account?{' '}
                <Link component={RouterLink} to="/login">
                  Sign In
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default Signup 