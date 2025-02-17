import { useState } from 'react'
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
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabaseClient'
import { validatePassword, validateEmail } from '../utils/validation'
import { UserType } from '../types/database'

const SIGNUP_COOLDOWN = 21000 // 21 seconds in milliseconds

const Signup = () => {
  const navigate = useNavigate()
  const { signUp } = useAuth()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check cooldown
    const now = Date.now()
    if (now - lastAttempt < SIGNUP_COOLDOWN) {
      const remainingTime = Math.ceil((SIGNUP_COOLDOWN - (now - lastAttempt)) / 1000)
      return setError(`Please wait ${remainingTime} seconds before trying again`)
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

      // Sign up with Supabase Auth
      const { user: authUser, error: authError } = await signUp(
        formData.email, 
        formData.password
      )

      if (authError) {
        console.error('Auth Error:', authError)
        throw authError
      }

      if (!authUser) {
        console.error('No user returned from signup')
        throw new Error('No user returned from signup')
      }

      console.log('Auth successful, updating profile for user:', authUser.id)

      // Update user profile
      const { error: profileError } = await supabase
        .from('users')
        .update({
          username: formData.username,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone ? Number(formData.phone) : null,
          type: 'user' as UserType
        })
        .eq('id', authUser.id)
        .select()

      if (profileError) {
        console.error('Profile Error:', profileError)
        throw profileError
      }

      // Show success message and redirect
      navigate('/login', { 
        state: { 
          message: 'Please check your email to verify your account before logging in.' 
        }
      })
    } catch (err) {
      console.error('Signup error:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError(err.message as string)
      } else {
        setError('Failed to create account')
      }
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
              disabled={loading}
              sx={{ mt: 3 }}
            >
              Sign Up
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