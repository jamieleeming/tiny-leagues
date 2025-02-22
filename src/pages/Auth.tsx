import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Box,
  Typography,
  TextField,
  Alert,
  Link,
  Container,
  Paper
} from '@mui/material'
import { supabase } from '../config/supabaseClient'
import { GradientButton } from '../components/styled/Buttons'
import { useForm } from 'react-hook-form'
import { AuthFormData } from '../types/auth'

const Auth = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>(
    (location.state as any)?.mode || 'login'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<AuthFormData>()

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

  const handleModeChange = (newMode: 'login' | 'signup') => {
    setMode(newMode)
    setError('')
    setHasSubmitted(false)
    reset()
  }

  const onSubmit = async (data: AuthFormData) => {
    setHasSubmitted(true)
    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              first_name: data.firstName,
              last_name: data.lastName,
              username: data.username
            }
          }
        })
        if (signUpError) throw signUpError
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        })
        if (signInError) throw signInError
      }
    } catch (err: unknown) {
      console.error('Auth error:', err)
      setError(err instanceof Error ? err.message : 'Authentication failed')
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

          <form onSubmit={handleSubmit(onSubmit)}>
            {mode === 'signup' && (
              <>
                <TextField
                  fullWidth
                  label="First Name"
                  margin="normal"
                  {...register('firstName', { required: 'First name is required' })}
                  error={hasSubmitted && !!errors.firstName}
                  helperText={hasSubmitted && errors.firstName?.message}
                />
                <TextField
                  fullWidth
                  label="Last Name"
                  margin="normal"
                  {...register('lastName', { required: 'Last name is required' })}
                  error={hasSubmitted && !!errors.lastName}
                  helperText={hasSubmitted && errors.lastName?.message}
                />
                <TextField
                  fullWidth
                  label="Username"
                  margin="normal"
                  {...register('username', {
                    required: 'Username is required',
                    minLength: {
                      value: 3,
                      message: 'Username must be at least 3 characters'
                    }
                  })}
                  error={hasSubmitted && !!errors.username}
                  helperText={hasSubmitted && errors.username?.message}
                  sx={{ mb: 2 }}
                />
              </>
            )}

            <TextField
              fullWidth
              label="Email"
              type="email"
              margin="normal"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              error={hasSubmitted && !!errors.email}
              helperText={hasSubmitted && errors.email?.message}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              margin="normal"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
              error={hasSubmitted && !!errors.password}
              helperText={hasSubmitted && errors.password?.message}
              sx={{ mb: 3 }}
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
                onClick={() => handleModeChange(mode === 'signup' ? 'login' : 'signup')}
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