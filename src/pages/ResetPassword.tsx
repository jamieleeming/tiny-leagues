import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Alert,
  CircularProgress
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { supabase } from '../config/supabaseClient'
import { GradientButton } from '../components/styled/Buttons'
import { Helmet } from 'react-helmet-async'

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const ResetPassword = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [initializing, setInitializing] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<ResetPasswordFormData>()

  // Check for auth session on component mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Get the current session
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error)
          setError('Unable to verify your session. Please request a new password reset link.')
          setInitializing(false)
          return
        }
        
        if (!data.session) {
          console.error('No active session found')
          setError('Your password reset session has expired. Please request a new password reset link.')
          setInitializing(false)
          return
        }
        
        // Session is valid, ready for password reset
        setInitializing(false)
      } catch (err) {
        console.error('Error checking session:', err)
        setError('An unexpected error occurred. Please try again.')
        setInitializing(false)
      }
    }
    
    checkSession()
  }, [])

  // Handle form submission
  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setLoading(true)
      setError('')

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password
      })

      if (updateError) {
        console.error('Password update error:', updateError)
        throw updateError
      }

      // Password updated successfully
      setSuccess(true)
      
      // Sign out after successful password reset
      await supabase.auth.signOut()
      
      // Redirect to login page after a delay
      setTimeout(() => {
        navigate('/auth', { state: { mode: 'login' } })
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  if (initializing) {
    return (
      <Container maxWidth="sm">
        <Helmet>
          <title>Reset Password - Tiny Leagues</title>
        </Helmet>
        <Box sx={{ mt: 8, mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Verifying your session...
          </Typography>
          <CircularProgress sx={{ mt: 2 }} />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm">
      <Helmet>
        <title>Reset Password - Tiny Leagues</title>
      </Helmet>
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Reset Password
          </Typography>

          {success ? (
            <Alert severity="success">
              Password updated successfully! Redirecting to login...
            </Alert>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              {error ? (
                <>
                  <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                    {error}
                  </Alert>
                  <GradientButton
                    fullWidth
                    onClick={() => navigate('/auth', { state: { resetDialogOpen: true } })}
                    sx={{ mt: 2 }}
                  >
                    Request New Reset Link
                  </GradientButton>
                </>
              ) : (
                <>
                  <TextField
                    fullWidth
                    label="New Password"
                    type="password"
                    margin="normal"
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters'
                      }
                    })}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                  />

                  <TextField
                    fullWidth
                    label="Confirm Password"
                    type="password"
                    margin="normal"
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: value => 
                        value === watch('password') || 'Passwords do not match'
                    })}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                  />

                  <GradientButton
                    type="submit"
                    fullWidth
                    disabled={loading}
                    sx={{ mt: 3 }}
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </GradientButton>
                </>
              )}
            </form>
          )}
        </Paper>
      </Box>
    </Container>
  )
}

export default ResetPassword 